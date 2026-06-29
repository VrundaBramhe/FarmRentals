# Complete QA & Software Testing Report - FarmRentals

## 1. UI Bugs
- **Severity**: Low
- **File**: `public/js/upload.js`
- **Line number**: 31
- **Why it is a problem**: The image upload UI is a placeholder. Clicking the "Tap to add photos" box does nothing, but the form can be submitted, resulting in equipment listings that have no real images.
- **Steps to reproduce**:
  1. Login and go to "Manage Listings" -> "List New Tool".
  2. Click on the "Tap to add photos" box.
  3. Notice there is no file selector.
- **Suggested fix**: Implement a file input `<input type="file" accept="image/*" hidden id="photo-upload">` and trigger it when the box is clicked. Add backend support (e.g., using `multer`) to save the images.

## 2. Backend Bugs
- **Severity**: High
- **File**: `server.js`
- **Line number**: 89
- **Why it is a problem**: The `GET /api/equipment` endpoint only returns equipment where `Status = 'Available'`. However, when a booking is created (`POST /api/rentals`), the equipment status is never updated to 'Rented' or 'Unavailable'.
- **Steps to reproduce**:
  1. Renter books an equipment.
  2. Owner approves the request.
  3. The equipment still appears on the marketplace for others to book on the same dates.
- **Suggested fix**: Update the equipment status when a booking is approved, or filter marketplace results based on active rental dates.

## 3. Workflow Issues
- **Severity**: Medium
- **File**: `public/js/details.js`
- **Line number**: 91
- **Why it is a problem**: The logic hides the booking console if the logged-in user is the owner (`currentUser.id === item.OwnerID`). However, if a user is not logged in, they can fill out the dates, click "Request to Rent", and then receive an alert saying they need to log in. They are redirected to `index.html` but lose their selected dates.
- **Steps to reproduce**:
  1. Open an equipment page as a guest.
  2. Select start and end dates.
  3. Click "Request to Rent". You get redirected and lose context.
- **Suggested fix**: Redirect the user to login with a `returnUrl` query parameter so they can come back to the same item page after logging in.

## 4. Data Flow Issues
- **Severity**: Medium
- **File**: `public/js/upload.js`
- **Line number**: 20
- **Why it is a problem**: In the "Add Equipment" form, if the user selects "Select type" for District, `districtSelect.value` might still be empty or invalid. The backend does not normalize or strictly validate the district enum.
- **Steps to reproduce**:
  1. Intercept the POST request to `/api/equipment`.
  2. Change the `district` field to an arbitrary string (e.g., "InvalidDistrict").
- **Suggested fix**: Add a strict check on the backend to ensure the district belongs to a predefined list of valid districts.

## 5. Database Issues
- **Severity**: High
- **File**: `database.js` / `server.js`
- **Line number**: `server.js` Line 139
- **Why it is a problem**: When deleting an equipment, the backend relies on MySQL foreign key constraints to block deletion if active rentals exist. This will result in an unhandled HTTP 500 error and a generic database error message, rather than a graceful user-friendly message.
- **Steps to reproduce**:
  1. Add an equipment.
  2. Create a rental for it.
  3. Call `DELETE /api/equipment/:id`.
- **Suggested fix**: Check if rentals exist for the equipment ID before attempting deletion. Return a 400 Bad Request with "Cannot delete equipment with active bookings."

## 6. API Issues
- **Severity**: High
- **File**: `server.js`
- **Line number**: 154
- **Why it is a problem**: The `POST /api/rentals` endpoint does not verify if the `renterId` exists or if it matches the authenticated user, nor does it verify that the total cost is calculated correctly based on the `equipmentId`'s actual price.
- **Steps to reproduce**:
  1. Call `POST /api/rentals` with arbitrary `startDate`, `endDate`, and `totalCost: 1`.
  2. The database will insert the record with incorrect pricing.
- **Suggested fix**: The backend should recalculate `totalCost` using the equipment's `Daily_Price` from the database and the provided date range.

