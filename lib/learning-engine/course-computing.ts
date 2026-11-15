import { COURSE_ACTIVITY_VERSION, type CourseActivity } from './course-activities'
import type { Competency, CourseLevel, CourseMap } from './course-framework'

/** Original draft instruction. No code execution, educator endorsement or independent assessment. */
export const COMPUTING_RELEASE = 'diana-computing-draft-v1'
type Lesson = { key: string; title: string; objective: string; prerequisites: string[]; criteria: string[];
  hints: [string, string]; example: CourseActivity['example']; tasks: [string, string, string][] }
type Band = { level: CourseLevel; course: string; title: string; lessons: Lesson[] }
const bands: Band[] = [
  { level: 'middle_school', course: 'computing-state-and-algorithms', title: 'State, decisions and repeated steps', lessons: [
    { key: 'state', title: 'Track changing values', objective: 'Trace sequential assignments and distinguish a stored copy from a live relationship.', prerequisites: [],
      criteria: ['Record the value of every variable after each assignment.', 'Explain which earlier value each right-hand side reads.', 'Distinguish assignment from an equation that must stay true.'],
      hints: ['Read one line at a time and keep a table.', 'A later change to one variable does not retroactively change a copied number.'],
      example: { prompt: 'Different example: p=2; q=p+1; p=9.', steps: ['After q=p+1, q stores 3.', 'Changing p to 9 leaves q at 3 because no new assignment to q occurs.'] },
      tasks: [
        ['Explain a worked state table', 'Assignments run top to bottom. Read the right side using current values, then replace the left variable. For a=3; b=a+2; a=8, the states (a,b) are (3,unset), (3,5), (8,5).', 'Explain why the final b stays 5. Identify the line that would need to run again for b to change.'],
        ['Trace a stored copy', 'Pseudocode: tokens=6; saved=tokens; tokens=tokens-2; saved=saved+1. Numbers are copied at assignment.', 'Make a state table and report both final values. Explain why saved does not decrease when tokens decreases.'],
        ['Transfer state tracking to a route', 'A robot starts at position 2 on a number line. It stores checkpoint=position, moves position=position+5, then returns position=checkpoint-1. Saving a checkpoint copies the current number.', 'Trace checkpoint and position through the route. Explain whether the checkpoint moved with the robot.'],
      ] },
    { key: 'decisions', title: 'Choose a branch', objective: 'Apply Boolean conditions and distinguish independent conditions from an if/else choice.', prerequisites: ['computing.state'],
      criteria: ['Evaluate the condition from the current state.', 'Show exactly which branch executes.', 'Distinguish two independent if statements from a single if/else.'],
      hints: ['Write true or false beside the condition before updating anything.', 'A later if reads the state left by earlier statements.'],
      example: { prompt: 'Different example: n=4; if n>3 then n=1 else n=7.', steps: ['4>3 is true, so the first branch assigns 1.', 'The else branch is skipped; its condition is not checked again.'] },
      tasks: [
        ['Explain a branch trace', 'In if temperature<10 then label="cool" else label="warm", exactly one branch executes. At temperature=10, the condition is false and label is warm.', 'Explain the equality boundary and why changing < to <= changes this case.'],
        ['Compare two decision structures', 'Program A: n=2; if n<3 then n=n+2; if n>=3 then n=n+5. Program B: n=2; if n<3 then n=n+2 else n=n+5. All statements execute in written order.', 'Trace both programs and explain why their final values differ.'],
        ['Transfer branching to a ticket rule', 'A museum rule says: if age<12 then price=4 else price=7. A separate rule then says: if member=true then price=price-1. No other discount exists.', 'Trace the price for a 12-year-old member and a 10-year-old nonmember. Explain why membership is a separate decision.'],
      ] },
    { key: 'repetition', title: 'Repeat a bounded process', objective: 'Trace counted loops and compare accumulation with replacing a value.', prerequisites: ['computing.decisions'],
      criteria: ['Record the loop state after each iteration.', 'Use the stated inclusive range and number of iterations.', 'Explain the difference between adding to a total and replacing it.'],
      hints: ['Include the state before iteration one.', 'Expand a short loop into repeated individual statements.'],
      example: { prompt: 'Different example: total=0; repeat 2 times: total=total+3.', steps: ['The totals after each iteration are 3 and 6.', 'An assignment total=3 each time would instead leave 3.'] },
      tasks: [
        ['Explain an accumulation trace', 'For total=0; for k=1 through 3 inclusive: total=total+k, the successive totals are 1,3,6. The loop executes exactly three times.', 'Explain each update and why the final total is not just the final k.'],
        ['Trace a filtered loop', 'Set total=0. For k=1 through 5 inclusive, add k to total only if k>2. No update occurs when the condition is false.', 'List the five values of k, whether each is added, and each resulting total.'],
        ['Transfer repetition to a sensor count', 'A device reads [2,7,7,1] from left to right. It starts count=0 and adds 1 to count for each reading at least 7. Equal readings are separate observations.', 'Trace the counter after every reading and explain why two equal readings can both contribute.'],
      ] },
  ] },
  { level: 'high_school', course: 'computing-program-contracts', title: 'Functions, collections and testing', lessons: [
    { key: 'function_contracts', title: 'Reason about a function contract', objective: 'Separate inputs, local state, returned values and supported input conditions.', prerequisites: ['computing.repetition'],
      criteria: ['Identify the function input and returned value.', 'Trace local assignments without changing caller variables unless specified.', 'State the input conditions under which the contract applies.'],
      hints: ['Rename caller and local variables in your table if their names confuse you.', 'Distinguish returning a value from assigning it to a caller variable.'],
      example: { prompt: 'Different example: double(n) returns 2*n; a=5; b=double(a).', steps: ['The function reads a copied input 5 and returns 10.', 'b receives 10; a remains 5.'] },
      tasks: [
        ['Explain a local function trace', 'increment(n): n=n+1; return n. Numeric arguments are copied. With x=4 and y=increment(x), local n becomes 5, y becomes 5 and x remains 4.', 'Explain why this behavior satisfies a contract that returns the next integer without mutating the input.'],
        ['Apply a precondition', 'halfEven(n) requires an even integer n and returns n/2. Caller: a=12; b=halfEven(a); a=a+2. Behavior outside the precondition is unspecified.', 'Trace a and b. Explain why the contract alone cannot certify a call with input 7.'],
        ['Transfer contracts to a timestamp helper', 'minutesAfter(start,delta) accepts nonnegative integer minutes and returns start+delta. It does not wrap at midnight. Caller: start=1430; end=minutesAfter(start,20).', 'Explain the returned value and which extra rule would be needed to display a clock time. Keep the helper contract separate from the interface requirement.'],
      ] },
    { key: 'collection_traversal', title: 'Traverse a collection safely', objective: 'Distinguish indices from values and handle empty and boundary cases explicitly.', prerequisites: ['computing.function_contracts'],
      criteria: ['State the valid indices and visited elements.', 'Trace the accumulator or selected result for each element.', 'Explain the behavior on empty input without inventing an element.'],
      hints: ['A list of length n has indices 0 through n-1.', 'Test a zero-length list before assuming the loop executes.'],
      example: { prompt: 'Different example: sum=0; for each v in [4,1]: sum=sum+v.', steps: ['The sum becomes 4 and then 5.', 'For an empty list the loop executes zero times and sum stays 0.'] },
      tasks: [
        ['Explain index boundaries', 'List colors=[red,blue,green] has length 3 and valid indices 0,1,2. A loop i=0 while i<length visits these indices, increasing i by 1 each time.', 'Explain why replacing < with <= can request an element outside the list.'],
        ['Trace a list filter', 'out starts empty. Visit [5,0,-2,5] in order; append a value only if it is greater than 0. Appending preserves order and duplicates.', 'Show out after each visit and explain whether repeated positive values are removed.'],
        ['Transfer traversal to a search', 'A shelf list contains [A,B,A]. A function scans left to right and returns the first index whose item equals the target, or -1 if none matches. It returns immediately on a match.', 'Trace searches for A and C and specify the result for an empty shelf. Explain the role of the immediate return.'],
      ] },
    { key: 'boundary_testing', title: 'Design tests from a requirement', objective: 'Select boundary and counterexample tests while distinguishing testing from proof.', prerequisites: ['computing.collection_traversal'],
      criteria: ['Derive expected behavior from the requirement rather than current code.', 'Include values at and around a boundary and explain their purpose.', 'Separate finding a counterexample from proving all inputs correct.'],
      hints: ['A useful test distinguishes the intended rule from a plausible defect.', 'Write the expected result before tracing the implementation.'],
      example: { prompt: 'Different example: access requires age>=16, but implementation uses age>16.', steps: ['At age 16 the requirement allows access and the implementation denies it.', 'One counterexample establishes the mismatch; tests at 15 and 17 clarify the boundary.'] },
      tasks: [
        ['Explain a boundary test', 'Requirement: accept integer scores from 0 through 100 inclusive. Candidate code accepts score>0 and score<100. No behavior for nonintegers is promised.', 'Explain which boundary tests distinguish the requirement from this implementation and why a score of 50 does not expose the defect.'],
        ['Design tests for an empty collection', 'Requirement: count(values) returns the number of entries including duplicates; count([])=0. A candidate initializes result=1, then adds 1 per visited entry.', 'Propose an empty, single-entry and repeated-entry test with expected results. Explain the shared defect they target.'],
        ['Transfer testing to a reservation limit', 'A reservation is allowed exactly when seatsRequested>=1 and seatsRequested<=seatsAvailable. Both inputs are nonnegative integers. Consider available=3 and requested values 0,1,3,4.', 'Give expected outcomes and explain which tests expose a strict-less-than capacity bug. State one additional input pair you would test and why.'],
      ] },
  ] },
  { level: 'college_intro', course: 'computing-algorithms-and-data', title: 'Algorithm reasoning and data models', lessons: [
    { key: 'loop_invariants', title: 'Use a loop invariant', objective: 'Connect initialization, preservation and termination to a stated algorithm postcondition.', prerequisites: ['computing.boundary_testing'],
      criteria: ['State the invariant at a precise point in the loop.', 'Explain initialization and preservation separately.', 'Use the exit condition plus invariant to justify the result, including empty input.'],
      hints: ['Describe exactly the prefix processed before each iteration.', 'An example trace illustrates an invariant but does not prove it for all allowed lengths.'],
      example: { prompt: 'Different example: after processing k list entries, count=k.', steps: ['Before any entries, count=0.', 'Processing one more entry increases both count and k by one, preserving equality.'] },
      tasks: [
        ['Explain prefix-sum reasoning', 'Algorithm: i=0; total=0; while i<n: total=total+A[i]; i=i+1. A has n numeric entries. At the loop head, total equals the sum of A[0..i-1]; the empty prefix sums to 0.', 'Explain initialization, preservation and termination, distinguishing the loop-head invariant from the intermediate state before i increments.'],
        ['Analyze a maximum invariant', 'For nonempty numeric list A, set i=1 and best=A[0]. While i<n, set best=max(best,A[i]) and increment i. At the loop head best is the maximum of the first i entries.', 'Justify the invariant and explain why initializing best=0 would not meet the same specification for every allowed list.'],
        ['Transfer invariants to stream processing', 'A finite stream of integers is processed once. Set count=0; for each value v, increment count exactly when v is even. The stream may be empty.', 'State an invariant about the processed prefix, justify it, and explain what the final counter represents without storing the entire stream.'],
      ] },
    { key: 'algorithm_cost', title: 'Analyze an explicit cost model', objective: 'Count dominant operations and separate asymptotic growth from actual elapsed time.', prerequisites: ['computing.loop_invariants'],
      criteria: ['Name the counted operation and input-size variable.', 'Derive a count from loop bounds before assigning growth notation.', 'State assumptions and distinguish asymptotic cost from measured runtime.'],
      hints: ['An inner loop bound may depend on the outer index.', 'Sequential loops add costs; nested loops require summing their lengths.'],
      example: { prompt: 'Different example: two sequential loops each visit n entries once.', steps: ['If one visit costs one unit, total visits are 2n.', 'This is linear growth; it does not mean a particular elapsed number of seconds.'] },
      tasks: [
        ['Explain nested-loop cost', 'For i=0..n-1, for j=0..n-1, perform one comparison. n is a nonnegative integer; each comparison has unit cost. Exactly n*n comparisons occur.', 'Explain the count and its asymptotic growth. Identify what the unit-cost assumption omits about actual hardware.'],
        ['Count a triangular loop', 'For i=0..n-1, for j=0..i-1, perform one addition. An upper bound below the lower bound gives zero iterations. Count additions only.', 'Derive the exact sum and growth class. Check n=0,1,3 and explain why the inner loop does not always run n times.'],
        ['Transfer cost analysis to duplicate checking', 'Algorithm A compares every pair of distinct positions i<j in an n-entry list. Algorithm B inserts values into a hash set, stopping on a repeat. Assume expected constant-time set operations, but do not assume worst-case constant time.', 'Compare worst-case pair comparisons for A with expected operations for B when all values differ. Explain the extra memory and the limit of the hashing assumption.'],
      ] },
    { key: 'relational_keys', title: 'Reason about keys and joins', objective: 'Use declared keys and join multiplicities without conflating rows with entities.', prerequisites: ['computing.algorithm_cost'],
      criteria: ['Identify the declared keys and permitted repetitions.', 'Trace which row pairs satisfy the join condition.', 'Distinguish row counts, unique entities and missing matches.'],
      hints: ['A join produces matching row pairs, not automatically one row per person.', 'Write IDs beside names so coincident names are not merged.'],
      example: { prompt: 'Different example: Users has one row id=8; Orders has two rows with userId=8.', steps: ['An inner join on Users.id=Orders.userId produces two rows.', 'That is two orders linked to one distinct user, not two users.'] },
      tasks: [
        ['Explain join multiplicity', 'Students rows: (id=1,name=Lee),(id=2,name=Lee). Student id is unique. Enrollments rows: (studentId=1,course=X),(studentId=1,course=Y). Names are not keys.', 'Explain the inner join on student ID and why joining or deduplicating solely by name could change its meaning.'],
        ['Trace unmatched rows', 'Rooms rows: (id=R1),(id=R2). Bookings rows: (id=B1,roomId=R1),(id=B2,roomId=R1). A left join retains every room and uses null booking fields for a room with no match.', 'List the left-join row pairs and contrast the number of joined rows with the number of rooms having a booking.'],
        ['Transfer keys to a catalog', 'Books have unique bookId but titles may repeat. Copies have unique copyId and one bookId. One book can have many copies; a book may have none.', 'Propose keys and a join for counting copies per book, including zero-copy books. Explain why grouping by title can combine distinct editions.'],
      ] },
  ] },
  { level: 'college_advanced', course: 'computing-systems-guarantees', title: 'Concurrency, distributed state and authority', lessons: [
    { key: 'transaction_isolation', title: 'Analyze concurrent schedules', objective: 'Identify read/write anomalies under explicit isolation assumptions and justify a coordination boundary.', prerequisites: ['computing.relational_keys'],
      criteria: ['Name each read, computed value and committed write in order.', 'State the isolation or locking assumptions rather than assuming serialization.', 'Explain which invariant a proposed coordination mechanism protects.'],
      hints: ['Keep each transaction\'s local snapshot separate from shared committed state.', 'A transaction boundary alone does not specify its isolation level.'],
      example: { prompt: 'Different example: shared x=4; T1 and T2 both read 4 and each plans to write x+1.', steps: ['Uncoordinated replacement writes can both write 5, losing one increment.', 'A serialized atomic increment would produce 6 after two successful increments.'] },
      tasks: [
        ['Explain a lost update schedule', 'Stock starts at 5. T1 reads 5; T2 reads 5; T1 writes its read value minus 1 and commits; T2 writes its read value minus 1 and commits. Writes replace stock; no conflict detection or locks exist.', 'Explain the final stock and compare it with two serialized decrements. State the missing guarantee.'],
        ['Analyze write skew', 'Two on-call rows A and B start true. Each transaction reads a snapshot with both true. T1 sets A=false if B is true; T2 sets B=false if A is true. They update distinct rows, so this stated snapshot-isolation system allows both commits.', 'Trace the schedule against the invariant that at least one person is on call. Propose a coordination strategy that addresses this predicate, not only each row in isolation.'],
        ['Transfer coordination to reservations', 'A service enforces total reservations<=capacity using a sum query followed by inserting a new reservation row. Two requests may see the same sum and insert different rows. Assume no predicate locks or uniqueness constraint enforcing capacity.', 'Construct an interleaving at capacity-1 that exceeds capacity and explain a serialized counter or equivalent locking design, including its atomic check-and-write requirement.'],
      ] },
    { key: 'distributed_retries', title: 'Separate retries from exactly-once effects', objective: 'Reason about uncertain acknowledgments, idempotency and replay boundaries.', prerequisites: ['computing.transaction_isolation'],
      criteria: ['Distinguish delivery, committed effect and received acknowledgment.', 'Bind an idempotency key to the operation payload and result.', 'State retention, atomicity and failure assumptions for the proposed guarantee.'],
      hints: ['A timeout cannot tell you whether the remote commit occurred.', 'A key record and its side effect need one atomic boundary to avoid a crash gap.'],
      example: { prompt: 'Different example: a server stores an operation result, but its reply is lost.', steps: ['The client observes a timeout although the operation may already be committed.', 'Replaying a stable key can recover the recorded result without creating a second effect if the server enforces that rule atomically.'] },
      tasks: [
        ['Explain uncertain acknowledgment', 'A client sends transfer(key=K,amount=9). The server atomically commits the transfer and its key/result record. The response is lost. Repeating K with the identical payload returns the stored result; changing its payload is rejected.', 'Explain why retrying with K is different from generating a new key, and which atomicity assumption makes the behavior safe.'],
        ['Analyze a crash gap', 'Implementation records an idempotency key as completed, commits, then applies the requested side effect in a second transaction. It crashes between these transactions; later retries return completed.', 'Explain the inconsistent state and propose a protocol that cannot report this incomplete effect as completed. State what external side effects might still require.'],
        ['Transfer retries to an import worker', 'A queue may deliver each import job more than once. Each job has a stable job ID and immutable payload hash. Database row writes and job-result records can share a transaction; sending email cannot share it.', 'Design replay handling for the database import and explain how an outbox helps coordinate email. Do not claim exactly-once email delivery without a receiver-side deduplication assumption.'],
      ] },
    { key: 'authorization_boundaries', title: 'Bind authority to the operation', objective: 'Apply owner, scope and version checks at the privileged action boundary rather than trusting client identifiers.', prerequisites: ['computing.distributed_retries'],
      criteria: ['Identify the authenticated principal, resource owner and authorized action.', 'Validate resource/version relationships at the privileged boundary.', 'Explain replay or time-of-check changes and limit the capability scope.'],
      hints: ['A UUID locates a record; it does not establish permission.', 'Carry the verified relationship through the transaction that performs the effect.'],
      example: { prompt: 'Different example: a request contains accountId but the session identifies a different owner.', steps: ['Resolve the account under the authenticated principal before making a change.', 'Reject an unauthorized account even when the account ID is well-formed.'] },
      tasks: [
        ['Explain an object authorization flaw', 'An endpoint authenticates a user, accepts documentId, then updates that document by ID using a privileged database client. No ownership or collaborator authorization check is made.', 'Explain why authentication alone does not authorize the update. Propose an owner/action-scoped lookup and distinguish not-found handling from a permission grant.'],
        ['Analyze a version-bound capability', 'A signed token allows user U to approve document D at version V1 before time T. The server now stores V2. The request signature is valid and the time has not expired.', 'Explain the missing check if approval proceeds. Describe which principal, resource, action and version bindings must hold atomically at approval.'],
        ['Transfer authorization to a background worker', 'A worker receives jobId and a one-use capability bound to owner U, resource R, version V and payload hash H. The queue is not an authorization authority. The resource can change while the job waits.', 'Design validation and consumption at execution. Explain how retrying a committed result differs from reusing authority for a changed payload or version.'],
      ] },
  ] },
]

