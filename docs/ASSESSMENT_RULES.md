# Assessment rules

## Eligibility

1. Resolve the active syllabus and active subjects/chapters/topics through database relationships.
2. Expand selected full chapters to their active topics. Class tests expand only the requested class; full mocks expand the active syllabus.
3. Require a nonempty set of valid topic IDs in that syllabus.
4. Query active APPROVED questions in the requested language.
5. Require **all primary topic mappings and every explicitly mapped prerequisite** to be selected and active. A multi-concept question cannot enter a strict test on only one of its concepts.
6. Apply unseen, all, incorrect-history, or bookmark exposure filtering.
7. Deduplicate by question ID before allocation.

Editorial prerequisite mappings are authoritative. TopicPrerequisite supports taxonomy metadata; it does not implicitly expand a student’s selected syllabus. Authors must map every additional concept actually required to solve a question. No hidden prerequisite is silently selected for the student.

## Allocation

Difficulty percentages must sum to 100. The largest-remainder method converts fractional quotas to integer counts whose sum exactly matches the requested total. Ties use the stable Easy/Medium/Hard order.

Automatic selection applies round-robin chapter coverage independently within each requested difficulty, capped by supply. The final chosen questions are shuffled using a persisted seed.

Manual allocation requires nonnegative chapter counts summing to the requested total. An integral max-flow network jointly satisfies chapter and difficulty margins. This prevents a greedy choice in one chapter from consuming the only content that could satisfy another constraint. Full mocks use the same flow with **subject** margins taken from the selected database blueprint.

Insufficient total, difficulty, or constrained chapter supply returns a 422 error. The engine never pads with unrelated questions, silently changes requested percentages, or generates fewer questions than requested. Availability checks show eligible supply; final generation performs the authoritative joint allocation again.

## Scoring

| Mode            | Correct | Incorrect | Unanswered | Instant explanations              |
| --------------- | ------: | --------: | ---------: | --------------------------------- |
| Learning        |      +4 |         0 |          0 | Optional, after saving a response |
| Timed practice  |      +4 |         0 |          0 | No                                |
| NEET-style exam |      +4 |        −1 |          0 | No                                |

Full mocks take count, subject allocation, duration, and scoring from the active ExamBlueprint version. Current seeded reference: Physics 45, Chemistry 45, Biology 90; 180 questions; 180 minutes; maximum 720. A custom-length NEET-style test is clearly labeled practice.

Final scores come from approved, snapshotted keys on the server. Accuracy = correct / answered; if answered = 0, accuracy is unknown rather than a fabricated 0% competence estimate. Attempt rate = answered / total. Maximum score = total × configured correct marks. Mark for Review does not clear an answer.

Question-bank edits increment the content version and reset review status to Draft. Historical attempts retain their snapshots. Defective historical answer keys can be changed only through the **explicit audited rescore** in Admin Settings: specify question ID, affected version, corrected zero-based option, and a detailed reason. It rejects active affected attempts, retains prior keys/scores/analytics in AuditLog, recalculates submitted results transactionally, and shows the correction reason on result reviews. This is separate from publishing a corrected bank version for future tests.

## Time

The server persists startedAt and deadline once. Refresh or disconnection never extends the deadline. Answer and event endpoints check the deadline inside the attempt lock. A submission after expiry is capped at the deadline.

The client countdown is advisory. An in-process sweep on persistent servers or an external authenticated scheduler finalizes expired attempts, including disconnected sessions. Reads also finalize expired owned attempts. Finalization is idempotent.

Foreground solving time uses a monotonic browser clock, visibility/focus events, and frequent heartbeats. Server receipt timestamps cap claimed increments and duplicate event IDs are ignored. Timing remains an estimate; background, missing, or disconnected intervals are uncertain, and tab switching does not prove cheating.

- First pass: recorded active intervals before a second visit.
- Revisit: recorded active intervals after returning to a question.
- Subject/chapter time: sum of question active intervals.
- Topic time: a shared-topic question’s duration is divided evenly across primary topics.
- Median time: median of positive recorded question durations.
- Inactive/uncertain time: max(0, elapsed test time − recorded active time).

## Revision and analytics

Incorrect answers create a mistake and one manageable task per affected concept. Students categorize causes themselves; the app does not infer a cause merely from an incorrect option.

Default revision stages use same-day, 3-day, 7-day, and 14-day intervals. Remembered recall advances a stage; difficulty resets to same-day review. These are configurable heuristics, not scientifically optimized retention claims. Self-reported recall is distinct from fresh assessment evidence.

Topic observations and sample counts stay visible. Custom tests vary in content and difficulty, so raw marks and trends are not presented as universal rankings or exam predictions. No predicted NEET percentile, calibrated mastery score, fabricated peer mean, or unexplained personal index is produced.

## Challenges

An administrator clones one of their timed NEET-style tests into a frozen common paper. Every participant receives the same order, duration, and marking. Only one participation is allowed. Starts are accepted only when the full duration remains before challenge closing.

Results, explanations, mistakes, and aggregate analytics from that paper remain embargoed until closing. Score descending and elapsed completion time ascending determine ranking; exact ties share a rank. Only students with an alias and explicit leaderboard opt-in are published. Emails and account names are never leaderboard identities. Private challenge links carry invitation codes; treat these as private links.
