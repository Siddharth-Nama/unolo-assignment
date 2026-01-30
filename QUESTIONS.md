# Technical Questions

## Q1: How would you scale the backend to handle 10,000 concurrent users?
**Answer:**
To scale for 10,000 concurrent users, I would adopt the following strategies:
1.  **Horizontal Scaling:** Deploy multiple instances of the Node.js backend across several servers or containers (e.g., using Kubernetes or AWS ECS) behind a Load Balancer (Nginx/AWS ALB).
2.  **Database Optimization:**
    - Use Connection Pooling to manage DB connections efficiently.
    - Implement Read Replicas for `SELECT` heavy operations (Reports/Dashboard).
    - Index frequently queried columns (`manager_id`, `checkin_time`, `employee_id`).
3.  **Caching:** Implement Redis to cache frequent data like "Active Check-ins" or "User Profiles" to reduce DB hits.
4.  **Asynchronous Processing:** Offload heavy tasks (like generating complex reports) to a message queue (RabbitMQ/SQS) and worker services.
5.  **State Management:** Ensure the backend is stateless (store sessions in Redis/JWT) so any instance can handle any request.

## Q2: Why is sticking the JWT in the Authorization header preferred over cookies?
**Answer:**
JWT in the Authorization header (`Bearer token`) is preferred because:
1.  **Stateless API:** It aligns with REST principles where the server doesn't maintain session state.
2.  **Cross-Domain/CORS:** Headers are easier to handle in Cross-Origin requests compared to Cookies (which require specific `SameSite` and `Secure` attributes).
3.  **Mobile App Support:** Native mobile apps (iOS/Android) find it easier to attach headers than manage cookies.
4.  **CSRF Protection:** Storing tokens in memory (and sending via headers) makes the app immune to CSRF attacks, whereas cookies (if invalidly configured) are vulnerable.

## Q3: How would you handle offline check-ins (when no internet)?
**Answer:**
To support offline check-ins:
1.  **Local Storage:** When the device is offline, check-in data (timestamps, coordinates) should be stored locally in `IndexedDB` or `localStorage` (or `SQLite` for native apps).
2.  **Sync Manager:** A background service (Service Worker or custom logic) should listen for network restoration events.
3.  **Queue System:** Once online, the queued check-ins should be sent to the backend. API should accept `checkin_time` in the payload (trusting user device time, or using a "server-received" offset logic).
4.  **Conflict Resolution:** Handle duplicate submissions (idempotency keys) and validate timestamps to prevent fraud.

## Q4: SQL vs NoSQL – Which one would you choose for this project and why?
**Answer:**
**I chose SQL (SQLite/PostgreSQL)** for this project because:
1.  **Structured Data:** The data (Users, Clients, Check-ins) is highly structured with clear relationships (Foreign Keys).
2.  **ACID Compliance:** Check-ins and Check-outs require strong transactional integrity. You cannot have a "Checked Out" state without a "Checked In" record.
3.  **Complex Queries:** Features like "Daily Summary Reports" require complex `JOINs` and aggregations (e.g., joining Users, Checkins, clients), which SQL handles efficiently.
4.  **Data Integrity:** Foreign Key constraints prevent orphaned records (e.g., a check-in for a deleted client).

## Q5: Authentication vs Authorization – Explain with an example from this app.
**Answer:**
-   **Authentication (Who you are):** Verifying the user's identity. In this app, checking if `email` and `password` match in `/api/auth/login` is Authentication.
-   **Authorization (What you can do):** Verifying access rights. In this app, the `requireManager` middleware checks `req.user.role === 'manager'`. Only Managers are **authorized** to view expected dashboard stats or generate reports, while Employees are **authorized** only to check in/out.

## Q6: Provide a real-world example of a race condition and how to prevent it.
**Answer:**
**Example:** Two requests to "Check Out" the same active check-in arrive simultaneously (e.g., user double-clicks the button).
-   Request A reads "Status = Checked In".
-   Request B reads "Status = Checked In".
-   Request A updates "Status = Checked Out".
-   Request B updates "Status = Checked Out".
This results in redundant updates or incorrect "Checkout Time" logs if logic depends on previous state.

**Prevention:**
1.  **Database Locking:** Use `SELECT ... FOR UPDATE` (Pessimistic Locking) to lock the row during the read.
2.  **Optimistic Locking:** Include a version number or verify status in the UPDATE clause:
    `UPDATE checkins SET status='checked_out' WHERE id=1 AND status='checked_in';`
    If Request A succeeds, the row status changes. Request B will find 0 matching rows and fail gracefully.
