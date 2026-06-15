# Donatus Prince - Woven assessment notes

These are the notes I used for the Woven technical assessment. They cover the user creation bug from Ticket #9584, the pull request review on the audit settings repo, the RBAC exercise, and the references I used while preparing the appeal.

---

## Appeal to the Woven team

Hi Woven Team,

Thank you for following up. I wanted to share how I worked through the assessment.

### Exercise 1: User creation and social media enrichment

I reproduced the failing cases first, then compared the working and failing emails. The failure came from `SocialMediaProfiles.saveProfiles()`. That method builds SQL with string interpolation instead of parameterized queries.

The failing profile data included apostrophes in normal user-facing text, such as `Guac Lover's Club`, `Don't Stop Dancing`, and `Squad Goals '22`. Those apostrophes broke the INSERT statement. The save returned `{ success: false }`, and user creation failed with a 500 for customers who had social enrichment turned on.

I did not treat `CreateUserProfile.beforeCreate()` as the root cause. That method is only passing through `result.success`. The real fix belongs in `saveProfiles`, where the write should use parameterized queries or an ORM so real profile names and bios are handled safely.

My process was:

1. Run the provided tests.
2. Compare the working and failing emails.
3. Inspect the enriched profile data.
4. Notice the apostrophes in the failing records.
5. Read `saveProfiles` and find the string-built SQL.
6. Document the fix for both engineering and support.

### Exercise 2: Pull request review - Add audit table settings