## 7. Missing Validations
- **Severity**: Medium
- **File**: `server.js`
- **Line number**: 172
- **Why it is a problem**: `POST /api/equipment` does not validate if `dailyPrice` is a positive number, or if `description` is excessively long.
- **Steps to reproduce**:
  1. Create equipment with `dailyPrice: -500`.
  2. The equipment appears on the marketplace with a negative price.
- **Suggested fix**: Validate that `dailyPrice > 0`, `category` is not empty, and `district` is valid.

## 8. Authentication/Authorization Issues
- **Severity**: Critical
- **File**: `server.js`
- **Line number**: 51
- **Why it is a problem**: The application does not use sessions, cookies, or JWTs. The `/api/login` endpoint returns a plain user object, which the frontend stores in `localStorage`. Any API endpoint can be called by anyone simply by guessing a `userId`.
- **Steps to reproduce**:
  1. Open the browser console.
  2. Run `localStorage.setItem('farmUser', JSON.stringify({ id: 999, name: 'Admin', phone: '123' }))`.
  3. You are now "logged in" as User 999.
- **Suggested fix**: Implement stateless JWT authentication or session-based authentication. Pass the token in the `Authorization` header and verify it on protected routes.

## 9. Security Vulnerabilities
- **Severity**: Critical
- **File**: `server.js`
- **Line number**: 272 (and others)
- **Why it is a problem**: Missing Authorization Checks. Endpoints like `DELETE /api/equipment/:id` and `PUT /api/rentals/:rentalId/status` do not check if the user making the request actually owns the equipment or the rental. Anyone can delete anyone's equipment.
- **Steps to reproduce**:
  1. Find an `equipmentId` belonging to another user.
  2. Send a `DELETE /api/equipment/:id` request via Postman.
  3. The equipment is deleted.
- **Suggested fix**: Authenticate the user (via JWT) and verify `OwnerID === req.user.id` before allowing the delete or update operation.

## 10. Broken Links
- **Severity**: Low
- **File**: `public/index.html`
- **Line number**: 31, 55
- **Why it is a problem**: The links "Create an account" and "Log In" at the bottom of the auth forms have `href="#"`. While JavaScript intercepts clicks on the text, middle-clicking or right-clicking to open in a new tab will just append `#` to the URL.
- **Steps to reproduce**: Right-click "Create an account" and open in a new tab.
- **Suggested fix**: Remove the `href="#"` or change the interaction model so it behaves like a standard button or single-page app link.

## 11. Console Errors
- **Severity**: Low
- **File**: `public/js/dashboard.js`
- **Line number**: 15
- **Why it is a problem**: If the Node.js backend is not running or takes time to start, `fetchEquipment()` fails and logs an uncaught exception/error to the console instead of just handling it gracefully in the UI.
- **Steps to reproduce**: Stop the Node server and load `dashboard.html`.
- **Suggested fix**: Ensure proper `catch` block handling removes raw error dumping and gives a generic "Service unavailable" message.

## 12. Performance Bottlenecks
- **Severity**: Low
- **File**: `public/js/dashboard.js`
- **Line number**: 76
- **Why it is a problem**: The search input triggers `applyFilters()` on every single keystroke (`input` event). For a large array of equipment, this will cause heavy UI blocking and lag.
- **Steps to reproduce**: Type quickly in the search bar.
- **Suggested fix**: Implement a debounce function (e.g., 300ms delay) for the search input event listener.

## 13. Race Conditions
- **Severity**: High
- **File**: `server.js`
- **Line number**: 154
- **Why it is a problem**: Two different users can simultaneously book the exact same equipment for overlapping dates because the backend `POST /api/rentals` endpoint does not check for existing approved or pending bookings in that date range.
- **Steps to reproduce**:
  1. User A sends booking request for Tool 1 (Jan 1 - Jan 5).
  2. User B simultaneously sends booking request for Tool 1 (Jan 1 - Jan 5).
  3. Both requests go through and the owner sees double bookings.
