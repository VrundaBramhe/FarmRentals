document.addEventListener('DOMContentLoaded', async () => {
    // Target your specific HTML container
    const container = document.querySelector('.manage-list');
    
    if (!container) {
        console.error("Missing <div class='manage-list'> in your HTML.");
        return;
    }

    const userJSON = localStorage.getItem('farmUser');
    if (!userJSON) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userJSON);

    // 1. Fetch data from server
    async function fetchInventory() {
        try {
            container.innerHTML = '<p style="text-align: center; padding: 20px;">Loading your garage...</p>';
            const response = await fetch(`http://localhost:3000/api/inventory/${user.id}`);
            const result = await response.json();

            if (result.success) {
                renderInventory(result.data);
            } else {
                container.innerHTML = `<p style="color: red; text-align: center;">Error: ${result.message}</p>`;
            }
        } catch (error) {
            console.error(error);
            container.innerHTML = '<p style="text-align: center;">Cannot connect to the server.</p>';
        }
    }

    // 2. Draw the list using your beautiful CSS classes
    function renderInventory(items) {
        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: #666; margin-bottom: 15px;">You have no equipment listed right now.</p>
                    <a href="add-equipment.html" style="background: #2C5530; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">List New Tool</a>
                </div>
            `;
            return;
        }

        container.innerHTML = ''; // Clear out the hardcoded placeholders

        items.forEach(item => {
            const cardHTML = `
              <div class="manage-item">
                <div class="manage-item-top">
                  <img src="assets/images/placeholder.jpg" alt="${item.Category}" class="manage-thumb">
                  <div class="manage-item-info">
                    <p class="manage-item-name">${item.Category}</p>
                    <p class="manage-item-price">₹${item.Daily_Price} / day</p>
                    <p class="manage-item-district">${item.District_Location}</p>
                  </div>
                </div>
                <div class="manage-item-actions">
                  <button class="action-btn delete" onclick="deleteItem(${item.EquipmentID})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                  </button>
                  <button class="action-btn edit" onclick="alert('Edit feature coming soon!')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </button>
                </div>
              </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // 3. Delete logic
    window.deleteItem = async (equipmentId) => {
        if (!confirm("Are you sure you want to permanently delete this listing?")) return;

        try {
            const response = await fetch(`http://localhost:3000/api/equipment/${equipmentId}`, { 
                method: 'DELETE' 
            });
            const result = await response.json();
            
            if (result.success) {
                fetchInventory(); // Instantly re-draws the list without the deleted item
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to delete the item. It might have active booking requests tied to it.");
        }
    };

    // Go!
    fetchInventory();
});