# Validation record — 27 October 2026

- `npm run build`: passed, Vite production assets generated.
- `npm test`: 3 tests passed, 0 failed, 0 skipped.
- MongoDB integration ran against a real MongoDB 8.0.16 single-node replica set, not an in-memory JavaScript database or mocked collection.
- Two simultaneous requests for one equipment/time slot produced one 201 Created and one 409 Conflict.
- Verified registration, duplicate-email rejection, session cookies, invalid login input, ownership restrictions, staff-only actions, premature checkout rejection, checkout/return lifecycle, duplicate return rejection, history, adjacent windows, active quota, cancellation release, public availability privacy, invalid resource ID, cross-origin rejection, and session revocation.
- `npm install` reported zero dependency vulnerabilities at install time.
- `npm run demo` started successfully with a real local MongoDB and seeded users.
- Browser inspection was attempted but access to the local origin was denied by the browser approval gate. Responsive layout and visual appearance remain unverified in a browser.
- Docker/Render configurations were provided but no container deployment or public service has been run here. Atlas-backed deployment, service restart persistence checks, private-window link checks, video recording, and official form submission remain to be completed.

The test runner's first run requires a MongoDB binary download. Subsequent runs reuse the installed binary. Integration databases are temporary and separate from the local demo database.