- **Suggested fix**: Add a SQL query in `POST /api/rentals` to check for overlapping dates where `Status = 'Approved'` before inserting the new rental.

## 14. Edge Cases
- **Severity**: Medium
- **File**: `public/js/details.js`
- **Line number**: 100
- **Why it is a problem**: Same-day bookings calculate `diffDays = 1`. However, if the user picks a Start Date in the past, the application allows it and sends it to the backend.
- **Steps to reproduce**:
  1. Pick a Start Date from last month.
  2. Pick an End Date from last month.
  3. Click Request.
- **Suggested fix**: Add validation to ensure `Start Date >= Today's Date`.

## 15. Mobile Responsiveness Issues
- **Severity**: Medium
- **File**: `public/css/dashboard.css` (assumed based on standard behavior)
- **Line number**: N/A
- **Why it is a problem**: On small screens, the search/filter bar and the navigation bar might overflow or compress awkwardly because there are no explicit CSS media queries handling the layout change to a vertical stack.
- **Steps to reproduce**: Open `dashboard.html` in a mobile viewport (e.g., 375px width).
- **Suggested fix**: Ensure the `.search-filter-bar` and `.navbar` use `flex-wrap: wrap;` or stack vertically via `@media (max-width: 768px)`.

## 16. Accessibility Issues
- **Severity**: Medium
- **File**: `public/dashboard.html`
- **Line number**: 17
- **Why it is a problem**: The SVG icon inside the search input wrapper does not have an `aria-label` or `role="img"`, and the inputs lack proper `aria-labels` or associated `<label>` tags. Screen readers will not announce them correctly.
- **Steps to reproduce**: Navigate the page using a screen reader like NVDA or VoiceOver.
- **Suggested fix**: Add `aria-label="Search tools"` to the search input, and add `aria-hidden="true"` to the decorative SVG search icon.

---

# Manual Testing Checklist

## 1. Authentication Flow
- [ ] Verify successful registration with valid details.
- [ ] Verify registration fails if phone number already exists.
- [ ] Verify registration fails if passwords do not match.
- [ ] Verify successful login with valid credentials.
- [ ] Verify login fails with incorrect password or unregistered phone.
- [ ] Verify "Logout" clears the session (localStorage) and redirects to login.

## 2. Equipment Browsing & Marketplace
- [ ] Verify the marketplace loads all available equipment on `dashboard.html`.
- [ ] Verify search bar filters equipment correctly by name.
- [ ] Verify district dropdown filters equipment correctly by location.
- [ ] Verify clicking an equipment card navigates to `item-details.html` with correct ID.

## 3. Booking / Renting Flow
- [ ] Verify equipment details (name, price, owner, location) load correctly.
- [ ] Verify date pickers work and calculate the correct total cost.
- [ ] Verify total cost is 0 if end date is before start date.
- [ ] Verify booking request fails if user is not logged in.
- [ ] Verify booking request succeeds and redirects to "My Bookings" page.
- [ ] Verify owner cannot book their own equipment (booking section should be hidden).

## 4. Managing Listings (Owner)
- [ ] Verify "Manage Listings" shows all equipment uploaded by the logged-in user.
- [ ] Verify "Delete" button removes the equipment.
- [ ] Verify "Delete" fails gracefully if active bookings exist.
- [ ] Verify clicking the FAB (+) navigates to `add-equipment.html`.
- [ ] Verify "Add Equipment" form submits successfully with valid data.
- [ ] Verify "Add Equipment" form validation prevents empty submissions.

## 5. Booking Management (Renter & Owner)
- [ ] Verify "My Bookings" shows all requests made by the renter.
- [ ] Verify "Pending" bookings do not show the "Call Owner" button.
- [ ] Verify "Approved" bookings show the correct "Call Owner" button.
- [ ] Verify "Incoming Requests" page shows all booking requests for the owner's tools.
- [ ] Verify Owner can "Approve" a request.
- [ ] Verify Owner can "Reject" a request.
- [ ] Verify status updates are reflected in the Renter's "My Bookings" page.
