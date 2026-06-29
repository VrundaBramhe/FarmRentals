document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".manage-list");
  if (!container) return;

  const userJSON = localStorage.getItem("farmUser");
  if (!userJSON) {
    window.location.href = "index.html";
    return;
  }
  const user = JSON.parse(userJSON);

  async function fetchInventory() {
    try {
      const response = await fetch(`/api/inventory/${user.id}`);
      const result = await response.json();
      if (result.success) renderInventory(result.data);
    } catch (error) {
      container.innerHTML = "Error loading inventory.";
    }
  }

  function renderInventory(items) {
    if (items.length === 0) {
      container.innerHTML =
        '<p style="text-align:center;">No equipment listed.</p>';
      return;
    }

    container.innerHTML = "";
    items.forEach((item) => {
      // --- THE BULLETPROOF IMAGE LOGIC ---
      // Replace your existing 'imagePath' logic with this one-liner:
      let imagePath = "https://placehold.co/300x200?text=No+Image";

      if (item.ImageURL) {
        // If it's a Cloudinary URL (starts with https), use it as is
        if (item.ImageURL.startsWith("http")) {
          imagePath = item.ImageURL;
        }
        // If it's an old local upload (starts with uploads/), prepend localhost
        else if (item.ImageURL.startsWith("uploads/")) {
          imagePath = `http://localhost:3000/${item.ImageURL}`;
        }
      }

      const cardHTML = `
              <div class="manage-item">
                <div class="manage-item-top">
                  <img src="${imagePath}" alt="${item.Category}" class="manage-thumb" style="width:80px; height:80px; object-fit:cover;">
                  <div class="manage-item-info">
                    <p class="manage-item-name">${item.Category}</p>
                    <p class="manage-item-price">₹${item.Daily_Price} / day</p>
                    <p class="manage-item-district">${item.District_Location}</p>
                  </div>
                </div>
                <div class="manage-item-actions">
                  <button class="action-btn delete" onclick="deleteItem(${item.EquipmentID})">Delete</button>
                  <button class="action-btn edit" onclick="alert('Feature coming soon!')">Edit</button>
                </div>
              </div>
            `;
      container.insertAdjacentHTML("beforeend", cardHTML);
    });
  }

  window.deleteItem = async (equipmentId) => {
    if (!confirm("Are you sure?")) return;
    const token = localStorage.getItem("farmToken");
    const response = await fetch(`/api/equipment/${equipmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (result.success) fetchInventory();
    else alert(result.message);
  };

  fetchInventory();
});
