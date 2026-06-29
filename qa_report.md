# QA Report & Manual Testing Checklist for FarmRentals

## Identified Issues

### 1. UI/Console Error: SyntaxError - Identifier 'searchInput' has already been declared
*   **Severity:** High
*   **File:** `public/js/dashboard.js`
*   **Line:** ~56, ~65 (approx)
*   **Why it is a problem:** Redeclaring `searchInput` with `const` throws a fatal SyntaxError in JavaScript, preventing the entire dashboard script from executing. This breaks the search functionality and potentially rendering of items.
*   **Steps to reproduce:**
    1. Open the application.
    2. Log in and navigate to the Dashboard (`dashboard.html`).
    3. Check the browser console.
*   **Suggested fix:** Remove or rename the second declaration of `const searchInput`.
    ```javascript
    // Instead of redefining:
    // const searchInput = document.querySelector('.search-input-wrapper input');
    // Just use the existing one, or assign it properly if needed, but it's already defined at the top.
    ```

### 2. Logic/Code Duplication: Duplicate Login Success Handling
*   **Severity:** Medium
*   **File:** `public/js/auth.js`
*   **Line:** ~90-95
*   **Why it is a problem:** The login logic has a duplicated block for setting localStorage and alerting the user. While it may not crash, it's poor practice and could lead to double alerts or race conditions in future modifications.
*   **Steps to reproduce:**
    1. Go to `index.html`.
    2. Enter valid login credentials and submit.
    3. The code sets localStorage twice and may show duplicate behavior depending on execution speed.
*   **Suggested fix:** Remove the nested `if (response.ok)` block inside the already checked `if (response.ok)` block.

### 3. Logic/Code Duplication: Duplicate `calculateCost` Function Definition
*   **Severity:** Low
*   **File:** `public/js/details.js`
*   **Line:** ~60
*   **Why it is a problem:** The comment and potentially the function definition for `calculateCost` are duplicated.
*   **Steps to reproduce:** Open `public/js/details.js` and observe the duplicate comment/definition.
*   **Suggested fix:** Remove the duplicate definition.

### 4. Missing Validation (Backend): Unrestricted Registration Data
*   **Severity:** High
*   **File:** `server.js`
*   **Line:** ~62 (`/api/register`)
*   **Why it is a problem:** The backend does not validate if `fullName`, `phone`, or `password` are empty strings or missing entirely before trying to hash the password or insert into the database. This could lead to invalid data being stored or server crashes if `bcrypt` receives undefined.
*   **Steps to reproduce:** Send a POST request to `/api/register` with an empty JSON body `{}`.
*   **Suggested fix:** Add required field validation at the top of the route.
    ```javascript
    if (!fullName || !phone || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    ```

### 5. Missing Validation (Backend): Missing Server-Side Date Validation
*   **Severity:** Medium
*   **File:** `server.js`
*   **Line:** ~160 (`/api/rentals`)
*   **Why it is a problem:** The server relies entirely on the frontend to prevent booking dates in the past or end dates before start dates. A malicious user could bypass the frontend and send invalid dates via API tools (like Postman).
*   **Steps to reproduce:**
    1. Get a valid JWT token.
    2. Send a POST request to `/api/rentals` with `startDate` in the past.
    3. The server will accept it.
*   **Suggested fix:** Add server-side date validation before calculating cost.
    ```javascript
    if (start < new Date().setHours(0,0,0,0) || end < start) {
        return res.status(400).json({ success: false, message: 'Invalid dates provided.' });
    }
    ```

### 6. Missing Validation (Backend): Unrestricted Status Update
*   **Severity:** Medium
*   **File:** `server.js`
*   **Line:** ~277 (`/api/rentals/:rentalId/status`)
*   **Why it is a problem:** The endpoint allows updating the status to *any* string value provided in the request body, not just 'Approved' or 'Rejected'. This could corrupt the data state.
*   **Steps to reproduce:** Send a PUT request with `status: "Hacked"` to the status update endpoint.
*   **Suggested fix:** Validate the `status` value.
    ```javascript
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    ```

### 7. Security Vulnerability (Backend): Unrestricted File Upload Types
*   **Severity:** High
*   **File:** `server.js`
*   **Line:** ~30 (Multer config)
*   **Why it is a problem:** The application accepts any file uploaded for equipment images. A user could upload a malicious file (e.g., `.exe`, `.php`, `.sh`) which could be executed on the server or by clients downloading it.
*   **Steps to reproduce:** Upload a non-image file (e.g., `test.txt`) via the Add Equipment form (or directly to `/api/equipment`).
*   **Suggested fix:** Implement a `fileFilter` in Multer to only allow specific image mimetypes (`image/jpeg`, `image/png`, `image/webp`).

### 8. Edge Case (Backend): Case-sensitive District Validation
*   **Severity:** Low
*   **File:** `server.js`
*   **Line:** ~213
*   **Why it is a problem:** District validation is strictly case-sensitive. If the frontend ever changes casing or a user uses an API tool, it might fail unnecessarily.
*   **Steps to reproduce:** Submit equipment with district "ahmednagar" instead of "Ahmednagar".
*   **Suggested fix:** Normalize casing before checking against the valid array, or perform a case-insensitive check.


---

## Manual Testing Checklist

