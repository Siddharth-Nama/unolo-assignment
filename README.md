# Unolo Field Force Tracker - Intern Assignment

This project is a Full Stack MERN (SQLite) application for tracking field employees, managing check-ins, and generating reports.

## Features Implemented
-   **Authentication:** JWT-based Login (Manager/Employee) with secure role-based access.
-   **Field Tracking:** Real-time check-in/out with location capture.
-   **Real-time Distance:** Calculates distance between employee and client location using Haversine formula. Flags check-ins > 500m away.
-   **Dashboard:**
    -   **Manager:** View team stats, activity, and active check-ins.
    -   **Employee:** View assigned clients, history, and perform check-ins.
-   **Reports:** Daily Summary Report for Managers aggregating team performance.
-   **Responsive UI:** Optimized for Mobile and Desktop.

## Tech Stack
-   **Frontend:** React 18, Vite, TailwindCSS
-   **Backend:** Node.js, Express.js
-   **Database:** SQLite (with `better-sqlite3`)
-   **Testing:** Jest, Supertest

## Setup Instructions

### Prerequisites
-   Node.js (v18+)
-   Git

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Siddharth-Nama/unolo-assignment.git
    cd unolo-assignment
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    cp .env.example .env  # Ensure JWT_SECRET is set
    npm run setup         # Initializes and seeds database.sqlite
    npm run dev           # Starts server on port 3001
    ```

3.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    npm run dev           # Starts client on port 5173
    ```

## API Documentation

### Authentication
-   `POST /api/auth/login`: Login with email/password. Returns JWT.
-   `GET /api/auth/me`: Get current user profile.

### Check-ins
-   `POST /api/checkin`: Check-in to a client. Requires `client_id`, `latitude`, `longitude`.
    -   Returns `warning: true` if distance > 500m.
-   `PUT /api/checkin/checkout`: Checkout active session.
-   `GET /api/checkin/history`: Get check-in history.
-   `GET /api/checkin/active`: Get current active check-in.

### Reports (New)
-   `GET /api/reports/daily-summary?date=YYYY-MM-DD`: Get aggregated team report for a specific date (Manager only).

## Architectural Decisions
-   **SQLite:** Chosen for simplicity and ACID compliance required for attendance data, avoiding overhead of MongoDB/Postgres for this scale.
-   **Haversine Formula:** Used backend-side for reliable distance validation to prevent client-side spoofing.
-   **JWT:** Stateless authentication allows easy horizontal scaling.
-   **Atomic Transactions:** Check-in logic ensures only one active check-in per user.

## Testing
Run unit tests for API endpoints:
```bash
cd backend
npm test
```
