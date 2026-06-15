# Sunday interview prep notes

This folder is the prep workspace for the Karat-style technical interview. Start here if you need the quick version, then open `YOUR_NOTES.md` for the Casey email, Tamara ticket comment, PR review notes, and appeal notes.

---

## Folder layout

```text
test-interview/
|-- SUMMARY.md              # this file
|-- README.md               # Exercise 1 quick reference
|-- YOUR_NOTES.md           # Casey email, Tamara comment, PR review, appeal
|
|-- Exercise 1: Social media user creation
|   |-- preloaded.ts        # third-party mock, read-only in the real interview
|   |-- solution.ts         # CreateUserProfile.beforeCreate starter code
|   |-- solution.test.ts    # Mocha and Chai tests
|   |-- preloaded_fixed.ts  # reference fix with parameterized saves
|   |-- *.py                # original Python versions kept for reference
|
|-- Exercise 2: PR review
|   `-- documented in YOUR_NOTES.md only
|
`-- Exercise 3: Role-based access control
    |-- authorization.ts    # TypeScript solution
    |-- authorization.test.ts
    |-- authorization.js    # plain JS version for the interview editor
    |-- authorization.test.js
    `-- rbac-data-structures.png
```

## Exercise 1: Ticket #9584, cannot create new users

### Scenario

New user creation can enrich a user with social media profiles from a third-party API. Some customers get an HTTP 500 during create, and the common factor is that social enrichment is enabled.

**Working emails:** `flowerchild@60s.com`, `programmer@gizmo.com`  
**Failing emails:** `avocado@hipmail.com`, `squadgoals@gmail.com`, `defaultdance@fortnitefan.com`

### Starter code from the interview

```javascript
class CreateUserProfile {
  static beforeCreate(email) {
    var profiles = SocialMediaProfiles.fetchSocialProfiles(email);

    var result = SocialMediaProfiles.saveProfiles(profiles);

    return result.success;
  }
}
```

### Root cause

`SocialMediaProfiles.saveProfiles()` builds SQL with string interpolation instead of parameterized queries. When enriched profile text contains an apostrophe, such as `Guac Lover's Club`, `Don't Stop Dancing`, or `Squad Goals '22`, the INSERT becomes invalid. The save fails, returns `{ success: false }`, and that failure bubbles up as a 500.

`CreateUserProfile.beforeCreate()` is not the bug. It is doing what the starter code says: returning `result.success`. The actual fix belongs in `saveProfiles` or whatever database layer owns the profile insert.

### How I would investigate it in the interview

1. Run the tests and confirm that the working emails pass while the failing emails return `false`.
2. Inspect `fetchSocialProfiles` for the failing emails.
3. Notice that the failing records contain apostrophes in `display_name` or `bio`.
4. Trace `saveProfiles` and find the string-built SQL.
5. Confirm that parameterized saves fix all five test emails.

### Recommended fix

- Use parameterized queries or an ORM.
- Do not interpolate third-party API data into SQL.
- Log save failures so debugging is easier next time.
- Make a product decision on whether enrichment failure should block user creation or allow partial enrichment.

### Communication deliverables

See `YOUR_NOTES.md` for:

- Email to Casey with the technical root cause and fix recommendation.
- Ticket #9584 comment for Tamara with the customer-facing workaround.

### Run tests

```bash
cd test-interview
npm install
npm test
python3 -m unittest test_solution.py -v
```

Expected before the fix: `test some users that work` passes, and `test some users that fail` fails.

---

## Exercise 2: PR review - Add audit table settings

**Repo:** [https://github.com/woven-reviews/audits-node-react-hooks-backend-amdonatusprince-97314](https://github.com/woven-reviews/audits-node-react-hooks-backend-amdonatusprince-97314)  
**PR:** #1, audit table settings. This was a timeboxed GitHub diff review with no local checkout.

Stack: Node + Express + Massive + node-pg-migrate + PostgreSQL.

**Verdict:** Request changes.

**Top blockers**

1. SQL injection in `audits/index.js`: `message` and `status` are interpolated into SQL, which regresses from the earlier `$1` parameter approach.
2. Migration drops `users.daily_email_updates` without backfilling `settings`.
3. `else if` prevents using message and status filters together.

Full inline comments and references are in `YOUR_NOTES.md`.

---

## Exercise 3: Managing user permissions

### Scenario

The app has users, roles, and permissions. Users can have multiple roles. The permissions table maps a role to a permission name and includes an `active` flag.

Implement:

1. `listPermissions(userId)`: return all active permission names for that user.
2. `checkPermitted(permissionName, userId)`: return whether that user has the active permission.

### Solution pattern

```javascript
listPermissions(userId) {
  const user = this.users.find(u => u.id === userId)
  if (!user || user.roles.length === 0) return []

  const roles = new Set(user.roles)
  return this.permissions
    .filter(p => p.active && roles.has(p.role))
    .map(p => p.name)
}

checkPermitted(permissionName, userId) {
  const user = this.users.find(u => u.id === userId)
  if (!user || user.roles.length === 0) return false

  const roles = new Set(user.roles)
  return this.permissions.some(
    p => p.active && p.name === permissionName && roles.has(p.role)
  )
}
```

### Edge cases covered by tests

- User with one role: returns the correct permissions.
- User with multiple roles: returns the union of permissions from all roles.
- Inactive permissions: excluded.
- User with no roles: empty list and not permitted.
- User with an unknown role, such as `beta tester`: no permissions.
- Permission name that does not exist: `checkPermitted` returns false.

### Run tests

```bash
npm run test:auth
npm run test:auth:js
```

All 8 authorization tests should pass.

---

## Quick command reference


| Command                | What it runs                 |
| ---------------------- | ---------------------------- |
| `npm test`             | Social media debugging tests |
| `npm run test:auth`    | RBAC TypeScript tests        |
| `npm run test:auth:js` | RBAC JavaScript tests        |


