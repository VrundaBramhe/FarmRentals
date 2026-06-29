# FarmRentals QA & Testing Report

## Comprehensive Bug & Issue Report

### 1. UI Bugs
*   **Missing JS Files linked in HTML**
    *   **Severity:** High
    *   **File:** Assumed various HTML files (`item-details.html`, `manage-listings.html`, `my-rentals.html`, `add-equipment.html`) based on missing JS files in `public/js/`.
    *   **Line number:** N/A (across multiple HTML files)
    *   **Why it is a problem:** Core functionality like viewing details, uploading, tracking rentals, and managing inventory will fail to load or execute because the scripts they rely on are missing.
    *   **Steps to reproduce:** Attempt to view `my-rentals.html` or `manage-listings.html`. The console will throw 404 errors for scripts like `details.js`, `inventory.js`, `my-rentals.js`, `upload.js`.
    *   **Suggested fix:** Create the missing files or ensure the existing files are correctly named and linked in the HTML `<script>` tags (e.g., `<script src="js/add-equipment.js"></script>` instead of `<script src="js/upload.js"></script>`).

*   **Search Debouncing Issue**
    *   **Severity:** Minor
    *   **File:** `public/js/dashboard.js`
    *   **Line number:** ~88
    *   **Why it is a problem:** The debounce logic references a class `.search-input-wrapper input` in a comment but earlier selects `input[type="text"]`. If the HTML structure changes or multiple text inputs exist, it might fail or bind to the wrong element.
    *   **Steps to reproduce:** Inspect the `dashboard.js` file and check the HTML for the search input.
    *   **Suggested fix:** Ensure the selector used for the event listener matches the actual input element intended for search (e.g., give it a specific ID like `#search-bar`).

### 2. Backend Bugs
*   **Registration API Missing Return on Error**
    *   **Severity:** High
    *   **File:** `server.js`
    *   **Line number:** ~68
    *   **Why it is a problem:** If `fullName`, `phone`, or `password` are missing, the server responds with a 400 status but continues executing because of a missing `return` statement. This causes "headers already sent" errors and attempts to insert invalid data or query undefined values.
    *   **Steps to reproduce:** Send a POST request to `/api/register` with missing required fields in the JSON body.
    *   **Suggested fix:** Fix the indentation and add a `return`: `if (!fullName || !phone || !password) { return res.status(400).json({...}); }`

### 3. Workflow Issues
*   **Login Redirect Overwrite**
    *   **Severity:** Medium
    *   **File:** `public/js/auth.js`
    *   **Line number:** ~97
    *   **Why it is a problem:** Inside the login success block, the `if (response.ok)` check is nested inside itself and attempts to overwrite `localStorage` variables and alert the user again. This is redundant code and can cause unexpected behavior or multiple alerts.
    *   **Steps to reproduce:** Successfully log in using the UI.
    *   **Suggested fix:** Remove the nested `if (response.ok)` block and consolidate the redirect and token storage logic.

### 4. Data flow issues
*   **Missing Authentication Data in Equipment Fetch**
    *   **Severity:** Medium
    *   **File:** `server.js`
    *   **Line number:** ~143
    *   **Why it is a problem:** The single equipment fetch `/api/equipment/:id` does not return the `OwnerID` clearly for the frontend to prevent self-renting reliably (if relying only on the frontend). Although the backend handles it in `/api/rentals`, the frontend check in `item-details.js` expects `item.OwnerID`.
    *   **Steps to reproduce:** Navigate to an item details page that you own. Check if the booking form is successfully hidden as intended by `item-details.js`.
    *   **Suggested fix:** Ensure `e.OwnerID` is explicitly selected in the query: `SELECT e.*, e.OwnerID, u.FullName AS OwnerName...`

### 5. Database issues
*   **Unconstrained Foreign Keys (Potential)**
    *   **Severity:** Low (Assuming default MySQL behavior without explicit constraints)
    *   **File:** `database.js` / Database Schema (implied)
    *   **Line number:** N/A
    *   **Why it is a problem:** The codebase handles graceful deletion checks manually (e.g., checking active rentals before deleting equipment). If DB-level foreign key constraints (`ON DELETE RESTRICT`) aren't set, direct DB manipulations could cause orphaned records.
    *   **Steps to reproduce:** Review the database schema definition (not fully provided in files, but inferred).
    *   **Suggested fix:** Ensure proper foreign key constraints are defined in the MySQL database schema.

### 6. API issues
*   **Hardcoded JWT Secret Fallback**
    *   **Severity:** High (Security)
    *   **File:** `server.js`
    *   **Line number:** ~58, 107
    *   **Why it is a problem:** The JWT secret falls back to a hardcoded string `'farm_super_secret_key_2026'` if `process.env.JWT_SECRET` is missing. This makes tokens easily forgeable if deployed without the env var.
    *   **Steps to reproduce:** Run the server without a `.env` file containing `JWT_SECRET`.
    *   **Suggested fix:** Enforce that the server fails to start (throws an error) if `process.env.JWT_SECRET` is not provided.

