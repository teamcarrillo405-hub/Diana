"""Disposable localhost-only two-session regression. Requires installed psycopg.

Creates and drops its own database on the existing test instance at port 55439.
Never reads credentials or connects to a hosted database.
"""
import argparse
import concurrent.futures
import json
import time
import uuid
from pathlib import Path
import psycopg
from psycopg import sql

parser = argparse.ArgumentParser()
parser.add_argument('--migration', default='supabase/migrations/20260929035711_worker_execution_capabilities.sql')
parser.add_argument('--expect', choices=['allow', 'deny'], default='deny')
parser.add_argument('--policy', choices=['consent', 'class'], default='consent')
args = parser.parse_args()
database = 'diana_worker_race_' + uuid.uuid4().hex
connection_args = dict(host='127.0.0.1', port=55439, user='postgres')
owner = '11111111-1111-4111-8111-111111111111'
admin = psycopg.connect(**connection_args, dbname='postgres', autocommit=True)
admin.execute(sql.SQL('create database {}').format(sql.Identifier(database)))
try:
    fixture = Path('supabase/tests/worker_execution_capabilities.sql').read_text()
    fixture = fixture[fixture.index('do $$ begin if not exists'):fixture.index('create function pg_temp.job')]
    fixture = fixture.replace('\\ir ../migrations/20260731170000_ai_token_budget_reservations.sql', Path('supabase/migrations/20260731170000_ai_token_budget_reservations.sql').read_text())
    fixture = fixture.replace('\\ir ../migrations/20260929035711_worker_execution_capabilities.sql', Path(args.migration).read_text())
    with psycopg.connect(**connection_args, dbname=database, autocommit=True) as setup:
        setup.execute(fixture)
        setup.execute("""insert into worker_jobs values('race',%s,'personal:owner','diana.voice_candidate','student-ai-candidate','managed_queue',
          'running','worker-a',clock_timestamp()+interval '2 minutes',clock_timestamp(),1,
          '{"input":{"transcript":"Synthetic race.","assignmentId":"33333333-3333-4333-8333-333333333333"}}','{}','{}',null,null)""", (owner,))
        for action in ['issue', 'begin']:
            setup.execute("select worker_execution_transition(%s,'race','worker-a',repeat('a',64))", (action,))
    writer = psycopg.connect(**connection_args, dbname=database)
    if args.policy == 'consent':
        writer.execute('update profiles set consent_ai=false where user_id=%s', (owner,))
    else:
        writer.execute("update classes set ai_mode='red' where owner_id=%s", (owner,))
    def dispatch():
        try:
            with psycopg.connect(**connection_args, dbname=database, application_name='diana-worker-race-dispatch', autocommit=True) as executor:
                executor.execute("set statement_timeout='10s'")
                value = executor.execute("select worker_execution_transition('dispatch','race','worker-a',repeat('a',64),'{\"requestedTokens\":100}')").fetchone()[0]
                return {'authorized': value.get('authorized') is True}
        except psycopg.Error as error:
            return {'authorized': False, 'sqlstate': error.sqlstate}
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(dispatch)
            blocked = False
            # Prove B is waiting behind A, rather than depending on a sleep race.
            for _ in range(100):
                blocked = admin.execute("select exists(select 1 from pg_stat_activity where datname=%s and application_name='diana-worker-race-dispatch' and wait_event_type='Lock')", (database,)).fetchone()[0]
                if blocked or future.done(): break
                time.sleep(0.03)
            writer.commit()
            outcome = future.result(timeout=12)
            if not blocked: raise AssertionError('Dispatch did not wait on the concurrent policy transaction')
    finally:
        writer.close()
    with psycopg.connect(**connection_args, dbname=database, autocommit=True) as check:
        reservations = check.execute('select count(*) from ai_token_budget_reservations').fetchone()[0]
        provider_starts = check.execute('select count(*) from ai_token_budget_reservations where provider_started_at is not null').fetchone()[0]
    assert outcome['authorized'] == (args.expect == 'allow'), outcome
    assert reservations == provider_starts == (1 if args.expect == 'allow' else 0)
    print(json.dumps({'ok': True, 'policy': args.policy, 'provedLockWait': blocked, 'expected': args.expect,
        'authorizedAfterRevocationCommit': outcome['authorized'], 'reservations': reservations, 'providerStarts': provider_starts}))
finally:
    admin.execute(sql.SQL('drop database {} with (force)').format(sql.Identifier(database)))
    admin.close()
