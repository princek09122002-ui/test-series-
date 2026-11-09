# Implementation scope and roadmap

## Implemented

The repository contains the application foundation, versioned syllabus/question bank, granular custom builder, persisted exam workflow, results and analytics, mistake notebook, revision scheduling, standardized public/private challenges, staff/admin content tools, permissions, audit logs, migrations, reproducible demonstration content, and automated checks.

All displayed student statistics derive from persisted activity. New accounts have empty states. Unavailable full mocks return real content shortages. Optional Google/email features require configuration; optional AI remains disabled.

## Content and production limits

- The development bank contains 68 illustrative original questions and a partial taxonomy. Full official curriculum mapping, professional academic review, Hindi question coverage, licensed media, and sufficient questions for complete mocks are content work still required before public launch.
- Timing is a foreground interaction estimate, not secure proctoring or an anti-cheating guarantee.
- Same-tab pending answers survive refresh using session storage. Unsynced data cannot survive device loss, cleared browser storage, or closing an offline tab; the UI warns on unsynced departure. PostgreSQL-persisted answers can be resumed from another device.
- Revision recall reports are self-reported. Fresh question tests are available using the Unseen filter; the app does not equate repeated answers or a marked-complete topic with measured mastery.
- Shared challenges support invitation-only papers; a reusable friend-group membership/social system is not included.
- The historical correction tool supports an explicitly corrected single answer key. Special NTA dropped-question/multiple-correct rulings need a versioned policy extension.
- Long question lists are paginated. History and aggregates currently read account-scoped attempts directly; very large histories should add paginated history, bounded analytics jobs, and rebuilt materialized aggregates after measured need.
- Admin user/report lists are bounded to 100 recent records; production-scale management needs additional search/pagination.
- Media upload means validated JSON and authorized HTTPS diagram references. Binary object-storage uploads require a configured storage provider and malware/rights review policy.
- Google OAuth and external email delivery need live provider credentials for end-to-end operational verification.
- No exam-rank predictor, calibrated IRT model, population averages, or universal custom-test rankings are claimed.

## Next priorities

1. Academic review and complete versioned official syllabus/question coverage.
2. Hindi content, richer accessible scientific diagrams, and content coverage tooling at scale.
3. Retention evidence from fresh equivalent items, validation of learning heuristics, and transparent confidence intervals.
4. Dedicated privacy/retention/export/deletion workflows appropriate to the production audience and jurisdiction.
5. Question import deduplication, advanced editorial assignment, and auditable special-scoring policies.
6. Reusable friend groups, invitation management, and standardized cohort benchmarks only with sufficient comparable data.
7. Operational monitoring, backup restoration drills, load tests, and independent security/accessibility review before a broad public launch.

## Verification

See the final task report for checks actually run in the development environment. Passing local checks establishes a working implementation; it does not replace content validation, live provider testing, or production operations.
