# Demo video script — 3–5 minutes

Record the actual running application. Use a disposable demonstration database. Keep secrets, browser account menus, terminal environment values, and Atlas connection strings out of the recording.

1. **0:00–0:30 — Problem:** “I'm Darshan. CampusSlot helps students borrow campus equipment without conflicting bookings, and helps coordinators track approvals and returns.” Show the catalog.
2. **0:30–1:15 — Discovery:** filter Photography, search a camera, inspect reserved windows, then sign in as a student. Request a short future slot with a clear purpose. Show the pending booking and history.
3. **1:15–2:00 — Conflict protection:** in another student browser session, attempt an overlapping booking for the same item. Show the rejection and choose a non-overlapping slot. Explain that the backend enforces this transactionally, even for simultaneous requests.
4. **2:00–3:00 — Coordinator workflow:** sign in as staff in a separate browser profile. Approve the request before its start. Once the short scheduled window begins, check out the item. Show the student's status and event history updating after Refresh.
5. **3:00–3:45 — Returns and fairness:** record the return, show the complete history, and explain the three-active-booking cap, seven-day duration, ownership checks, and overdue filter. Demonstrate cancellation releasing another future slot if time permits.
6. **3:45–4:30 — Engineering and handoff:** briefly show the architecture diagram and test output. Mention MERN, persistent MongoDB, hashed sessions/passwords, role authorization, and transaction-based conflict protection. Finish on the deployed app and repository links.

Prepare pickup times a few minutes ahead so you can approve before start and check out during the window. Do not claim a workflow was tested or deployed unless you actually demonstrate it. Upload the video to an evaluator-accessible location and check its permissions in a private browser window.
