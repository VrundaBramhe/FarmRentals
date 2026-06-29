document.addEventListener('DOMContentLoaded', () => {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return; 

    const userJSON = localStorage.getItem('farmUser');

    if (userJSON) {
        const user = JSON.parse(userJSON);
        const initial = user.name.charAt(0).toUpperCase();
        
        navRight.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <a href="dashboard.html">Marketplace</a>
                <a href="manage-listings.html">My Garage</a>
                <a href="incoming-requests.html">Requests</a>
                <a href="my-rentals.html">My Bookings</a>
                <div class="profile-dropdown" id="profile-dropdown-btn">
                    <div class="profile-icon">${initial}</div>
                    <div class="dropdown-menu" id="profile-menu">
                        <strong>${user.name}</strong>
                        <a href="#" id="edit-profile-btn">⚙️ Edit Profile</a>
                        <a href="#" id="logout-btn">🚪 Logout</a>
                    </div>
                </div>
            </div>
        `;

        // Logic (Dropdown + Logout)
        document.getElementById('profile-dropdown-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('profile-menu').classList.toggle('show');
        });
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('farmUser'); 
            localStorage.removeItem('farmToken');
            window.location.href = 'index.html'; 
        });
    }
});

// Robust Error Handler
document.addEventListener('error', (e) => {
    if (e.target.tagName.toLowerCase() === 'img') {
        // Only trigger if we aren't already looking at the placeholder
        if (!e.target.src.includes('placeholder.jpg')) {
            e.target.src = 'assets/images/placeholder.jpg'; 
        }
    }
}, true);