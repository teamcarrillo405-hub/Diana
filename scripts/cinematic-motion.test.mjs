import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadingHolds, phrasePose} from '../components/canonical-public-landing/cinematic-v3/scene/reading-holds.mjs';
import {createChoreography} from '../components/canonical-public-landing/cinematic-v3/scene/choreography.mjs';
import {dayStoryPose} from '../components/canonical-public-landing/cinematic-v3/scene/day-story.mjs';

const stops = [{id: 'one', point: 100, duration: 2300}, {id: 'two', point: 300, duration: 2300}];
test('fast scrolling stops at the first unread phrase and holds it for its full reading time', () => {
  const hold = createReadingHolds();
  assert.equal(hold.update(0, 450, 0, stops), 100);
  assert.equal(hold.update(100, 500, 2299, stops), 100);
  assert.equal(hold.update(100, 100, 2300, stops), 100);
  assert.equal(hold.active, null);
  assert.equal(hold.update(100, 450, 2400, stops), 300);
});
test('backtracking rearms text holds, and direct navigation can cancel a hold', () => {
  const hold = createReadingHolds();
  hold.update(0, 120, 0, stops);
  hold.cancel();
  assert.equal(hold.active, null);
  assert.equal(hold.update(100, 120, 20, stops), 120);
  hold.update(120, 0, 30, stops);
  assert.equal(hold.update(0, 120, 40, stops), 100);
});
test('every phrase has a fully opaque, motionless reading plateau', () => {
  for (const last of [false, true]) for (const point of [.30, .45, .65, .77]) {
    assert.deepEqual(phrasePose(point, last), {opacity: 1, y: 0});
  }
  assert.equal(phrasePose(0).opacity, 0);
  assert.equal(phrasePose(1).opacity, 0);
});
for (const height of [844, 900]) {
  const c = createChoreography({height, span: 12, tutorWidth: 8});
  test(`video checkpoints are fully framed with readable text at ${height}px`, () => {
    c.dayPlaybackStops.forEach((stop, index) => {
      if (stop === null) return;
      const motion = c.at(stop);
      const pose = dayStoryPose(motion.day, motion.dayIndex, index);
      assert.equal(motion.dayActive, index);
      assert.equal(motion.dayIndex, index);
      assert.equal(motion.dayCopy, 1);
      assert.equal(Math.abs(pose.angle), 0);
      assert.equal(Math.abs(pose.yaw), 0);
      assert.equal(pose.opacity, 1);
      assert.ok(c.at(stop + height * .5).dayIndex < index + .35, 'exit stays slow');
    });
  });
  test(`control title settles before its hold and Q&A has no empty tail at ${height}px`, () => {
    const motion = c.at(c.controlStop);
    assert.equal(motion.controlTitle, 1);
    assert.equal(motion.controlDim, 0);
    assert.equal(motion.controlEnter, 0);
    assert.equal(c.nativeEnd + c.textExit - c.tutorLockStart, c.end);
    const end = c.at(c.end);
    assert.equal(end.controlBeatIndex, 2);
    assert.equal(end.controlEnter, 1);
    assert.equal(end.controlExit, 0);
    assert.equal(c.readingStops.length, 8);
  });
}
