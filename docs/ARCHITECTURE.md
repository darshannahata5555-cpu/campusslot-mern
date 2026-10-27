# Architecture and data model

The browser is a React client. Express owns all business rules. MongoDB is the only persistent application datastore. All collections use MongoDB ObjectIds; timestamps use BSON Dates.

| Collection | Fields and relationships |
| --- | --- |
| users | name, unique normalized email, password hash, role, version |
| sessions | unique hashed token, user_id, TTL-indexed expires |
| equipment | name, category, description, location, icon, active, version |
| bookings | user_id, equipment_id, start, end, purpose, status, created |
| activity | booking_id, actor_id, action, created |

The version counters are deliberate writes, not optimistic concurrency tokens sent to the client. MongoDB's transaction write-conflict detection serializes booking decisions. The official driver's `withTransaction` retries transient conflicts. Activity and state changes commit together. Any thrown business error aborts the transaction.

Conflict query: `existing.start < requested.end && existing.end > requested.start`, for the same equipment in pending/approved/checked_out state. Returning or cancelling removes that state from conflict calculations. A late physical return also prevents the next checkout even if the scheduled windows do not overlap.

## Permissions

Anyone may see the catalog and reserved dates. Only authenticated users can create requests. Students see only their own booking records; booking history separately checks ownership. Staff see all bookings and can perform permitted lifecycle actions. Students cannot promote themselves through registration. A trusted CLI provisions staff.

## Error contract

JSON errors use `{ "error": "Readable message" }`. Validation failures return 400; unauthenticated requests 401; forbidden state/role operations 403; missing records 404; duplicate email, overlap, quota, or timing conflicts 409. Unexpected errors return a generic 500 response. The UI displays network, validation, and conflict messages and disables submissions while waiting.

## Reliability tradeoffs

Pending requests hold slots to avoid two coordinators approving incompatible requests. This requires coordinators to reject abandoned requests. Approval after the scheduled start is rejected. Checkout is only possible during the reservation window. Overdue is derived at read time. There is no background scheduler, external API, or AI dependency in the product's core workflow.

The application uses one origin and cookie sessions. A production reverse proxy must terminate HTTPS and set trusted forwarded protocol headers. Secrets stay in the process environment. Database access must be restricted to the application host. Backups are the database operator's responsibility.