### 1. Authentication Flow
- [ ] **Registration - Success:** Enter valid Name, Phone, Password, and Confirm Password. Verify success message and redirection to login.
- [ ] **Registration - Duplicate Phone:** Attempt to register with an already registered phone number. Verify appropriate error message.
- [ ] **Registration - Missing Fields:** Attempt to register leaving one or more fields blank. Verify frontend validation prevents submission.
- [ ] **Registration - Password Mismatch:** Enter passwords that do not match. Verify frontend validation.
- [ ] **Login - Success:** Enter valid phone and password. Verify successful login, token storage, and redirection to the Dashboard.
- [ ] **Login - Invalid Credentials:** Enter an incorrect phone or password. Verify appropriate error message.
- [ ] **Login - Smart Redirect:** Attempt to access an equipment details page without logging in. Click "Request to Rent". Log in, and verify redirection back to the specific equipment page.
- [ ] **Logout:** Click Logout in the profile dropdown. Verify token is cleared from localStorage and user is redirected to the login page.

### 2. Equipment Management (Owner Flow)
- [ ] **List Equipment - Success:** Fill out all fields correctly, attach an image, and submit. Verify success message and redirection to Dashboard.
- [ ] **List Equipment - Missing Fields:** Attempt to submit the form missing required fields (name, price, district). Verify validation prevents submission.
- [ ] **List Equipment - Negative Price:** Attempt to enter a negative or zero price. Verify validation.
- [ ] **List Equipment - Invalid District:** Inspect element and change district value to an invalid one, then submit. Verify server rejects it.
- [ ] **View Inventory:** Navigate to "My Garage". Verify listed equipment is displayed correctly with correct details and images.
- [ ] **Delete Equipment - Success:** Click delete on an item with no active bookings. Confirm deletion, and verify it's removed from the list.
- [ ] **Delete Equipment - Blocked (Active Bookings):** Attempt to delete an item that has "Pending" or "Approved" bookings. Verify server blocks deletion with appropriate message.

### 3. Browsing & Booking (Renter Flow)
- [ ] **Dashboard - View:** Verify all available equipment is listed with correct details.
- [ ] **Dashboard - Search:** Enter a search term (e.g., category name). Verify list filters correctly (with debouncing).
- [ ] **Dashboard - Filter:** Select a specific district. Verify only items in that district are shown.
- [ ] **View Details:** Click on an item. Verify title, price, owner info, location, and description are loaded correctly.
- [ ] **Own Listing Check:** View an item you own. Verify the booking form is replaced with a "This is your listing" message.
- [ ] **Booking Math - Valid Dates:** Select start and end dates. Verify the total cost calculates correctly (days * daily rate).
- [ ] **Booking Math - Time Travel:** Select a start date in the past. Verify validation blocks it and total resets to ₹0.
- [ ] **Booking Math - End Before Start:** Select an end date before the start date. Verify validation blocks it and total resets to ₹0.
- [ ] **Submit Booking Request:** Submit valid dates. Verify success message and redirection to "My Bookings".
- [ ] **Double Booking Prevention:** Attempt to book an item for dates that overlap with an already *Approved* booking. Verify server rejects it.

### 4. Managing Requests (Owner Flow)
- [ ] **View Incoming Requests:** Navigate to "Requests". Verify pending requests show "Approve" and "Reject" buttons. Verify already processed requests show badges instead.
- [ ] **Approve Request:** Click Approve on a pending request. Confirm prompt, and verify status updates to Approved.
- [ ] **Reject Request:** Click Reject on a pending request. Confirm prompt, and verify status updates to Rejected.
- [ ] **Security Check (Ownership):** Use Postman/curl to attempt to approve a request for an item you do not own using your token. Verify backend blocks it with 403 Forbidden.

### 5. Tracking Bookings (Renter Flow)
- [ ] **View My Bookings:** Navigate to "My Bookings". Verify all requested bookings are listed with correct status (Pending/Approved).
- [ ] **Call Owner Button:** Verify that the "Call Owner" button is ONLY visible for bookings with "Approved" status, and not for "Pending".

### 6. UI/UX & Responsive Testing
- [ ] **Navbar Dropdown:** Verify profile dropdown opens on click and closes when clicking outside.
- [ ] **Mobile Responsiveness:** Resize window to mobile width. Verify navbar, forms, dashboard grid, and detail pages display correctly without horizontal scrolling or broken layouts.
- [ ] **Image Upload UI:** Verify clicking the upload box triggers file selection, and selecting a file turns the box green and displays the filename.

### 7. Security & API Testing (Backend)
- [ ] **Unauthenticated Access:** Attempt to call secured API endpoints (`POST /api/rentals`, `POST /api/equipment`, `DELETE /api/equipment/:id`, `PUT /api/rentals/:rentalId/status`) without a valid JWT token. Verify 401 Unauthorized response.
- [ ] **Invalid Token:** Attempt to call secured endpoints with a tampered or expired token. Verify 403 Forbidden response.
- [ ] **File Upload Type Restriction:** Attempt to upload a `.txt` or `.exe` file via Postman to `POST /api/equipment`. Verify server rejects it.
- [ ] **Server-Side Date Bypass:** Attempt to POST to `/api/rentals` with invalid dates directly via API. Verify server rejects it.
