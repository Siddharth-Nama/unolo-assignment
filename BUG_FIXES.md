# Bug Fixes

## 1. Login Logic Flaw (Backend)
- **Location:** `backend/routes/auth.js`, Line 28
- **Issue:** The code `const isValidPassword = bcrypt.compare(password, user.password);` was missing the `await` keyword. Since `bcrypt.compare` returns a Promise, the variable `isValidPassword` was always truthy (a Promise object), causing the `if (!isValidPassword)` check to fail. This meant **any** password would be accepted as valid.
- **Fix:** Added `await` to the `bcrypt.compare` call.
- **Why it works:** Now the code waits for the actual comparison result (boolean true/false) before proceeding.
- **Additional Fix:** Removed `password` (hash) from the JWT payload for security.

## 2. Check-in SQL Error (Backend)
- **Location:** `backend/routes/checkin.js`, Line 57
- **Issue:** The INSERT SQL query attempted to write to columns `lat` and `lng`, but the database schema defines them as `latitude` and `longitude`. This caused an SQL error (500 Internal Server Error) upon submission.
- **Fix:** Corrected the column names in the INSERT statement to match the schema.

## 3. Dashboard SQL Syntax Error (Backend)
- **Location:** `backend/routes/dashboard.js`, Line 80
- **Issue:** The query used MySQL-specific functions `DATE_SUB` and `NOW()`, which are not supported in SQLite. This caused the Employee Dashboard to crash or return error 500.
- **Fix:** Replaced with SQLite equivalent `datetime('now', '-7 days')`.

## 4. Attendance History Crash (Frontend)
- **Location:** `frontend/src/pages/History.jsx`, Line 45
- **Issue:** The component attempted to call `.reduce()` on the `checkins` state variable which was initialized to `null`. This code executed before the loading state check, causing a runtime crash on the initial render.
- **Fix:** Added a fallback `(checkins || [])` to ensure `.reduce()` is always called on an array.

## 5. Incorrect API Status Code (Backend)
- **Location:** `backend/routes/checkin.js`, Line 30
- **Issue:** The API returned status 200 (OK) when `client_id` was missing, which is a validation error. This might mislead clients into thinking the request succeeded despite the `success: false` payload.
- **Fix:** Changed the status code to 400 (Bad Request).

## 6. React Performance/Staleness (Frontend)
- **Location:** `frontend/src/pages/Dashboard.jsx`, Line 9
- **Issue:** The `useEffect` hook had an empty dependency array `[]`, causing `fetchDashboardData` to be defined outside the effect and potentially leading to stale closures or missing updates if the `user` prop changed.
- **Fix:** Moved data fetching logic inside `useEffect` and added `user.id` to the dependency array to ensure data refreshes correctly when the user context changes.
