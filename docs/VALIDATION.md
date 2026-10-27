# Validation record — 27 October 2026

- `npm run build`: passed, Vite production assets generated.
- `npm test`: 3 tests passed, 0 failed, 0 skipped.
- MongoDB integration ran against a real MongoDB 8.0.16 single-node replica set, not an in-memory JavaScript database or mocked collection.
- Two simultaneous requests for one equipment/time slot produced one 201 Created and one 409 Conflict.
- Verified registration, duplicate-email rejection, session cookies, invalid login input, ownership restrictions, staff-only actions, premature checkout rejection, checkout/return lifecycle, duplicate return rejection, history, adjacent windows, active quota, cancellation release, public availability privacy, invalid resource ID, cross-origin rejection, and session revocation.
- `npm install` reported zero dependency vulnerabilities at install time.
- `npm run demo` started successfully with a real local MongoDB and seeded users.
- The initial local browser inspection was denied by the origin approval gate. After connecting Edge, the public deployment was inspected visually; desktop catalog rendering, photography filtering, and Arduino search passed. Mobile layout has not been verified in a browser.
- Public deployment: https://campusslot-ljo6.onrender.com on Render's free Node service with MongoDB Atlas's free replica-set cluster in a dedicated CampusSlot project.
- Render build fix: explicitly install development dependencies to make Vite available with `NODE_ENV=production`, while suppressing the unused test MongoDB binary download.
- Live `node scripts/smoke.js https://campusslot-ljo6.onrender.com --write` passed: database health, six catalog resources, anonymous session, registration, HttpOnly/Secure cookies, saved reservation, cancellation, activity history, and logout. One synthetic Deployment QA account and cancelled reservation remain as validation records.
- The Atlas application user has read/write access rather than Atlas administrator access. Only the user's existing local IP and the two approved Render outbound CIDRs are in the network allowlist. No connection secret is tracked in Git.
- Docker image validation, a service-restart persistence check, private-window link checks, hosted staff account provisioning, video recording, and official form submission remain to be completed.

The test runner's first run requires a MongoDB binary download. Subsequent runs reuse the installed binary. Integration databases are temporary and separate from the local demo database.
