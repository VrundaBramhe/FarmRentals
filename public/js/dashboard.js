document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Dashboard script loaded and running!");
    
    // BULLETPROOF SELECTORS
    const feedContainer = document.querySelector('.feed-container');
    const searchInput = document.querySelector('input[type="text"]'); // Grabs any text input
    const districtFilter = document.querySelector('select'); // Grabs the dropdown
    
    console.log("Checking HTML Elements:");
    console.log("1. Feed Container found?", !!feedContainer);
    console.log("2. Search Input found?", !!searchInput);
    console.log("3. District Filter found?", !!districtFilter);

    if (!feedContainer) {
        console.error("CRITICAL: <div class='feed-container'> is missing from your HTML!");
        return;
    }

    let allEquipment = []; 

    // ==========================================
    // 1. FETCH DATA FROM SERVER
    // ==========================================
    async function fetchEquipment() {
        try {
            feedContainer.innerHTML = '<p style="text-align:center; padding:20px;">Fetching live equipment from database...</p>';
            console.log("📡 Requesting data from backend...");

            const response = await fetch('http://localhost:3000/api/equipment');
            const result = await response.json();

            console.log("📦 Data received:", result);

            if (result.success) {
                allEquipment = result.data; 
                renderCards(allEquipment);  
            } else {
                feedContainer.innerHTML = `<p style="color:red; text-align:center;">Failed to load: ${result.message}</p>`;
            }
        } catch (error) {
            console.error('Fetch error:', error);
            feedContainer.innerHTML = '<p style="text-align:center;">Cannot connect to the server. Is Node.js running?</p>';
        }
    }

    // ==========================================
    // 2. RENDER HTML CARDS DYNAMICALLY
    // ==========================================
    function renderCards(equipmentList) {
        if (equipmentList.length === 0) {
            feedContainer.innerHTML = '<p style="text-align:center; padding:20px;">No equipment found in the database. Go add some!</p>';
            return;
        }

        // Clear container and add header
        feedContainer.innerHTML = `<p style="font-size:0.8rem; color:gray; margin-bottom:10px;">Showing ${equipmentList.length} tools near you</p>`;

        equipmentList.forEach(item => {
            const cardHTML = `
                <a href="item-details.html?id=${item.EquipmentID}" class="equipment-card" style="display:block; border:1px solid #ddd; padding:15px; border-radius:8px; margin-bottom:15px; text-decoration:none; color:black;">
                    <h3 style="margin:0 0 10px 0; color:#2C5530;">${item.Category}</h3>
                    <p style="margin:0; font-size:0.9rem;">📍 ${item.District_Location}</p>
                    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid #eee;">
                        <span style="font-weight:bold; color:#2C5530;">₹${item.Daily_Price} / day</span>
                        <span style="font-size:0.8rem; color:gray;">by ${item.OwnerName}</span>
                    </div>
                </a>
            `;
            feedContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // ==========================================
    // 3. SEARCH & FILTER LOGIC
    // ==========================================
    function applyFilters() {
        if (!searchInput || !districtFilter) return; // Skip if inputs are missing

        const searchTerm = searchInput.value.toLowerCase();
        const selectedDistrict = districtFilter.value.toLowerCase();

        const filteredData = allEquipment.filter(item => {
            const searchString = `${item.Category} ${item.OwnerName}`.toLowerCase();
            const matchesSearch = searchString.includes(searchTerm);
            const matchesDistrict = selectedDistrict.includes('all') || item.District_Location.toLowerCase() === selectedDistrict;
            return matchesSearch && matchesDistrict;
        });

        renderCards(filteredData);
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (districtFilter) districtFilter.addEventListener('change', applyFilters);

    // GO!
    fetchEquipment();
});