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
