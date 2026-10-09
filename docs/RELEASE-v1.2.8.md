# v1.2.8

Unifies the visible product name as 口袋地圖 (口袋地图 in Simplified Chinese), brings account screens into the homepage green palette, shortens the mobile hero and removes redundant location tags. Homepage discoveries now require a cover, description and location; incomplete lists remain accessible in their owners' pages and search.

Adds public privacy, usage rules and contact pages, with account-data/deletion and content-review request categories. Contact submissions use the existing private, rate-limited recommendation inbox; no personal operator email is published. Requests require manual identity/rights verification and do not immediately delete accounts.

Adds GitHub-editor-only member list moderation. Admins can take a list down or restore it with a required reason; changes are version checked and audited. The independent block filters public feed, covers and statistics, and prevents an owner from republishing the same blocked list. Restore preserves the owner's original visibility. No permanent deletion or automatic moderation of existing content is performed. Firebase-only registrations remain visible in Firebase Console via a new admin link; the site member counter is explicitly scoped to verified users who have entered the site.

Deployment requires additive D1 migration 0008_list_moderation.sql before Worker deployment. Backup is under .backups/release-1.2.8 (private database export, never commit). Reverting Worker code does not require dropping the added tables; retaining them preserves moderation records, but older code does not enforce moderation blocks.

Validation: 77 unit/API tests; integration browser for homepage/account menu/logout and mobile; Firebase UI with mocked SDK for registration/verification/save and dark/mobile; contact form and moderation UI browser checks with mocked writes. Production sign-up emails and real member moderation are not exercised by these tests.

Creator outreach draft: creator-invitation-email.md. No email sent.
