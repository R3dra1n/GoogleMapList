# v1.2.4 — 2026-10-09

The approved homepage combines the warm white/green palette with a full-width photo hero. Country shortcuts use two rules and text links. Creator cards follow Daily Discoveries without a section background.

The existing same-origin Firebase account menu remains active: logged-out visitors see sign-in/registration; signed-in visitors get profile, lists and logout. A static sign-in link remains visible before JavaScript initializes.

Homepage configuration is editable in Decap under 首頁版面設定: selected list supplies the hero image and credit; country shortcuts are ordered CMS selections; localized titles and descriptions are optional. Missing/unpublished hero selection falls back to an available public image. Country shortcuts open destination pages.

Validation: 72 unit/API tests and browser integration covering logged-in avatar menu, logout, published creator/list display, single creator section after rerender, country routes, mobile width, English and dark mode. Build succeeded. No database migration or billing changes.

Backup: .backups/release-1.2.4/history.bundle and v1.2.3-source.tar; previous tag v1.2.3 and Worker f6e1f391-c94a-48b8-bf4e-6f0725a6ac6d.