Repo: [woven-reviews/audits-node-react-hooks-backend-amdonatusprince-97314](https://github.com/woven-reviews/audits-node-react-hooks-backend-amdonatusprince-97314)  
Pull request: [#1 Add audit table settings](https://github.com/woven-reviews/audits-node-react-hooks-backend-amdonatusprince-97314/pull/1)

This was a timeboxed code review. I did not pull the branch locally. I read the diff on GitHub and left inline comments as I went, because access to the repo expires when the timer ends.

Stack: Node, Express, Massive, node-pg-migrate, PostgreSQL.

My verdict was **request changes**. The settings-table direction made sense, but I found blockers around SQL safety, migration data loss, and filter logic.

**Why this connects to Exercise 1**

Both exercises involve the same failure mode: building SQL by interpolating user-controlled or API-controlled text instead of using parameterized queries. In Exercise 1 the symptom was apostrophes in social profile names. In this PR the regression was in audit list filters (`message`, `status`).

### Exercise 3: Role-based access control

For the RBAC exercise, I implemented `listPermissions(userId)` and `checkPermitted(permissionName, userId)` by resolving the user's roles, filtering to permissions where `active === true`, and using a `Set` for role lookups.

I also covered the edge cases I would expect in production: inactive permissions, users with no roles, users with multiple roles, unknown roles, and missing permission names.

### Why the answer may look familiar

These exercises come from a standardized assessment. The social media bug has a common and well-known fix: do not build SQL by interpolating untrusted text. The RBAC solution also naturally converges on the same shape: map roles to permissions, filter active entries, and combine permissions across roles.

My write-up follows the evidence from the tests and common engineering guidance from OWASP, database docs, and similar public debugging discussions. It was not copied from another submission.

Best regards,  
Donatus Prince

---

## Email to Casey

**From:** Donatus Prince  
**To:** Casey  
**Subject:** re: User creation error

Hey Casey,

I reproduced the user creation failures with the test cases you pointed me to.

The issue is in `SocialMediaProfiles.saveProfiles()`. It concatenates platform, `display_name`, and `bio` into a SQL string with template literals. When the enrichment API returns text with apostrophes, for example `Guac Lover's Club`, `Don't Stop Dancing`, or `Squad Goals '22`, the INSERT becomes invalid.

That failed write returns `{ success: false }`. `CreateUserProfile.beforeCreate()` then returns `false`, which is why users with social enrichment enabled can hit a 500 during create.

The working emails return profile text without apostrophes. The failing emails all include at least one apostrophe in an enriched field, which is common in real social profile data.

Recommended fix in `saveProfiles`:

1. Use parameterized queries or an ORM. Do not interpolate third-party API data into SQL.
2. Log save failures so we can see which profile row failed and why.
3. Decide whether user creation should fail if enrichment fails, or whether we should create the user and save partial enrichment.

I also verified the approach locally with a parameterized reference implementation. All five test emails save successfully once string-built SQL is removed.

Thanks,  
Donatus

---

## Ticket #9584 comment for Tamara

Hi Tamara,

We traced the 500 during user creation to the social media enrichment step. When enriched profile text contains an apostrophe, which is common in names and bios, our database save fails. Customers with enrichment turned off are not affected.

**Workaround:** Disable social media enrichment for new user creation until engineering ships the fix.

**Next step:** Engineering is switching the save logic to parameterized database writes. I will update this ticket once the patch is ready.

Thanks,  
Donatus

---

## Investigation log for Exercise 1

1. Ran the tests. `flowerchild@60s.com` and `programmer@gizmo.com` passed. `avocado@hipmail.com`, `squadgoals@gmail.com`, and `defaultdance@fortnitefan.com` failed.
2. Checked `fetchSocialProfiles` for the failing emails. Each one had an apostrophe in `display_name` or `bio`.
3. Read `saveProfiles`. The SQL was built with template literals.
4. Confirmed the fix with parameterized saves. All five emails succeeded.

---

## PR review notes for Exercise 2

### Scenario

A colleague opened PR #1 to add audit table settings: move user preferences into a `settings` table, add `audit_table_default_rows`, and update audit filtering in the backend.

Constraints from the exercise:

- Timeboxed - review from the GitHub diff only.
- Add **single-line comments on the diff** as you review, not one long comment at the end.
- Repo access expires when the challenge timer ends.

### Overall summary I would post on the PR

Thanks for the context. The settings-table direction makes sense for `audit_table_default_rows`. I focused on correctness, security, and deploy safety.

**Blockers before merge**

1. **SQL injection** in `src-server/components/audits/index.js`: filter values are interpolated into the query string. This regresses from the earlier parameterized `$1` approach.
2. **Data migration gap**: the migration drops `users.daily_email_updates` without backfilling into `settings`, so existing users lose that preference on deploy.
3. **Filter logic**: `else if` prevents filtering by message and status together. The PR description says both should work.

**Should fix**

1. Remove debug `console.log` calls from server code.
2. Empty migration `down`: rollback cannot restore state.
3. `settings.update` still missing `return await`, so the PUT route may return `undefined`.
4. New test only asserts HTTP 200; it does not cover filters or the settings migration.

**Nice to have**

1. Seed or migration should create default `settings` rows, including `audit_table_default_rows`, so the UI does not read `undefined` from `settings.data[0]`.

**Decision:** Request changes. Security and migration data loss are blockers.

### Inline comments I prepared for the diff

`**src-server/components/audits/index.js`**

- On `message ILIKE '%${filters.message}%'`: Critical. User-controlled `filters.message` is concatenated into SQL. Use parameterized values, for example `message ILIKE $1` with `['%' + message + '%']`.
- On `status='${filters.status}'`: Same for `status`. Use a parameter such as `status = $2`. Validate against an allowlist of enum values.
- On `} else if (filters.status !== undefined) {`: Logic bug. `else if` ignores status when `message` is set. Use separate `if` blocks joined with `AND` so both filters can apply.
- On `console.log('filterParts:'` / `console.log('query:'`: Remove debug logging before merge.
- General on `module.get`: Pagination still happens client-side after fetching the full audits table. Worth noting for production scale.

`**migrations/1655387633000_add-settings-table.js`**

- On `pgm.dropColumns('users', ['daily_email_updates'])`: Data loss on deploy. Backfill `settings` from `users` before dropping the column, for example `INSERT INTO settings (user_id, daily_email_updates, audit_table_default_rows) SELECT id, daily_email_updates, 10 FROM users`.
- On `audit_table_default_rows` with no default: Add a default such as `10` and/or `notNull` so the audits UI gets a sane page size.
- On empty `exports.down`: Implement rollback to restore `users.daily_email_updates` and drop `settings`.

`**src-server/components/settings/index.js**`

- On dynamic `INSERT INTO settings (${field}, user_id)`: `field` comes from the route param. Use an allowlist (`daily_email_updates`, `audit_table_default_rows`) instead of interpolating column names.
- On `module.update` without `return`: Add `return await db.query(...)` so PUT returns JSON.
- After migration, `GET /api/settings` may return zero rows for users who never saved settings. Frontend reads `settings.data[0].audit_table_default_rows`, so consider a default row on signup or a default in the API.

`**src-server/routes/api/audits.js**`

- On `const filters = (req.body.q && req.body.q.filters) || {}`: Good defensive fix for missing `q`.

`**src-server/components/audits/index.test.js**`

- Test only checks 200, not filter behavior or settings integration. Add cases for message filter, status filter, and combined filters once the `else if` bug is fixed.

### If I only had two minutes on the PR

I would still leave these three comments:

1. `audits/index.js`: use parameterized queries; do not interpolate `message` or `status`.
2. `audits/index.js`: replace `else if` with independent conditions for message and status.
3. `migrations/...add-settings-table.js`: backfill `settings` from `users` before dropping the column.

That shows security awareness and deploy safety under time pressure.

### References for the PR review approach

**SQL injection in dynamic WHERE clauses (Node / PostgreSQL)**

- [https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [https://node-postgres.com/features/queries](https://node-postgres.com/features/queries)
- [https://stackoverflow.com/questions/44959154/insert-data-to-a-sql-server-database-that-contains-apostrophes](https://stackoverflow.com/questions/44959154/insert-data-to-a-sql-server-database-that-contains-apostrophes)

**Safe database migrations (backfill before drop)**

- [https://www.postgresql.org/docs/current/ddl-alter.html](https://www.postgresql.org/docs/current/ddl-alter.html), altering tables and data-preserving changes
- [https://node-pg-migrate.readthedocs.io/](https://node-pg-migrate.readthedocs.io/), migration up/down expectations

---

## RBAC notes for Exercise 3

### Approach

- `listPermissions(userId)`: find the user, return `[]` if the user is missing or has no roles, build a `Set` of the user's roles, then return active permission names where the permission role is in the set.
- `checkPermitted(permissionName, userId)`: resolve the user and role set the same way, then return whether any active permission matches both the permission name and one of the user's roles.

### Cases I verified

- Single role, Ryder as `rider`: returns two permissions.
- Multiple roles, Charles N. Charge as `charger` and `rider`: returns the combined permissions.
- Inactive permission, `purchase widgets` for `superuser`: excluded.
- No roles, Unregistered Ulysses: empty list and not permitted.
- Unknown role, `beta tester`: no permissions.
- Missing permission name: `checkPermitted` returns false.

All 8 authorization tests pass with `npm run test:auth`.

---

## References supporting my approach

### Exercise 1: Apostrophes and SQL concatenation

The assessment scenario, including Ticket #9584, Casey, Tamara, `TestSomeUsersThatWork`, and `TestSomeUsersThatFail`, is a published standardized debugging exercise. That helps explain why correct analyses land on the same root cause.

**Apostrophes break concatenated SQL**

- [https://stackoverflow.com/questions/1912095/how-to-insert-a-value-that-contains-an-apostrophe-single-quote](https://stackoverflow.com/questions/1912095/how-to-insert-a-value-that-contains-an-apostrophe-single-quote)
- [https://stackoverflow.com/questions/26085339/cannot-insert-text-having-apostrophe-into-sql-server-table](https://stackoverflow.com/questions/26085339/cannot-insert-text-having-apostrophe-into-sql-server-table)
- [https://stackoverflow.com/questions/44959154/insert-data-to-a-sql-server-database-that-contains-apostrophes](https://stackoverflow.com/questions/44959154/insert-data-to-a-sql-server-database-that-contains-apostrophes)
- [https://stackoverflow.com/questions/6796736/special-character-in-varchar-in-sql](https://stackoverflow.com/questions/6796736/special-character-in-varchar-in-sql)

**Fix: parameterized queries**

- [https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [https://owasp.org/www-community/Injection_Theory](https://owasp.org/www-community/Injection_Theory)
- [https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)
- [https://node-postgres.com/features/queries](https://node-postgres.com/features/queries)
- [https://docs.python.org/3/library/sqlite3.html](https://docs.python.org/3/library/sqlite3.html)
- [https://blog.codinghorror.com/give-me-parameterized-sql-or-give-me-death/](https://blog.codinghorror.com/give-me-parameterized-sql-or-give-me-death/)

**Why plain JavaScript template literals in SQL are unsafe**

- [https://github.com/porsager/postgres/blob/master/README.md](https://github.com/porsager/postgres/blob/master/README.md)
- [https://github.com/blakeembrey/sql-template-tag](https://github.com/blakeembrey/sql-template-tag)

**Real-world parallel: user create fails from a database layer error**

- [https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB)

### Exercise 2: PR review (audit settings)

- [https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [https://node-postgres.com/features/queries](https://node-postgres.com/features/queries)
- [https://node-pg-migrate.readthedocs.io/](https://node-pg-migrate.readthedocs.io/)

### Exercise 3: RBAC

**Role to permission lookup**

- [https://frontendmasters.com/courses/permission-systems/rbac-permissions/](https://frontendmasters.com/courses/permission-systems/rbac-permissions/)
- [https://devsofus.com/security/authorization](https://devsofus.com/security/authorization)
- [https://oneuptime.com/blog/post/2026-01-30-api-authorization-patterns/view](https://oneuptime.com/blog/post/2026-01-30-api-authorization-patterns/view)
- [https://csrc.nist.gov/projects/role-based-access-control](https://csrc.nist.gov/projects/role-based-access-control)

---

## Local reproduction

```bash
cd test-interview
npm install
npm test
npm run test:auth
```

