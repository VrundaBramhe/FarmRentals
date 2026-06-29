document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get the Equipment ID from the URL (e.g., ?id=1)
  const urlParams = new URLSearchParams(window.location.search);
  const equipmentId = urlParams.get("id");

  if (!equipmentId) {
    document.body.innerHTML =
      '<h2 style="padding: 20px; text-align: center;">Equipment not found.</h2>';
    return;
  }

  // 2. DOM Elements
  const titleEl = document.querySelector(".details-title");
  const priceEl = document.querySelector(".details-price");
  const ownerEl = document.querySelector(".owner-info p:first-child");
  const ownerAvatar = document.querySelector(".owner-avatar");
  const locationBadge = document.querySelector(".badge-pending");
  const mainImageEl = document.querySelector("img");

  const startDateInput = document.querySelectorAll('input[type="date"]')[0];
  const endDateInput = document.querySelectorAll('input[type="date"]')[1];
  const costDisplay = document.querySelector(".cost-estimate strong");
  const requestBtn = document.querySelector(".booking-console .btn-primary");

  // --- CALENDAR LOCK LOGIC (Frontend UI Restriction) ---
  const today = new Date().toISOString().split("T")[0];
  if (startDateInput) startDateInput.setAttribute("min", today);
  if (endDateInput) endDateInput.setAttribute("min", today);

  // Ensure End Date is always >= Start Date
  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      if (endDateInput) {
        endDateInput.setAttribute("min", startDateInput.value);
      }
    });
  }

  let dailyRate = 0;
  let calculatedTotal = 0;

  // 3. Fetch specific equipment details from the server
  try {
    const response = await fetch(`/api/equipment/${equipmentId}`);
    const result = await response.json();

    if (result.success) {
      const item = result.data;
      dailyRate = item.Daily_Price;

      // --- UPDATED BULLETPROOF IMAGE LOGIC ---
      if (mainImageEl) {
        if (item.ImageURL) {
          if (item.ImageURL.startsWith("http")) {
            // It's a Cloudinary URL (or any external URL)
            mainImageEl.src = item.ImageURL;
          } else if (item.ImageURL.startsWith("uploads/")) {
            // It's an old local file
            mainImageEl.src = `http://localhost:3000/${item.ImageURL}`;
          } else {
            // Fallback
            mainImageEl.src = "https://placehold.co/800x400?text=No+Image";
          }
        } else {
          mainImageEl.src = "https://placehold.co/800x400?text=No+Image";
        }
      }

      // Populate the UI with real data
      if (titleEl) titleEl.innerText = item.Category;
      if (priceEl) priceEl.innerText = `₹${item.Daily_Price} / day`;
      if (ownerEl) ownerEl.innerText = item.OwnerName;
      if (ownerAvatar)
        ownerAvatar.innerText = item.OwnerName.charAt(0).toUpperCase();
      if (locationBadge)
        locationBadge.innerHTML = `📍 ${item.District_Location}`;

      const descEl = document.getElementById("dynamic-description");
      if (descEl)
        descEl.innerText =
          item.Description || "No description provided by the owner.";

      const userJSON = localStorage.getItem("farmUser");
      if (userJSON) {
        const currentUser = JSON.parse(userJSON);
        if (currentUser.id === item.OwnerID) {
          const bookingConsole = document.querySelector(".booking-console");
          if (bookingConsole) {
            bookingConsole.innerHTML = `
                            <div style="padding: 20px; text-align: center; background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px;">
                                <h4 style="color: #2C5530; margin-bottom: 5px;">This is your listing</h4>
                                <p style="color: #666; margin: 0; font-size: 0.9rem;">You cannot rent your own equipment.</p>
                            </div>
                        `;
          }
        }
      }
    } else {
      alert("Could not load equipment details.");
    }
  } catch (error) {
    console.error(error);
    alert("Server connection failed.");
  }

  // 4. The Math Logic (Recalculates when dates change)
  function calculateCost() {
    if (
      startDateInput &&
      endDateInput &&
      startDateInput.value &&
      endDateInput.value
    ) {
      const start = new Date(startDateInput.value);
      const end = new Date(endDateInput.value);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      // Block Time Travel
      if (start < todayDate) {
        calculatedTotal = 0;
        if (costDisplay) costDisplay.innerText = "₹0";
        alert("Start date cannot be in the past.");
        startDateInput.value = "";
        return;
      }

      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        calculatedTotal = diffDays * dailyRate;
        if (costDisplay)
          costDisplay.innerText = `₹${calculatedTotal.toLocaleString("en-IN")}`;
      } else {
        calculatedTotal = 0;
        if (costDisplay) costDisplay.innerText = "₹0";
        alert("End date cannot be before the start date.");
      }
    }
  }

  if (startDateInput) startDateInput.addEventListener("change", calculateCost);
  if (endDateInput) endDateInput.addEventListener("change", calculateCost);

  // 5. Send the Booking Request!
  if (requestBtn) {
    requestBtn.addEventListener("click", async () => {
      const token = localStorage.getItem("farmToken");

      if (!token) {
        alert("You must be logged in to book equipment.");
        localStorage.setItem("returnUrl", window.location.href);
        window.location.href = "index.html";
        return;
      }

      if (
        !startDateInput.value ||
        !endDateInput.value ||
        calculatedTotal === 0
      ) {
        alert("Please select valid rental dates.");
        return;
      }

      requestBtn.innerText = "Sending Request...";
      requestBtn.disabled = true;

      try {
        const response = await fetch("/api/rentals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            equipmentId: equipmentId,
            startDate: startDateInput.value,
            endDate: endDateInput.value,
          }),
        });

        const result = await response.json();

        if (result.success) {
          alert("Booking request sent successfully!");
          window.location.href = "my-rentals.html";
        } else {
          alert("Error: " + result.message);
          requestBtn.innerText = "Request to Rent";
          requestBtn.disabled = false;
        }
      } catch (error) {
        console.error(error);
        alert("Failed to send booking request.");
        requestBtn.innerText = "Request to Rent";
        requestBtn.disabled = false;
      }
    });
  }
});
