document.addEventListener('DOMContentLoaded', () => {
    // Locate the right side of the main navigation bar
    const navRight = document.querySelector('.nav-right');
    
    // If a page doesn't have the navbar, just quietly stop the script
    if (!navRight) return; 

    // Check if the user is currently logged in
    const userJSON = localStorage.getItem('farmUser');

    if (userJSON) {
        const user = JSON.parse(userJSON);
        
        // Grab the first letter of their name for the profile badge
        const initial = user.name.charAt(0).toUpperCase();
        
        // Inject the complete Smart Navbar
        navRight.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <a href="dashboard.html" style="text-decoration:none; color:#333; font-weight:500;">Marketplace</a>
                <a href="manage-listings.html" style="text-decoration:none; color:#333; font-weight:500;">My Garage</a>
                <a href="incoming-requests.html" style="text-decoration:none; color:#333; font-weight:500;">Requests</a>
                <a href="my-rentals.html" style="text-decoration:none; color:#333; font-weight:500;">My Bookings</a>

                <div class="profile-dropdown" id="profile-dropdown-btn">
                    <div class="profile-icon">${initial}</div>
                    
                    <div class="dropdown-menu" id="profile-menu">
                        <div style="padding: 15px 16px; background: #f8f9fa; border-bottom: 1px solid #ddd; cursor: default;">
                            <strong style="color: #2C5530; display: block; font-size: 1.05rem;">${user.name}</strong>
                            <span style="font-size: 0.85rem; color: #666;">📞 ${user.phone}</span>
                        </div>
                        
                        <a href="#" id="edit-profile-btn">⚙️ Edit Profile</a>
                        <a href="#" id="logout-btn" class="logout-text">🚪 Logout</a>
                    </div>
                </div>
            </div>
        `;

        // --- Interaction Logic ---
        const dropdownBtn = document.getElementById('profile-dropdown-btn');
        const dropdownMenu = document.getElementById('profile-menu');

        // 1. Toggle the dropdown when the profile icon is clicked
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents the window click listener below from firing immediately
            dropdownMenu.classList.toggle('show');
        });

        // 2. Close the dropdown if the user clicks anywhere else on the screen
        window.addEventListener('click', () => {
            if (dropdownMenu.classList.contains('show')) {
                dropdownMenu.classList.remove('show');
            }
        });

        // 3. Edit Profile Button (Placeholder until we build the update API)
        document.getElementById('edit-profile-btn').addEventListener('click', (e) => {
            e.preventDefault();
            alert('Profile Settings page coming soon! Here you will be able to update your name and password.');
        });

        // 4. Logout Logic
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('farmUser'); // Wipe the session
            window.location.href = 'index.html'; // Teleport to login screen
        });

    } else {
        // If NO user is logged in, show a clean Login button
        navRight.innerHTML = `
            <a href="index.html" style="background:#2C5530; color:white; padding:8px 16px; border-radius:4px; text-decoration:none; font-weight:bold;">
                Login / Register
            </a>
        `;
    }
});