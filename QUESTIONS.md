# Technical Questions & Architecture Decisions

## Scalability & Performance

### Q1: Handling 10,000 Concurrent Users
**Strategy:**
To scale effectively, I would move away from a monolithic single-instance approach to a **horizontally scalable architecture**.
*   **Load Balancing:** Deploy the Node.js backend across multiple instances (using Docker/Kubernetes) behind an Nginx or AWS Application Load Balancer to distribute traffic evenly.
*   **Database Optimization:** Implement **Connection Pooling** to prevent database overload and potential bottlenecks. For read-heavy operations like the Manager Dashboard, I would introduce **Read Replicas**.
*   **Caching Strategy:** Integrate **Redis** to cache frequently accessed data such as User Profiles and Active Check-ins, significantly reducing direct database hits.
*   **Async Processing:** Offload resource-intensive tasks, such as generating daily reports, to a message queue (e.g., RabbitMQ or AWS SQS) to keep the main API responsive.

## Security & Best Practices

### Q2: JWT Security: Headers vs. Cookies
**Why Authorization Headers?**
Storing JWTs in the `Authorization` header is the industry standard for modern stateless applications for several reasons:
*   **CSRF Protection:** Unlike cookies, headers are not automatically sent by the browser, making the application immune to Cross-Site Request Forgery (CSRF) attacks.
*   **Mobile Compatibility:** Headers are much easier to manage in native mobile frameworks (iOS/Android) compared to cookie-based sessions.
*   **Cross-Origin flexibility:** It simplifies CORS configurations when the frontend and backend reside on different domains (e.g., API on `api.unolo.com` and App on `dashboard.unolo.com`).

**Security Improvement:**
To further secure the implementation, I would ensure the token has a short expiration time (e.g., 15 minutes) and implement a **Refresh Token** rotation mechanism to maintain session validity securely.

### Q3: Offline First Architecture
**Implementation Plan:**
To ensure reliability in areas with spotty internet connectivity (common for field staff):
1.  **Local Queuing:** Use **IndexedDB** or **SQLite** (on mobile) to store check-in data locally when the network is unavailable.
2.  **Background Sync:** Implement a **Service Worker** or use libraries like `Workbox` to detect network restoration.
3.  **Synchronization Logic:** Once online, a background process flushes the local queue to the backend. The API would be updated to respect the original `captured_at` timestamp rather than the server's receive time to ensure accurate attendance records.

## Database & Architecture

### Q4: SQL vs. NoSQL Selection
**Choice: SQL (SQLite/PostgreSQL)**
SQL is the superior choice for a Field Force Tracker for these reasons:
*   **Data Integrity:** The application relies heavily on relationships (Employees belong to Managers; Check-ins belong to Clients). SQL enforces these via Foreign Keys, ensuring we don't have orphaned records.
*   **Complex Reporting:** Generating the "Daily Summary Report" requires joining multiple tables (Users, Checkins, Clients) and performing aggregations. SQL engines are optimized for these `JOIN` operations.
*   **ACID Compliance:** Attendance data is sensitive. SQL transactions ensure that a Check-out cannot happen without a valid prior Check-in, maintaining a consistent state.

## Core Concepts

### Q5: Authentication vs. Authorization
*   **Authentication (Identity):** Confirms *who* the user is.
    *   *In Code:* The `/api/auth/login` endpoint validates credentials and issues a JWT. The `authenticateToken` middleware verifies this token to confirm identity.
*   **Authorization (Access):** Determines *what* the user is allowed to do.
    *   *In Code:* The `requireManager` middleware checks the `user.role`. It grants Managers access to team reports but restricts Employees to their own data.

### Q6: Race Conditions & Concurrency
**Scenario:**
A "Double Check-out" race condition could occur if a user clicks the "Check Out" button twice rapidly. Both requests might read the status as "Checked In" and attempt to process the checkout simultaneously, leading to corrupt data or double logs.

**Prevention:**
*   **Optimistic Locking:** I would modify the SQL query to conditionally update based on the expected state.
    *   *Query:* `UPDATE checkins SET status = 'checked_out' WHERE id = ? AND status = 'checked_in'`
    *   *Result:* The first request succeeds and changes the status. The second request finds zero rows matching the condition and fails gracefully, preserving data integrity.