### 7. Missing validations
*   **Phone Number Format Validation**
    *   **Severity:** Medium
    *   **File:** `server.js` (Backend) & `public/js/auth.js` (Frontend)
    *   **Line number:** Backend ~67, Frontend ~25
    *   **Why it is a problem:** There is no validation on the phone number format during registration (e.g., must be 10 digits). Users can register with invalid or malformed numbers.
    *   **Steps to reproduce:** Register a new account with the phone number "123".
    *   **Suggested fix:** Add regex validation for phone numbers on both the frontend and backend.

*   **Password Complexity Validation**
    *   **Severity:** Medium
    *   **File:** `server.js` & `public/js/auth.js`
    *   **Line number:** Backend ~67, Frontend ~25
    *   **Why it is a problem:** Passwords can be very weak (e.g., "123"), making accounts vulnerable to brute-force attacks.
    *   **Steps to reproduce:** Register a new account with a weak password.
    *   **Suggested fix:** Enforce minimum length and character types (e.g., 8+ chars, uppercase, lowercase, number).

### 8. Authentication/Authorization issues
*   **Delete Equipment Authorization Check Type Mismatch**
    *   **Severity:** Low
    *   **File:** `server.js`
    *   **Line number:** ~341
    *   **Why it is a problem:** In `/api/equipment/:id`, the check `equipment[0].OwnerID !== req.user.id` is good, but `req.user.id` is derived from the JWT (which might be a string depending on how it was encoded). Using strict inequality (`!==`) might fail if one is an integer and the other is a string.
    *   **Steps to reproduce:** Attempt to delete an owned equipment item.
    *   **Suggested fix:** Ensure data types match (e.g., cast both to integers) or use loose inequality (`!=`).

### 9. Security vulnerabilities
*   **File Upload Validation Relies on MIME Type**
    *   **Severity:** Medium
    *   **File:** `server.js`
    *   **Line number:** ~41
    *   **Why it is a problem:** The multer configuration only checks the `file.mimetype` provided by the client request. This can be easily spoofed, allowing malicious files (like executable scripts) to be uploaded as long as they are disguised as an image type.
    *   **Steps to reproduce:** Intercept an upload request and modify the MIME type of an `.exe` file to `image/jpeg`.
    *   **Suggested fix:** Use a library like `file-type` to inspect the actual magic bytes of the uploaded file buffer to ensure it's truly an image before saving it.

### 10. Broken links
*   **Missing Image Fallbacks**
    *   **Severity:** Minor
    *   **File:** `public/js/dashboard.js`, `public/js/manage-listings.js`, `public/js/my-rentals.js`
    *   **Line number:** ~109 (my-rentals), ~55 (manage-listings)
    *   **Why it is a problem:** Hardcoded placeholder images (`assets/images/placeholder.jpg`) are used, which might not exist in the repository structure.
    *   **Steps to reproduce:** Load the dashboard or inventory pages and observe broken image icons if the placeholder file is missing.
    *   **Suggested fix:** Ensure the placeholder image exists at the specified path or add `onerror` handlers to image tags to load a default fallback if the primary source fails.

### 11. Console errors
*   **Missing DOM Elements causing Script Failures**
    *   **Severity:** Minor
    *   **File:** `public/js/dashboard.js`
    *   **Line number:** ~15
    *   **Why it is a problem:** Scripts like `dashboard.js` attempt to run on every page they are included. If their specific container (`.feed-container`) doesn't exist, they might throw an error or log critical warnings, cluttering the console.
    *   **Steps to reproduce:** Load a page that includes `dashboard.js` but doesn't have `<div class='feed-container'>`.
    *   **Suggested fix:** Ensure scripts only execute their main logic if their required DOM elements are present (which is partially implemented with `if (!feedContainer) return;`, but it still logs an error unnecessarily).

### 12. Performance bottlenecks
*   **Unpaginated Data Fetches**
    *   **Severity:** Medium
    *   **File:** `server.js` (Backend API routes)
    *   **Line number:** ~125 (`/api/equipment`), ~290 (`/api/requests/:ownerId`)
    *   **Why it is a problem:** APIs return all matching records at once without pagination or limits. As the database grows, this will cause slow response times and high memory usage on both the server and client.
    *   **Steps to reproduce:** Add thousands of equipment records and request the dashboard feed.
    *   **Suggested fix:** Implement `LIMIT` and `OFFSET` in the SQL queries and add pagination parameters to the API endpoints.

### 13. Race conditions
*   **Double Booking Race Condition**
    *   **Severity:** Low (partially mitigated)
    *   **File:** `server.js`
    *   **Line number:** ~186 (`/api/rentals`)
    *   **Why it is a problem:** The backend checks for overlapping 'Approved' dates before inserting a new booking. However, under high concurrency, two requests for the same dates could pass the select check simultaneously before either inserts, leading to a double booking.
    *   **Steps to reproduce:** Send two concurrent POST requests to `/api/rentals` for the same equipment and overlapping dates.
    *   **Suggested fix:** Implement a database lock or use an atomic transaction (e.g., `SERIALIZABLE` isolation level or a more robust constraint) to handle concurrent booking requests safely.

