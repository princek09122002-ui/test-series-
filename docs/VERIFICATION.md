# Verification record

Verified locally on **3 November 2026 (India time)** with Node.js 24, native PostgreSQL on loopback, and installed Google Chrome for browser checks.

| Check                                                                 | Result                                   |
| --------------------------------------------------------------------- | ---------------------------------------- |
| TypeScript strict checking                                            | Passed                                   |
| ESLint                                                                | Passed                                   |
| Unit suite                                                            | 25 passed                                |
| PostgreSQL integration suite                                          | 10 passed                                |
| Production-build Playwright suite                                     | 8 passed                                 |
| `npm run build`                                                       | Passed across all application/API routes |
| `npm audit --omit=dev`                                                | 0 reported production vulnerabilities    |
| Local credential authentication + authenticated dashboard smoke check | Passed                                   |
| Desktop, mobile (390px), and dark theme visual checks                 | Completed                                |

The 43 automated tests cover scoring/denominators, strict topic and prerequisite filtering, allocation feasibility, shortages, uniqueness, deadlines, revision intervals, real persistence, ownership, concurrent/idempotent submission, exposure filtering, content versions, audited rescoring, student creation/onboarding, the mixed chapter/topic builder, refresh recovery, automatic expiry, error review/revision, protected administrator operations, question creation/approval, and invitation-only challenge access/result embargo.

Browser tests use a uniquely named UTF-8 local test database and randomly generated run-specific accounts. They build and run a production server on port 3100. Development compilation timing and two form-control accessibility issues found during earlier runs were corrected before the passing run. The final source also passes the normal production build independently of the browser test output directory.

Screenshots are available locally under the ignored `.local/qa/` directory. Generated development secrets, database files, browser traces, dependencies, and build outputs are excluded from source control and the source archive.

Live Google OAuth, external password-reset email delivery, container image execution, production hosting, academic validation, load testing, and independent security review were not performed. The production dependency result is distinct from development-toolchain advisories. See [STATUS.md](STATUS.md) for the content and operational work required before a broad launch.