export const computingCompetencies: Competency[] = []
export const computingCourses: CourseMap[] = []
export const computingActivities: CourseActivity[] = []
export const computingTransferOrigins: Record<string, string> = {}
export const computingTransferActivityIds: Record<string, string> = {}
export const computingActivityPhases: Record<string, 'instruction' | 'practice' | 'transfer'> = {}
for (const band of bands) {
  const course: CourseMap = { id: band.course, title: band.title, subject: 'computing', level: band.level, revision: 1,
    units: band.lessons.map(lesson => ({ id: band.course + '-' + lesson.key, title: lesson.title, skillIds: ['computing.' + lesson.key] })), sources: [], alignments: [] }
  computingCourses.push(course)
  for (const lesson of band.lessons) {
    const skillId = 'computing.' + lesson.key
    computingCompetencies.push({ id: skillId, subject: 'computing', title: lesson.title, objective: lesson.objective, prerequisites: lesson.prerequisites, levels: [band.level], revision: 1 })
    for (const [index, [title, text, prompt]] of lesson.tasks.entries()) {
      const phase = (['instruction', 'practice', 'transfer'] as const)[index]
      const id = `${COURSE_ACTIVITY_VERSION}:${band.course}:${lesson.key}-${phase}`
      const source = { id: `${band.course}-${lesson.key}-${phase}`, title: title + ': rules and record', text,
        authorship: 'diana_authored' as const, instructionRights: 'original_practice' as const, trainingPermission: 'excluded' as const }
      computingActivityPhases[id] = phase
      computingActivities.push({ id, courseId: band.course, skillId, title, prompt, subject: 'computing', level: band.level,
        method: { kind: 'computing_rubric', criteria: lesson.criteria }, hints: lesson.hints, example: lesson.example, sources: [source], review: 'pending', revision: 1 })
      course.sources.push({ resourceId: source.id, edition: COMPUTING_RELEASE, unitId: band.course + '-' + lesson.key, locator: 'source:' + source.id })
      if (phase === 'transfer') {
        computingTransferOrigins[id] = band.course
        computingTransferActivityIds[id] = `${COURSE_ACTIVITY_VERSION}:${band.course}:${lesson.key}-practice`
      }
    }
  }
}
