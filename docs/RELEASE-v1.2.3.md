# v1.2.3 — 2026-10-08

- Email registration now shows progress and delivery feedback beside the form, with duplicate actions disabled while pending. If account creation succeeds but delivery fails, verification controls remain available for resend.
- Account pages follow the homepage's saved light/dark/system preference, with live system theme changes and dark form/profile styling.
- Production recommendations post directly to the same-origin API rather than resolving configuration through the GitHub CMS redirect. Local/GitHub previews retain configuration lookup.
- Recommendation submission provides immediate and slow-connection feedback, a 15-second timeout, preserved input and the same idempotency ID for unchanged retries.
- No database migration, billing change, or account data changes.

Validation: 69 unit/API tests; mocked Firebase browser flow including failed mail delivery/resend, Google sign-in, profile persistence, mobile and theme changes; recommendation browser test including timeout, unchanged retry ID and success. Real mail delivery latency is provider-dependent and was not tested by sending mail to users.

Rollback: previous source tag v1.2.2 and Cloudflare deployment history. Do not restore an old database snapshot for this UI release.

Design recommendation: retain existing cards, strengthen the homepage with one editorial hero image and clear type hierarchy, compact destination shortcuts, and contrasting creator section spacing. A full homepage redesign is not included in this focused fix.
