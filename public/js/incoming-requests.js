document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("requests-container");
  if (!container) return;

  // 1. Verify Identity
  const userJSON = localStorage.getItem("farmUser");
  if (!userJSON) {
    window.location.href = "index.html";
    return;
  }
  const user = JSON.parse(userJSON);

  // 2. Fetch Incoming Requests
  async function fetchRequests() {
    try {
      const response = await fetch(`/api/requests/${user.id}`);
      const result = await response.json();

      if (result.success) {
        renderRequests(result.data);
      } else {
        container.innerHTML = `<p style="color: red;">Error: ${result.message}</p>`;
      }
    } catch (error) {
      console.error(error);
      container.innerHTML = "<p>Cannot connect to the server.</p>";
    }
  }

  // 3. Render the UI
  function renderRequests(requests) {
    if (requests.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 20px;">You have no incoming requests at the moment.</p>';
      return;
    }

    container.innerHTML = ""; // Clear loading text

    requests.forEach((req) => {
      const start = new Date(req.StartDate).toLocaleDateString("en-IN");
      const end = new Date(req.EndDate).toLocaleDateString("en-IN");

      // If it is already processed, just show a badge instead of buttons
      let actionHTML = "";
      if (req.Status === "Pending") {
        actionHTML = `
                    <button class="btn-approve" onclick="updateStatus(${req.RentalID}, 'Approved')">Approve Request</button>
                    <button class="btn-reject" onclick="updateStatus(${req.RentalID}, 'Rejected')">Reject</button>
                `;
      } else {
        const bgColor = req.Status === "Approved" ? "#e8f5e9" : "#ffebee";
        const textColor = req.Status === "Approved" ? "#2e7d32" : "#c62828";
        actionHTML = `<div class="status-badge" style="background:${bgColor}; color:${textColor};">${req.Status}</div>`;
      }

      const card = `
                <div class="request-card">
                    <div class="request-details">
                        <h3>${req.Category}</h3>
                        <p><strong>Renter:</strong> ${req.RenterName} (📞 ${req.RenterPhone})</p>
                        <p><strong>Dates:</strong> ${start} to ${end}</p>
                        <p><strong>Estimated Payout:</strong> ₹${req.Total_Cost.toLocaleString("en-IN")}</p>
                    </div>
                    <div class="request-actions">
                        ${actionHTML}
                    </div>
                </div>
            `;
      container.insertAdjacentHTML("beforeend", card);
    });
  }

  // 4. Handle Approvals/Rejections
  // We attach this to the 'window' object so the inline onclick HTML can trigger it
  // 4. SECURE Handle Approvals/Rejections
  window.updateStatus = async (rentalId, newStatus) => {
    if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`))
      return;

    // Grab the token from storage
    const token = localStorage.getItem("farmToken");

    try {
      const response = await fetch(`/api/rentals/${rentalId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Show the wristband!
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        fetchRequests();
      } else {
        alert("Error updating status: " + result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update the database.");
    }
  };

  // Initialize
  fetchRequests();
});
