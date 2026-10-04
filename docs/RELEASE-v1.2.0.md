# v1.2.0 release — 2026-10-04

- Production origin: https://pocket-atlas-auth.huayang-hsu.workers.dev/
- GitHub Pages homepage/list/creator links redirect preserving query and hash. CMS remains at its original GitHub origin, preserving OAuth configuration.
- Worker serves bundled frontend; editorial data.json and assets read GitHub publication with bundled fallback. Community and sessions stay same-origin.
- Build targets: npm run build produces GitHub redirect pages; SITE_DEPLOY_TARGET=worker npm run build produces full site. npm run deploy:auth selects worker target.
- Version 1.2.0. Registration remains open. No new paid service.
- Backups: .backups/release-1.2.0/history.bundle, v1.1.0-source.tar, preview16-workspace.tar.gz, database.sql. Private local files excluded from Git, permissions 600. Do not upload database backup to GitHub.
- Prior Worker deployment: 1bf3f717-c66c-45cc-a826-84c4389ce670. Roll back Worker with wrangler rollback to this ID; GitHub previous production source tag v1.1.0. Preserve current D1 data when rolling back code; do not blindly restore old DB over new user writes.
- 67 unit/API checks passed; browser integration and mocked Firebase registration/login/save/logout passed. Real Google consent and iOS/Android provider UI are not covered by mocked browser checks.
- Known follow-ups remain in RELEASE-READINESS-2026-10-04.md: self-service account deletion/moderation UI, session renewal and identity linking. This release does not claim those features.