### 14. Edge cases
*   **Timezone Discrepancy in Booking API**
    *   **Severity:** Medium
    *   **File:** `server.js`
    *   **Line number:** ~175
    *   **Why it is a problem:** The backend API checks if `start < today` using `new Date().setHours(0, 0, 0, 0)`. The server's timezone might differ from the user's timezone, potentially blocking legitimate bookings made late at night in a timezone "behind" the server.
    *   **Steps to reproduce:** Set the server to UTC and the client to a timezone far ahead (e.g., UTC+12). Attempt to book for "today" client-time.
    *   **Suggested fix:** Pass explicit standardized dates (e.g., UTC ISO strings) from the client and handle timezone logic carefully on the server.

### 15. Mobile responsiveness issues
*   **Table Layouts on Mobile**
    *   **Severity:** Minor
    *   **File:** (Implied CSS)
    *   **Line number:** N/A
    *   **Why it is a problem:** While CSS isn't provided, typical list views (like inventory or rentals) often break or require horizontal scrolling on narrow screens if not styled defensively.
    *   **Steps to reproduce:** View the "Manage Listings" or "Incoming Requests" pages on a mobile viewport (e.g., iPhone SE size).
    *   **Suggested fix:** Use CSS Flexbox/Grid and media queries to stack elements vertically on smaller screens.

### 16. Accessibility issues
*   **Missing ARIA Labels and Alt Text**
    *   **Severity:** Minor
    *   **File:** `public/js/dashboard.js`, `public/index.html`
    *   **Line number:** N/A
    *   **Why it is a problem:** Screen readers rely on ARIA attributes and descriptive alt text for images to convey information to visually impaired users. Dynamically generated cards often lack these.
    *   **Steps to reproduce:** Use a screen reader (like VoiceOver or NVDA) to navigate the dashboard.
    *   **Suggested fix:** Add descriptive `alt` attributes to dynamically generated images and use semantic HTML or `aria-label`s for interactive elements.

---

## Manual Testing Checklist

### 1. Authentication Flow
- [ ] **Registration - Success:** Enter valid name, phone, matching passwords. Verify redirect to dashboard and DB entry.
- [ ] **Registration - Missing Fields:** Submit with empty fields. Verify error message.
- [ ] **Registration - Password Mismatch:** Submit with differing passwords. Verify error message.
- [ ] **Registration - Duplicate Phone:** Register with an already used phone number. Verify error message.
- [ ] **Login - Success:** Enter valid phone and password. Verify token storage and redirect.
- [ ] **Login - Invalid Credentials:** Enter wrong password or unregistered phone. Verify error message.
- [ ] **Login - Redirect Logic:** Try accessing a protected page (e.g., booking) while logged out, get redirected to login, login, and verify redirection back to the requested page.

### 2. Equipment Management (Owner Flow)
- [ ] **Add Equipment - Success:** Fill all fields, attach image. Verify success message and appearance on Dashboard/Inventory.
- [ ] **Add Equipment - Invalid District:** Submit a district not in the allowed list via API manipulation. Verify rejection.
- [ ] **Add Equipment - Negative Price:** Enter a negative or zero price. Verify rejection.
- [ ] **View Inventory:** Navigate to manage listings. Verify all owned items are displayed.
- [ ] **Delete Equipment - No Bookings:** Delete an item with no active/pending bookings. Verify removal.
- [ ] **Delete Equipment - Active Bookings:** Attempt to delete an item that has a pending or approved booking. Verify graceful rejection.

### 3. Rental Process (Renter Flow)
- [ ] **Browse Dashboard:** Verify all available equipment is loaded.
- [ ] **Search/Filter:** Test text search and district dropdown filter. Verify correct items are shown.
- [ ] **View Item Details:** Click an item. Verify details (price, owner, description) load correctly.
- [ ] **Self-Rent Prevention (UI):** View an item you own. Verify booking form is hidden/disabled.
- [ ] **Self-Rent Prevention (API):** Attempt to book your own item via direct API call. Verify rejection.
- [ ] **Date Validation - Past Dates:** Select a start date in the past. Verify error and cost is ₹0.
- [ ] **Date Validation - End before Start:** Select end date before start date. Verify error and cost is ₹0.
- [ ] **Calculate Cost:** Select valid dates. Verify the total cost calculates correctly based on daily rate.
- [ ] **Submit Booking Request:** Submit valid dates. Verify success and appearance in "My Rentals".
- [ ] **Double Booking Prevention:** Attempt to book an item for dates that overlap with an already *Approved* booking. Verify rejection.

### 4. Booking Management (Owner Flow)
- [ ] **View Incoming Requests:** Navigate to incoming requests page. Verify pending requests are visible.
- [ ] **Approve Request:** Click approve. Verify status changes to Approved and renter is updated.
- [ ] **Reject Request:** Click reject. Verify status changes to Rejected.

### 5. Renter Tracking
- [ ] **View My Rentals:** Navigate to My Rentals. Verify list of bookings and their statuses.
- [ ] **Call Owner Button:** Verify the "Call Owner" button only appears for Approved bookings.
