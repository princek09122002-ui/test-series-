# MASTER DEVELOPMENT PROMPT — NEET PERSONALIZED ASSESSMENT PLATFORM

## Table of Contents

- [0. YOUR ROLE AND OPERATING INSTRUCTIONS](#0-your-role-and-operating-instructions)
- [1. PRODUCT VISION](#1-product-vision)
- [2. TECHNOLOGY REQUIREMENTS](#2-technology-requirements)
- [3. DESIGN SYSTEM AND USER EXPERIENCE](#3-design-system-and-user-experience)
- [4. APPLICATION USER ROLES](#4-application-user-roles)
- [5. AUTHENTICATION AND ONBOARDING](#5-authentication-and-onboarding)
- [6. OFFICIAL NEET EXAM BLUEPRINT](#6-official-neet-exam-blueprint)
- [7. SYLLABUS HIERARCHY](#7-syllabus-hierarchy)
- [8. STUDENT PREPARATION TRACKER](#8-student-preparation-tracker)
- [9. ADVANCED CUSTOM TEST BUILDER — MOST IMPORTANT FEATURE](#9-advanced-custom-test-builder--most-important-feature)
- [10. TEST GENERATION ENGINE](#10-test-generation-engine)
- [11. TEST-TAKING INTERFACE](#11-test-taking-interface)
- [12. ADVANCED QUESTION-LEVEL TIME TRACKING](#12-advanced-question-level-time-tracking)
- [13. SCORING ENGINE](#13-scoring-engine)
- [14. PERFORMANCE ANALYTICS DASHBOARD](#14-performance-analytics-dashboard)
- [15. TIME MANAGEMENT INTELLIGENCE](#15-time-management-intelligence)
- [16. AUTOMATIC MISTAKE NOTEBOOK](#16-automatic-mistake-notebook)
- [17. SMART REVISION ENGINE](#17-smart-revision-engine)
- [18. STUDENT READINESS AND PERSONAL IMPROVEMENT](#18-student-readiness-and-personal-improvement)
- [19. COMPETITIVE SYSTEM](#19-competitive-system)
- [20. QUESTION BANK AND CONTENT MANAGEMENT](#20-question-bank-and-content-management)
- [21. STUDENT DASHBOARD](#21-student-dashboard)
- [22. REQUIRED PAGES AND ROUTES](#22-required-pages-and-routes)
- [23. DATABASE DESIGN](#23-database-design)
- [24. SECURITY AND RELIABILITY](#24-security-and-reliability)
- [25. APPLICATION PERFORMANCE](#25-application-performance)
- [26. AI FEATURES — OPTIONAL, NOT REQUIRED FOR BASIC TESTING](#26-ai-features--optional-not-required-for-basic-testing)
- [27. INITIAL DEMO DATA](#27-initial-demo-data)
- [28. TESTING REQUIREMENTS](#28-testing-requirements)
- [29. IMPLEMENTATION PHASES](#29-implementation-phases)
- [30. CODE QUALITY EXPECTATIONS](#30-code-quality-expectations)
- [31. REQUIRED DOCUMENTATION](#31-required-documentation)
- [32. DEFINITION OF DONE](#32-definition-of-done)
- [33. BEGIN EXECUTION NOW](#33-begin-execution-now)

---

## 0. YOUR ROLE AND OPERATING INSTRUCTIONS

Act as a team of highly experienced professionals:

- Principal Full-Stack Software Engineer
- Senior Next.js and TypeScript Developer
- Backend and Database Architect
- Senior UI/UX Product Designer
- NEET Examination and Assessment Specialist
- Learning Science and Educational Analytics Specialist
- Software QA and Security Engineer

Your task is to architect, design, implement, test, and document a complete, professional NEET preparation and assessment platform.

This must be a **real working full-stack application**, not merely a landing page, static dashboard, prototype, or collection of disconnected UI screens.

Use actual database persistence, functional forms, server-side business logic, validated inputs, authenticated user accounts, and working test sessions.

Do not create decorative buttons without functionality. Do not rely on hardcoded results, fake statistics, invented student rankings, or simulated API responses in production pathways.

Use professional engineering judgment for implementation details not explicitly specified below.

If something is ambiguous, choose the simplest reliable and extensible implementation, document the decision, and continue.

Before coding, inspect the existing repository. If it contains useful code, preserve and extend it. If it is empty, initialize the project.

Work autonomously through implementation, verification, and error correction. Do not stop after providing a plan.

If the entire application cannot fit in one execution, deliver a working vertical slice first and continue implementing the modules in the priority order defined below. Never describe an unfinished feature as complete.

---

## 1. PRODUCT VISION

Build a premium, modern NEET UG preparation platform where students can generate highly customized tests based on their actual syllabus progress.

The platform's central principle is:

**Students should be able to test exactly what they have studied, understand precisely why they lose marks, and receive actionable guidance to improve.**

Traditional preparation platforms often emphasize predefined full-syllabus, class-wise, chapter-wise, or mock tests.

Our platform must provide much more granular customization.

The student should be able to choose:

1. Subjects.
2. Class 11 or Class 12.
3. Individual chapters.
4. Entire chapters or specific topics.
5. Multiple chapters and topics simultaneously.
6. Number of questions.
7. Question allocation per chapter.
8. Difficulty distribution.
9. Test duration where customization is allowed.
10. Practice or NEET-style marking.
11. Previously attempted or unseen questions.

The platform must also support full NEET-style mocks, complete Class 11 tests, complete Class 12 tests, analytics, improvement recommendations, revision scheduling, and fair competitive challenges.

The primary users are Class 11 students, Class 12 students, and NEET repeaters.

The platform must be beginner-friendly, responsive, academically reliable, fast, secure, and extensible.

Working product name: **NEET Adaptive**

Use this as a temporary brand. Keep brand name, logo, and theme configuration easily replaceable.

Product positioning:

**Your Syllabus. Your Test. Your Improvement.**

---

## 2. TECHNOLOGY REQUIREMENTS

Use this primary stack:

- Next.js with App Router
- TypeScript with strict mode
- React
- Tailwind CSS
- shadcn/ui
- Lucide icons
- PostgreSQL
- Prisma ORM
- Auth.js for authentication
- Zod for input and API validation
- React Hook Form for complex forms
- Recharts for analytics
- Vitest for unit/integration testing
- Playwright for end-to-end testing
- ESLint and formatting tools

Use current stable, mutually compatible package versions. Consult the package documentation before implementing version-sensitive APIs.

Do not use deprecated Next.js patterns when modern App Router alternatives exist.

Use Server Components for appropriate server-rendered data and Client Components only where interactivity is necessary.

Prefer a modular monolith with a clear separation between:

- UI components
- Pages and route handlers
- Authentication and authorization
- Business logic
- Data access
- Test generation
- Scoring
- Timing and session tracking
- Analytics
- Revision scheduling
- Administrative operations

Use server-side authorization and validation for all privileged operations.

Use environment variables for secrets and external-service configuration.

Never expose answer keys, database secrets, administrator credentials, or scoring internals to unauthenticated or unprivileged clients.

Provide a `.env.example` file.

Implement loading states, error states, empty states, and responsive layouts.

---

## 3. DESIGN SYSTEM AND USER EXPERIENCE

Create a polished educational SaaS interface.

The design should feel like a premium learning platform, not a generic admin template.

Design direction:

- Clean, modern, premium visual appearance.
- Light theme by default.
- Optional dark mode.
- White or very light neutral backgrounds.
- Deep navy primary text.
- Blue or indigo as the primary interface accent.
- Green for positive progress.
- Amber for caution and pending revision.
- Red for incorrect answers and critical problems.
- Rounded cards with subtle borders and restrained shadows.
- Generous spacing.
- Excellent typography.
- Clear visual hierarchy.
- Minimal interface clutter.
- Smooth but restrained transitions.
- Mobile-first responsive layouts.

Use shadcn/ui consistently.

Do not fill every screen with colorful gradients.

Prioritize readability, focus, and low cognitive load during exams.

Recommended major UI components:

- Student sidebar navigation
- Dashboard metric cards
- Progress indicators
- Subject selection cards
- Expandable chapter accordions
- Topic checkboxes
- Question-count sliders
- Difficulty selectors
- Test setup summary
- Exam navigation palette
- Question status indicators
- Sticky timer
- Confirmation dialogs
- Interactive performance charts
- Revision cards
- Accessible tooltips
- Empty states
- Skeleton loaders
- Toast notifications

Ensure keyboard accessibility and semantic HTML.

Use proper color contrast and accessible form labels.

Support MathJax or KaTeX for scientific notation, mathematical formulas, subscripts, superscripts, fractions, equations, and symbols.

Support images and diagrams in questions and explanations.

Do not introduce unnecessary motion inside the actual exam interface.

---

## 4. APPLICATION USER ROLES

Implement role-based access control.

### Student

Can:

- Register and log in.
- Update profile.
- Manage preparation progress.
- Create and attempt tests.
- View results.
- View analytics.
- Save mistakes.
- Complete revision activities.
- Participate in eligible competitive challenges.
- Manage preferences.

### Content Editor / Teacher

Can:

- Create and edit questions.
- Add explanations.
- Assign chapters and topics.
- Suggest difficulty.
- Preview questions.
- Submit questions for approval.
- Review content assigned to them, subject to role permissions.

### Administrator

Can:

- Manage users and roles.
- Manage syllabus versions.
- Manage subjects, chapters and topics.
- Review and publish questions.
- Manage test blueprints.
- Create standardized challenges.
- Inspect question coverage.
- Manage flagged questions.
- View aggregate platform analytics.
- Configure relevant system settings.

All admin routes must be protected on the server.

Ordinary students must never be able to access administrative data or modify question-bank records.

---

## 5. AUTHENTICATION AND ONBOARDING

Implement a proper authentication system.

For the initial implementation support email/password authentication using a secure password-hashing approach, plus Google sign-in if credentials are configured.

Use secure sessions and account-specific authorization.

Provide:

- Sign-up page
- Login page
- Logout
- Password reset flow
- Profile page
- Account settings
- Session management where supported

For first-time onboarding, ask the student:

1. Are you in Class 11, Class 12, or a NEET repeater?
2. Which exam year are you preparing for?
3. Preferred language: English or Hindi.
4. Which subjects are you currently studying?
5. Optional daily test-practice goal.

Do not require students to complete lengthy onboarding before they can explore the platform.

Do not collect unnecessary personal information.

Apply appropriate privacy and safeguarding practices because many students may be minors.

---

## 6. OFFICIAL NEET EXAM BLUEPRINT

Create a configurable NEET exam blueprint.

The initial reference configuration should match the official NEET UG 2026 pattern:

- Total questions: 180.
- Total marks: 720.
- Duration: 180 minutes.
- Physics: 45 questions.
- Chemistry: 45 questions.
- Biology: 90 questions, covering Botany and Zoology.
- Correct answer: +4.
- Incorrect answer: -1.
- Unattempted question: 0.

All questions are single-correct-option MCQs, subject to the applicable official rules.

The full examination is traditionally conducted in pen-and-paper mode, so our application should clearly describe online mocks as simulations.

Do not describe online practice as the official NTA examination system.

The complete official-style mock should enforce:

- Exactly 180 questions.
- Correct subject distribution.
- Exactly 180 minutes.
- Official-style scoring.
- No hints during the exam.
- No solution visibility before submission.
- Automatic submission when time expires.

Create database-backed ExamBlueprint and BlueprintSection configurations so the platform can support changes to exam rules in later years.

Do not hardcode exam settings across different UI components.

Use the official NTA syllabus and information bulletin as authoritative sources:

https://neet.nta.nic.in/

Do not automatically assume coaching-material chapter labels match official syllabus boundaries.

Use a versioned syllabus structure.

---

## 7. SYLLABUS HIERARCHY

Implement a comprehensive, normalized syllabus system.

Hierarchy:

Syllabus Version → Subject → Class → Chapter → Topic → Subtopic.

Subjects:

- Physics
- Chemistry
- Biology

Biology should support Botany and Zoology classifications internally for filtering and reporting.

Physics and Chemistry should support Class 11 and Class 12.

Biology should likewise support class-wise syllabus mapping.

Each chapter should contain meaningful topics and optional subtopics.

Every topic must have:

- Unique ID
- Name
- Slug
- Subject
- Class
- Chapter
- Syllabus version
- Display order
- Active status

Optional fields:

- Description
- Prerequisite concepts
- NCERT reference
- Expected learning outcomes

Build an expandable chapter/topic selector.

Example:

Chemistry → Class 11 → Some Basic Concepts of Chemistry

Possible topics:

- Mole concept
- Molar mass
- Percentage composition
- Stoichiometry
- Limiting reagent

Chemistry → Class 11 → Structure of Atom

Possible topics:

- Atomic models
- Electromagnetic radiation
- Bohr's model
- Quantum numbers
- Electronic configuration

These examples illustrate the intended taxonomy. Align the final published structure with the verified applicable syllabus.

---

## 8. STUDENT PREPARATION TRACKER

Build a dedicated syllabus progress tracker.

Students must be able to mark individual topics as:

- Not Started
- Learning
- Completed
- Revising

A student's declared completion status is separate from their measured mastery.

For example:

Atomic Structure:

- Atomic models: Completed
- Bohr's model: Completed
- Quantum numbers: Learning
- Electronic configuration: Not Started

The interface should show progress by:

- Topic
- Chapter
- Subject
- Class
- Overall syllabus

Calculate progress using properly defined denominators.

Do not display a misleading 100% completion rate when topics are missing or untracked.

Provide a feature called:

**Test My Completed Topics**

This should automatically preselect topics marked Completed or Revising.

Students must be able to modify those selections before starting.

The preparation tracker should not automatically classify a topic as mastered merely because the student marked it completed.

Measured mastery must depend on assessment evidence.

---

## 9. ADVANCED CUSTOM TEST BUILDER — MOST IMPORTANT FEATURE

This is the core product feature.

Build a production-quality multi-step custom test creation workflow.

### Step 1: Select test type

Options:

A. Custom Test  
B. Complete Class 11  
C. Complete Class 12  
D. Full NEET Mock  
E. Weak-Topic Revision Test  
F. Completed-Syllabus Test

The first four are essential for the MVP.

### Step 2: Select subjects

For custom tests, allow:

- Physics only
- Chemistry only
- Biology only
- Any combination

### Step 3: Select class

Allow Class 11, Class 12, or both where applicable.

### Step 4: Select chapters

Display chapters grouped under subject and class.

Each chapter must provide two primary choices:

- Full Chapter
- Select Topics

Choosing Full Chapter includes every eligible topic within that chapter and syllabus version.

Choosing Select Topics expands the topic list.

Provide select-all, deselect-all, and search functionality.

### Step 5: Select individual topics

Allow any combination of topics from different chapters.

For example:

Chemistry:

Some Basic Concepts of Chemistry:
- Entire chapter

Structure of Atom:
- Atomic models
- Electromagnetic radiation
- Bohr's model

Do not include Quantum Numbers or Electronic Configuration if the student has not selected them.

The system must support mixed full-chapter and partial-chapter selection.

Prevent questions requiring unselected prerequisite concepts from accidentally entering strictly selected-topic tests.

Use explicit topic and prerequisite mappings.

If a question belongs to multiple concepts, apply the configured eligibility policy consistently.

### Step 6: Choose number of questions

Allow custom question counts based on available eligible content.

For the initial UI, provide convenient presets:

- 10
- 15
- 20
- 30
- 45
- 60
- 90

Also allow custom values within supported limits.

Validate selected question count against question availability.

Never silently generate fewer questions than requested.

If insufficient questions exist, show an explanation and offer:

- Reduce question count.
- Allow previously attempted questions.
- Expand selected topics.
- Adjust difficulty distribution.

Do not silently include unrelated questions.

### Step 7: Question distribution

Provide two options:

Automatic Distribution:
The system allocates questions across selected chapters and topics based on available coverage and transparent weighting rules.

Manual Distribution:
The student can specify the number of questions per chapter.

Validate that allocations sum exactly to the requested total.

For example:

Mole Concept: 15 questions  
Atomic Structure selected topics: 10 questions  
Human Physiology: 25 questions

Total: 50 questions.

For manual distribution, allow student control without creating invalid configurations.

### Step 8: Difficulty selection

Options:

- Foundation
- NEET Balanced
- Challenging
- Custom Mix

For Custom Mix, allow percentages for easy, medium and hard questions.

Ensure percentages sum to 100%.

Difficulty classifications must be editorially reviewed initially.

Later, improve difficulty estimation using actual student-response statistics.

Do not pretend inferred difficulty is precisely calibrated without sufficient data.

### Step 9: Question exposure filter

Options:

- Unseen questions only
- Include previously attempted questions
- Incorrect questions only
- Bookmarked questions only

Implement relevant availability checks.

Prevent duplicates within the same generated test.

### Step 10: Test mode

Support:

#### Learning Mode

- No negative marking.
- Optional timer.
- Optional instant explanations.
- Suitable for conceptual learning.

#### Timed Practice Mode

- No negative marking.
- Student-configured duration.
- Solutions available after submission by default.
- Focused on improving pacing and accuracy.

#### NEET Exam Mode

- +4 for correct.
- -1 for incorrect.
- 0 for unanswered.
- Strict time rules.
- No hints during testing.
- Question navigation.
- Mark for review.
- Final submission confirmation.

Allow custom-length tests to use NEET-style scoring without presenting them as official full mocks.

Full NEET Mock must always follow the configured official blueprint.

### Step 11: Test summary and validation

Before starting, show:

- Test name
- Selected subjects
- Selected chapters and topics
- Question count
- Difficulty configuration
- Marking scheme
- Maximum score
- Time limit
- Question exposure preferences

Require valid configuration before starting.

Persist every generated test configuration.

---

## 10. TEST GENERATION ENGINE

Build a real server-side question selection engine.

Do not simply shuffle all questions or randomly return questions without eligibility checking.

The generation process must:

1. Validate the student request.
2. Resolve the active syllabus version.
3. Resolve selected topics.
4. Validate chapter/topic relationships.
5. Query only approved and active questions.
6. Apply topic and prerequisite constraints.
7. Apply question exposure preferences.
8. Apply subject and chapter allocations.
9. Apply requested difficulty distribution.
10. Prevent duplicate questions.
11. Validate available question counts.
12. Select the question set.
13. Persist the finalized question order.
14. Snapshot relevant question versions.
15. Create the test attempt.
16. Establish the timer configuration.
17. Return only student-safe question data.

Use a deterministic random seed when useful for reproducibility and debugging.

Do not expose correct answers or private explanation data during active exam sessions.

Use transactions where necessary to avoid partially generated tests.

For insufficient question-bank coverage, provide a meaningful error or an explicit confirmation-based fallback.

Preserve question IDs and versions for historical result consistency.

---

## 11. TEST-TAKING INTERFACE

Build a professional test-taking interface inspired by the usability of real exam environments.

Desktop layout:

- Main question area.
- Question number and subject.
- Optional question image.
- Four answer options.
- Timer in the header.
- Question navigator on the right.
- Save and Next.
- Previous.
- Clear Response.
- Mark for Review.
- Submit Test.

Mobile layout:

- Question occupies the primary screen.
- Collapsible question navigator.
- Clear touch targets.
- Fixed or accessible navigation controls.
- Timer remains visible.
- No horizontal overflow.

Question statuses:

- Not Visited
- Visited but Unanswered
- Answered
- Marked for Review
- Answered and Marked for Review

Preserve answer state when navigating.

Mark for Review should not automatically remove an answer.

Allow student movement between questions without losing responses.

Autosave answers to the backend.

Use optimistic UI only with reliable reconciliation and visible save-state feedback.

Handle:

- Refresh
- Back navigation
- Browser crashes
- Accidental tab closure
- Temporary network failure
- Session expiration
- Duplicate submission

A student should be able to resume an eligible test according to its mode and session policy.

For strict timed tests, use a server-authoritative deadline.

The timer must continue according to elapsed wall-clock time even after refresh or disconnect.

Do not allow refresh to reset the timer.

Automatically finalize timed tests at the deadline.

Make finalization idempotent so repeated requests do not create duplicate scoring records.

Display a final confirmation modal before manual submission.

---

## 12. ADVANCED QUESTION-LEVEL TIME TRACKING

Implement a reliable timing and event-capture system.

Record:

- Test started time
- Test submission time
- Question visits
- Active question duration
- First-pass duration
- Revisit duration
- Answer selection time
- Answer changes
- Question skips
- Mark-for-review events
- Page visibility/focus events where available
- Network interruptions where detectable

Use a monotonic client clock for measuring local elapsed interaction time where supported, combined with server timestamps.

Avoid counting background-tab time as active question-solving time.

Record inactive or uncertain periods separately.

Do not assume that switching tabs proves cheating.

Aggregate question-level timing into:

- Total test time
- Active solving time
- Median question time
- Subject-specific average time
- Chapter-specific average time
- Topic-specific average time
- Correct-question time
- Incorrect-question time
- Skipped-question time
- Revisit time

Make the calculation definitions explicit and consistent.

---

## 13. SCORING ENGINE

Implement scoring as a centralized, tested backend service.

For NEET-pattern scoring:

Correct = +4  
Incorrect = -1  
Unattempted = 0

Formula:

Score = (4 × Correct Answers) - Incorrect Answers

Maximum = Number of Questions × 4

For non-negative practice mode:

Correct = +4  
Incorrect = 0  
Unattempted = 0

Clearly label practice scores so they are not confused with NEET-pattern marks.

Track:

- Number of correct responses
- Number of incorrect responses
- Number of unattempted questions
- Attempt rate
- Accuracy among attempted questions
- Score
- Maximum possible score
- Time used

For published questions later found to be defective, support administrative correction and a documented rescore workflow.

Never recalculate historical attempts using silently modified answer keys.

Keep scoring rules versioned.

---

## 14. PERFORMANCE ANALYTICS DASHBOARD

Build a sophisticated but easy-to-understand results and analytics system.

After each test, show:

### Primary Summary

- Total score
- Maximum score
- Correct answers
- Incorrect answers
- Unattempted questions
- Accuracy
- Attempt rate
- Total time used
- Active time estimate
- Test mode
- Test difficulty
- Selected syllabus coverage

### Subject Breakdown

For each subject:

- Questions attempted
- Accuracy
- Marks
- Time used
- Average time per question

### Chapter Breakdown

Show chapter-level performance and question counts.

### Topic Breakdown

Show:

- Topic name
- Correct
- Incorrect
- Unattempted
- Accuracy
- Time spent
- Number of observations
- Improvement trend

Do not label a topic "mastered" based on a tiny sample.

### Question Analysis

Allow students to review every question.

Display:

- Question
- Their answer
- Correct answer
- Explanation
- Topic
- Difficulty
- Time spent
- Error classification
- Revision/bookmark controls

### Visualizations

Create:

- Accuracy trend chart
- Score trend chart
- Subject performance chart
- Topic mastery chart
- Time distribution chart
- Correct vs incorrect vs unattempted chart
- Speed and accuracy comparison chart

All charts must read real persisted data.

Use honest empty states when data is insufficient.

Never fill analytics charts with invented student statistics.

Use labeled sample data only for explicit demo accounts.

---

## 15. TIME MANAGEMENT INTELLIGENCE

Build a dedicated Time Management section.

The platform should help students understand whether their time allocation is effective.

Example:

Student Physics average: 125 seconds  
Comparable benchmark: 105 seconds

This benchmark must come from actual eligible student data or be explicitly labeled as an instructional target.

Never invent population averages.

Analyze:

- Slow correct answers
- Slow incorrect answers
- Fast incorrect answers
- Excessive revisits
- Time spent on skipped questions
- Time distribution between subjects
- Time remaining at submission
- Speed-accuracy tradeoff

Do not reward speed at the expense of accuracy.

Example actionable feedback:

"You spent substantial time on incorrect Physics numerical questions. Consider practising the calculation method without a timer before attempting another timed set."

Provide evidence-based feedback when possible.

When a recommendation is heuristic, do not claim scientific precision.

Implement peer comparisons only when cohorts and sample sizes are sufficient.

For comparability, consider:

- Same standardized paper
- Similar question difficulty
- Same scoring mode
- Same time-limit policy
- Topic coverage
- Relevant sample size

Do not compare unrelated custom tests as if they are equivalent.

---

## 16. AUTOMATIC MISTAKE NOTEBOOK

Build a dedicated Mistake Notebook feature.

When a student answers incorrectly, allow the question to be recorded for revision.

Store:

- User ID
- Question ID
- Attempt ID
- Selected answer
- Correct answer reference
- Chapter
- Topic
- Error category
- Date of mistake
- Review status
- Last revision date
- Next scheduled review date

Supported mistake categories:

- Concept not understood
- Forgotten information
- Calculation error
- Misread question
- Guessing
- Time pressure
- Other

Students must be able to manually categorize mistakes.

The system may suggest likely categories, but should not assume that wrong answers alone establish the cause.

Provide filters:

- Subject
- Chapter
- Topic
- Mistake type
- Date
- Review status

Provide a "Retest My Mistakes" action.

Whenever possible, use fresh equivalent questions to assess whether the concept was actually learned.

Do not assume remembering the answer to an identical question proves mastery.

---

## 17. SMART REVISION ENGINE

Implement revision scheduling.

Use a simple, explainable scheduling model initially.

After a student struggles with a concept, create a revision task.

Possible initial review intervals:

- Same-day review
- Review after 3 days
- Review after 7 days
- Review after 14 days

These are configurable starting defaults, not guaranteed optimal intervals.

Adjust future review intervals based on performance.

Use fresh questions to assess retention.

Build a Revision Dashboard showing:

- Due today
- Overdue
- Completed
- Weak concepts
- Upcoming revision tasks

Allow students to generate revision tests directly.

The revision system should recommend manageable work rather than overwhelm students with excessive tasks.

---

## 18. STUDENT READINESS AND PERSONAL IMPROVEMENT

Track multiple measures separately:

- Accuracy
- Speed
- Consistency
- Retention
- Topic coverage
- Recent improvement

Optionally calculate a clearly labeled personal training index.

If implementing an initial training index, keep its formula configurable.

Example provisional weighting:

Accuracy: 45%  
Pacing: 20%  
Consistency: 20%  
Retention: 15%

This is an illustrative internal product heuristic, not a validated predictor of NEET rank.

Do not present it as an official NEET rating.

Do not generate predicted NEET scores or percentile rankings without a properly validated statistical model and sufficient standardized assessment data.

Prefer showing transparent component scores over one unexplained number.

---

## 19. COMPETITIVE SYSTEM

Create a fair competition system.

Competitive ranking must be based on comparable standardized assessments.

Features:

- Weekly common-paper challenges
- Subject-based challenges
- Optional private friend groups
- Personal-best records
- Improvement challenges
- Optional anonymous display names
- Challenge result history

For public competitive challenges:

- All participating students receive the same paper, or a properly calibrated equivalent.
- Same scoring rules.
- Same duration.
- Clearly disclosed eligibility and ranking rules.

Rank primarily by score.

Use a transparent tie-break policy such as recorded completion time for the specific challenge, if defined in advance.

Do not apply universal rankings to arbitrary custom tests.

Do not publish student emails, phone numbers, or private identities on leaderboards.

Provide opt-out and privacy settings.

Do not build manipulative engagement mechanisms or shame-based rankings.

---

## 20. QUESTION BANK AND CONTENT MANAGEMENT

Build a complete admin question-management interface.

Each question must support:

- Unique ID
- Question type
- Question text
- Four answer options
- Correct option
- Explanation
- Subject
- Class
- Chapter
- One or multiple topics
- Required prerequisite topics
- Difficulty
- Question source
- Original or licensed content status
- Language
- Images/diagrams
- Tags
- Review status
- Active/inactive status
- Version
- Created and updated timestamps

Question review states:

- Draft
- Pending Review
- Approved
- Rejected
- Archived

Only approved questions may appear in published tests.

Build admin screens for:

- Add question
- Edit question
- Preview question
- Review question
- Publish/unpublish question
- Bulk import questions
- Manage tags
- Inspect question coverage
- Inspect reported errors

Support CSV and/or validated JSON import.

Provide templates and documentation for bulk upload.

Never trust imported files without validation.

Question content may include mathematical formatting and media.

Prevent script injection and unsafe HTML.

Support question versioning.

Provide mechanisms for student question-error reports and admin review.

Do not scrape or reproduce copyrighted question banks without permission.

---

## 21. STUDENT DASHBOARD

Build a useful, premium student home dashboard.

Sections:

### Welcome

Personalized greeting and current preparation stage.

### Quick Actions

- Create Custom Test
- Start Full NEET Mock
- Test Completed Topics
- Revise Weak Topics

### Preparation Overview

- Syllabus completion
- Topics currently learning
- Topics awaiting revision
- Recent improvement

### Recent Test Performance

- Last test score
- Accuracy
- Time used
- Result link

### Weak Topics

Show concepts requiring attention.

### Revision Tasks

Show due and upcoming reviews.

### Performance Trends

Show recent score and accuracy changes.

### Suggested Next Action

Recommend one useful next assessment or revision activity based on available evidence.

Avoid generating overly confident recommendations from insufficient data.

Provide meaningful initial empty states for newly registered users.

---

## 22. REQUIRED PAGES AND ROUTES

Implement the following route structure, or an equally clean App Router equivalent.

Public:

- /
- /features
- /login
- /signup
- /forgot-password

Student:

- /dashboard
- /onboarding
- /tests
- /tests/create
- /tests/[testId]
- /tests/[testId]/result
- /history
- /analytics
- /analytics/subjects
- /analytics/topics
- /analytics/time-management
- /syllabus
- /revision
- /mistakes
- /challenges
- /challenges/[challengeId]
- /profile
- /settings

Admin:

- /admin
- /admin/questions
- /admin/questions/new
- /admin/questions/[questionId]/edit
- /admin/review
- /admin/syllabus
- /admin/challenges
- /admin/users
- /admin/reports
- /admin/settings

Implement correct role-based access.

Every page must have real functionality or an explicitly identified unfinished state.

Do not display fake dashboards that appear populated with real student data.

---

## 23. DATABASE DESIGN

Design a normalized PostgreSQL schema using Prisma.

At minimum, consider these models:

Identity and access:
- User
- Account
- Session
- UserProfile
- Role / permissions structure

Syllabus:
- SyllabusVersion
- Subject
- Chapter
- Topic
- TopicPrerequisite
- UserTopicProgress

Questions:
- Question
- QuestionOption
- QuestionTopic
- QuestionVersion
- QuestionMedia
- QuestionReview
- QuestionReport
- QuestionExposure

Testing:
- ExamBlueprint
- ExamBlueprintSection
- Test
- TestConfiguration
- TestQuestion
- TestAttempt
- QuestionResponse
- QuestionInteractionEvent

Analytics:
- TestAnalyticsSnapshot
- TopicPerformance
- SubjectPerformance

Revision:
- MistakeRecord
- RevisionTask
- RevisionAttempt

Competition:
- Challenge
- ChallengeParticipation
- ChallengeResult

Administration:
- AuditLog
- PlatformSettings

Use enums and constraints where appropriate.

Design indexes for high-frequency operations.

Store timestamps in UTC.

Support timezone-aware presentation.

Keep scoring and question versions consistent across historical attempts.

Prevent duplicate final submissions.

Use database transactions for critical workflows.

Do not over-denormalize at the beginning.

If materialized analytics tables are added later, document how they are updated and rebuilt.

---

## 24. SECURITY AND RELIABILITY

Implement:

- Server-side session validation
- Role-based authorization
- Secure password storage
- Input validation
- CSRF protections appropriate to the auth and mutation architecture
- Rate limiting for sensitive endpoints
- Safe file uploads
- Secure environment-variable handling
- Database access controls
- Safe error responses
- Audit logs for administrative actions
- Restricted access to answer keys
- Reliable autosave
- Idempotent submission
- Protection against duplicate scoring
- Appropriate handling of disconnected sessions

Never trust the browser to calculate final marks.

Always calculate scores on the server.

Never trust student-submitted correct answers or scoring values.

Use security-conscious defaults for minors.

Avoid exposing unnecessary personal data.

Do not claim anti-cheating guarantees that browser-based testing cannot realistically provide.

---

## 25. APPLICATION PERFORMANCE

Optimize for normal student devices and moderate network connectivity.

Requirements:

- Mobile-first design
- Fast dashboard navigation
- Efficient database queries
- Pagination for long question lists
- Lazy loading where helpful
- Debounced search/filter interactions
- Appropriate caching
- Optimized question media
- Minimal unnecessary client-side JavaScript
- Stable timer performance
- Autosave without excessive requests
- Accessible forms
- Proper loading/error states

Do not introduce Redis, microservices, or distributed processing merely for architectural complexity.

Use them only when justified by real requirements or measured scale.

---

## 26. AI FEATURES — OPTIONAL, NOT REQUIRED FOR BASIC TESTING

The core platform must function without an AI API.

Design an optional AI service abstraction that can later provide:

- Alternative question explanations
- Simplified concept explanations
- Mistake review suggestions
- Personalized revision recommendations
- Natural-language analysis summaries

Do not use AI to determine final answer correctness during an exam.

Correctness must come from approved answer keys and explicit scoring rules.

Do not allow AI to generate unreviewed production questions automatically.

If AI credentials are absent, hide or disable AI-specific features gracefully while keeping the rest of the platform functional.

Never fabricate recommendations or present fallback text as AI-generated analysis.

---

## 27. INITIAL DEMO DATA

Provide a reproducible database seed command.

Create a clearly marked demonstration environment containing:

- A small illustrative syllabus
- Sample chapters and topics
- Approved original sample MCQs
- Correct answers
- Educational explanations
- Difficulty classifications
- Example topic mappings
- A demonstration student account
- A demonstration admin account created through a secure local-development process

Avoid hardcoding publicly reusable default admin credentials.

Document how to create or rotate local development credentials.

Use enough reviewed sample questions to demonstrate:

- Partial-chapter selection
- Multi-chapter selection
- Cross-subject tests
- Question distribution
- Test completion
- Scoring
- Results
- Mistake tracking
- Revision tasks

Do not imply the seed database contains full NEET syllabus coverage.

A full mock should be disabled or clearly report insufficient approved questions until the necessary content exists.

Do not generate 180 fake questions just to make the full mock appear operational.

---

## 28. TESTING REQUIREMENTS

Implement automated tests for critical business logic.

### Unit Tests

Test:

1. Correct NEET scoring.
2. Practice mode scoring.
3. Unattempted-question handling.
4. Topic-selection filtering.
5. Mixed full-chapter and partial-chapter selection.
6. Prerequisite-topic filtering.
7. Manual distribution validation.
8. Insufficient question availability.
9. Difficulty distribution.
10. Duplicate prevention.
11. Attempt accuracy calculation.
12. Topic performance calculations.
13. Timer deadline logic.
14. Revision scheduling rules.

### Integration Tests

Test:

- Authentication.
- Protected routes.
- Admin permissions.
- Question creation and approval.
- Test generation.
- Answer persistence.
- Final submission.
- Score persistence.
- Result retrieval.
- Mistake record creation.
- Revision task creation.

### End-to-End Tests

Test at least these flows:

A. Student signs in, creates a partial-chapter test, answers questions, submits, and views results.

B. Student selects an entire chapter plus two topics from another chapter and generates a test without unselected content.

C. Student refreshes an active test and resumes with answers intact.

D. Timed test reaches deadline and submits correctly.

E. Student opens an incorrect question, reviews its explanation, and adds a revision task.

F. Admin adds and approves a new question.

G. Unauthorized student cannot access admin pages.

H. Test generation properly rejects a request that exceeds the available approved question bank.

Run type checking, linting, tests, and production build checks.

Fix implementation errors rather than merely documenting them.

---

## 29. IMPLEMENTATION PHASES

Implement in this exact priority order.

### Phase 1 — Project Foundation

- Inspect repository.
- Initialize Next.js if needed.
- Configure TypeScript and styling.
- Add UI component system.
- Configure PostgreSQL and Prisma.
- Implement authentication.
- Implement role protection.
- Create database schema and migrations.
- Create initial layouts and navigation.

Deliver a working app shell.

### Phase 2 — Syllabus and Question Bank

- Versioned syllabus models.
- Subject/chapter/topic relationships.
- Preparation progress.
- Question management.
- Content review and approval.
- Seed data.
- Student-safe question retrieval.

Deliver a usable syllabus browser and admin content flow.

### Phase 3 — Custom Test Builder

- Test-type selection.
- Subject selection.
- Chapter selection.
- Topic-level selection.
- Full/partial chapter selection.
- Question count.
- Manual/automatic distribution.
- Difficulty.
- Test mode.
- Configuration validation.
- Server-side test generation.

This is the highest-priority product experience.

### Phase 4 — Test Engine

- Functional question interface.
- Response persistence.
- Navigation.
- Review flags.
- Timer.
- Autosave.
- Session recovery.
- Submission.
- Server-side scoring.

Deliver the complete creation-to-result workflow.

### Phase 5 — Analytics

- Results dashboard.
- Question review.
- Subject analytics.
- Topic analytics.
- Time analytics.
- Progress history.

Use persisted data.

### Phase 6 — Learning Improvement

- Mistake notebook.
- Preparation tracker refinements.
- Revision scheduling.
- Weak-topic test generation.
- Fresh-question retesting.

### Phase 7 — Competitive System

- Standardized challenges.
- Private and public leaderboard settings.
- Ranking rules.
- Eligible peer benchmarks.

### Phase 8 — Polish and Production Hardening

- Accessibility audit.
- Responsive testing.
- Performance improvements.
- Error recovery.
- Security checks.
- Automated tests.
- Documentation.
- Deployment configuration.

At the end of each phase:

1. Summarize changes made.
2. List created/modified files.
3. Run applicable checks.
4. Fix discovered issues.
5. Record incomplete work honestly.
6. Continue to the next phase when possible.

Do not replace implementation with a phase-by-phase narrative.

---

## 30. CODE QUALITY EXPECTATIONS

Use clean, maintainable, production-oriented code.

Requirements:

- Strong TypeScript types.
- Clear separation of concerns.
- Reusable UI components.
- Small focused modules.
- Centralized scoring rules.
- Centralized exam blueprint configuration.
- Centralized question eligibility logic.
- Consistent validation.
- Meaningful error messages.
- Secure data access.
- Testable business functions.
- No unnecessary dependencies.
- No unexplained magic numbers.
- No silent fallback to fake data.
- No hardcoded test results.
- No placeholder implementation described as complete.

Add comments where important business rules are not obvious.

Avoid excessive abstraction.

Prefer simple working code over unnecessarily elaborate architecture.

---

## 31. REQUIRED DOCUMENTATION

Create:

README.md

Include:

- Product overview
- Technical stack
- Prerequisites
- Installation commands
- Environment variables
- Database setup
- Migration instructions
- Seed instructions
- Development server command
- Testing commands
- Production build instructions
- Deployment notes

Also provide:

- Database schema explanation
- Major architecture decisions
- Test generation rules
- Scoring rules
- Question import format
- Admin setup instructions
- Known limitations
- Future feature roadmap

Create documentation that allows another developer to run and maintain the application.

---

## 32. DEFINITION OF DONE

The initial working product must allow a real user to complete this journey:

1. Open the application.
2. Register or log in.
3. Complete basic onboarding.
4. Navigate to the dashboard.
5. Open the custom test builder.
6. Select Class 11 Chemistry.
7. Select the entire Mole Concept chapter.
8. Select only Atomic Models and Bohr's Model from Atomic Structure.
9. Choose a supported question count.
10. Choose practice or NEET-pattern mode.
11. Configure available difficulty and timing settings.
12. Generate a test consisting exclusively of eligible approved questions.
13. Attempt questions.
14. Navigate between questions.
15. Mark questions for review.
16. See the timer.
17. Have responses persist.
18. Submit the test.
19. Receive accurately calculated results.
20. Review incorrect answers with explanations.
21. See topic-wise and time-wise analysis.
22. Add a mistake to revision.
23. Reopen the dashboard and see the persisted test result.

The admin must also be able to create, review, and approve new questions.

The system must refuse impossible test configurations without silently compromising topic selection.

If all these actions work with real database-backed data, the first release has a valid functional foundation.

---

## 33. BEGIN EXECUTION NOW

First:

1. Inspect the project directory and determine whether an application already exists.
2. Check the applicable official NEET syllabus reference and document assumptions.
3. Define the architecture and database schema.
4. Create the Next.js project foundation.
5. Implement the design system.
6. Implement authentication and the initial database.
7. Begin the core syllabus and custom test builder.
8. Continue building the functional test workflow.

Give a concise initial architecture summary, then start creating the actual source files.

Make reasonable technical decisions without repeatedly asking for confirmation.

The application should be genuinely functional, visually polished, academically useful, and maintainable.

The ultimate goal is not merely to build an online MCQ website.

**Build a personalized NEET assessment platform that connects each student's current syllabus progress to custom testing, reliable performance analysis, and measurable learning improvement.**
