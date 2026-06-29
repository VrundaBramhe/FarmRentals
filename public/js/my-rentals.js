document.addEventListener('DOMContentLoaded', async () => {
    const rentalsContainer = document.querySelector('.rental-list');
    if (!rentalsContainer) return;

    // 1. Verify the user is logged in
    const userJSON = localStorage.getItem('farmUser');
    if (!userJSON) {
        alert("Please log in to view your bookings.");
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userJSON);

    // 2. Fetch their bookings from the server
    try {
        rentalsContainer.innerHTML = '<p>Loading your bookings...</p>';

        const response = await fetch(`http://localhost:3000/api/rentals/renter/${user.id}`);
        const result = await response.json();

        if (result.success) {
            renderBookings(result.data);
        } else {
            rentalsContainer.innerHTML = `<p class="text-danger">Error: ${result.message}</p>`;
        }
    } catch (error) {
        console.error(error);
        rentalsContainer.innerHTML = '<p>Failed to connect to the server.</p>';
    }

    // 3. Draw the HTML dynamically
    function renderBookings(bookings) {
        if (bookings.length === 0) {
            rentalsContainer.innerHTML = '<p style="text-align:center; padding: 20px;">You have no active bookings yet.</p>';
            return;
        }

        rentalsContainer.innerHTML = ''; // Clear out the hardcoded placeholders!

        bookings.forEach(booking => {
            // Format dates neatly (e.g., "2025-06-10")
            const start = new Date(booking.StartDate).toLocaleDateString('en-IN');
            const end = new Date(booking.EndDate).toLocaleDateString('en-IN');
            
            // Determine badge color based on status
            const badgeClass = booking.Status === 'Pending' ? 'badge-pending' : 'badge-approved';
            
            // Only show the Call button if the booking is approved
            const callButtonHTML = booking.Status === 'Approved' 
                ? `<a href="tel:${booking.OwnerPhone}" class="btn-call" style="text-decoration:none; display:inline-block; margin-top:8px;">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right:4px;">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                     </svg>Call Owner: ${booking.OwnerPhone}
                   </a>`
                : '';

            const itemHTML = `
                <div class="rental-item">
                    <img src="assets/images/placeholder.jpg" alt="Thumbnail" class="rental-thumb">
                    <div class="rental-info">
                        <h4 class="rental-name">${booking.Category}</h4>
                        <p class="rental-dates">${start} – ${end}</p>
                    </div>
                    <div class="rental-status-col">
                        <span class="${badgeClass}">${booking.Status}</span>
                        ${callButtonHTML}
                    </div>
                </div>
            `;
            
            rentalsContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
    }
});