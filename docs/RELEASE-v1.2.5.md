# v1.2.5 — 2026-10-09

- Rename CMS author records to 編輯部作者資料 to distinguish curated GitHub profiles from self-registered D1 members. These records do not grant administrator permissions.
- Add an editor-only, read-only member overview to admin tools: total site members, joined within 30 days, public creators, public lists, suspended users, searchable/paginated member records. Counts include users who completed verified site sign-in, not unverified Firebase-only registrations.
- Member endpoint is behind existing GitHub repository push-permission authorization. It excludes session secrets and does not modify users.
- Homepage hero selection becomes a named searchable dropdown of published editorial lists with cover images. Preserve legacy values when unpublished; load failure never clears the selection.
- Fix homepage preSave incorrectly requiring a content name/folder.
- No database migration. Previous source tag v1.2.4; previous Worker 96067b97-5c43-4915-9564-dd3afbb9cce1.

Validation: 75 unit/API tests including editor authorization, metrics semantics and homepage save; member panel browser checks for search, safe text rendering and clearing data after errors. Authenticated live CMS save is not automated.
