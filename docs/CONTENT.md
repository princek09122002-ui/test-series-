# Content operations

## Editorial flow

1. Create a question under `/admin/questions/new` with exactly four options and one zero-based correct option.
2. Map at least one primary topic, plus all required prerequisite concepts in the same syllabus version.
3. Supply an educational explanation, language, difficulty, source, and rights status.
4. Preview formatting and optional diagrams. Use `$...$` or `$$...$$` for KaTeX math.
5. Save the Draft, submit it for review, and have an administrator approve it under `/admin/review`.

Only active APPROVED questions are eligible for new tests. Editors can edit their own content; only administrators publish, reject, or archive it. Edits create another version and return to Draft. Archiving stops future selection while preserving historical attempts.

## Bulk JSON import

The Question Bank screen accepts a local JSON file or pasted JSON. The request limit is 1 MB; the UI file limit is 900 KB, with at most 100 questions per import. The entire import is validated and transacted: any invalid question rolls back the batch. All imported questions start as drafts.

Use [question-import.example.json](question-import.example.json). Replace chapter and topic IDs with IDs from Admin → Syllabus & coverage. Primary topic IDs must belong to the selected chapter. Prerequisites may be from another chapter in the same syllabus version. Correct options are **0=A, 1=B, 2=C, 3=D**.

Required fields: `text`, `options` (four strings), `correctOption`, `explanation`, `chapterId`, `topicIds`, `difficulty`, `language`, `source`, `license`, and `tags`. Optional/defaulted fields: `prerequisiteIds` and `media`.

Allowed difficulties: EASY, MEDIUM, HARD. Allowed languages: en, hi. Rights status: ORIGINAL, LICENSED, PUBLIC_DOMAIN. The importer does not verify rights claims on behalf of the editorial owner.

Question text is plain text with safe math, not arbitrary HTML. Media references must use HTTPS and include alt text. No server-side URL fetch, binary executable upload, or HTML import is provided. Supply your own durable, authorized media hosting.

## Reported errors and rescoring

Students report issues from result review. Administrators record resolution notes under Reports and publish corrected bank content through versioned editing/reapproval.

Past attempts are unaffected by an ordinary edit. For a confirmed wrong key in a historical version, use Admin Settings → Explicit historical rescore. Specify the original question ID, affected version, correct option, and reason. Finish active affected attempts first. An audit entry retains prior snapshots, prior scores, and prior analytics. Results visibly display the correction reason. This first implementation corrects a single answer key; dropped-question and multiple-correct special rulings require a future policy extension rather than silently improvising marks.
