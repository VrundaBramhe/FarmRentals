document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Dashboard script loaded!");

  const feedContainer = document.querySelector(".feed-container");
  const searchInput = document.querySelector(".search-input-wrapper input");
  const districtFilter = document.querySelector(".filter-select");

  if (!feedContainer) return;

  let allEquipment = [];

  async function fetchEquipment() {
    try {
      feedContainer.innerHTML =
        '<p style="text-align:center; padding:20px;">Fetching live equipment...</p>';
      const response = await fetch("/api/equipment");
      const result = await response.json();

      if (result.success) {
        allEquipment = result.data;
        renderCards(allEquipment);
      } else {
        feedContainer.innerHTML = `<p style="color:red; text-align:center;">Failed to load: ${result.message}</p>`;
      }
    } catch (error) {
      feedContainer.innerHTML =
        '<p style="text-align:center;">Cannot connect to the server.</p>';
    }
  }

  function renderCards(equipmentList) {
    if (equipmentList.length === 0) {
      feedContainer.innerHTML =
        '<p style="text-align:center; padding:20px;">No equipment found.</p>';
      return;
    }

    feedContainer.innerHTML = `<p class="feed-header">Showing ${equipmentList.length} tools near you</p>`;

    equipmentList.forEach((item) => {
      // --- THE BULLETPROOF IMAGE LOGIC ---
      // If the database has a real uploaded image, force it to load from the Node Server (Port 3000)
      // If it's old data or missing, use a free web placeholder so it never breaks.
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
                <a href="item-details.html?id=${item.EquipmentID}" class="equipment-card" style="display:block; border:1px solid #ddd; padding:15px; border-radius:8px; margin-bottom:15px; text-decoration:none; color:black;">
                    <img src="${imagePath}" alt="${item.Category}" style="width:100%; height:150px; object-fit:cover; border-radius:4px; margin-bottom:10px;">
                    <h3 style="margin:0 0 10px 0; color:#2C5530;">${item.Category}</h3>
                    <p style="margin:0; font-size:0.9rem;">📍 ${item.District_Location}</p>
                    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid #eee;">
                        <span style="font-weight:bold; color:#2C5530;">₹${item.Daily_Price} / day</span>
                        <span style="font-size:0.8rem; color:gray;">by ${item.OwnerName}</span>
                    </div>
                </a>
            `;
      feedContainer.insertAdjacentHTML("beforeend", cardHTML);
    });
  }

  function applyFilters() {
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const districtFilterValue = districtFilter ? districtFilter.value : "";

    const filtered = allEquipment.filter((item) => {
      const matchesSearch = item.Category.toLowerCase().includes(searchTerm);
      const matchesDistrict =
        districtFilterValue === "" ||
        item.District_Location === districtFilterValue;
      return matchesSearch && matchesDistrict;
    });

    renderCards(filtered);
  }

  // Debouncing
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFilters, 300);
    });
  }
  if (districtFilter) districtFilter.addEventListener("change", applyFilters);

  fetchEquipment();
});
