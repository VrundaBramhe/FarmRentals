// document.addEventListener('DOMContentLoaded', () => {
    
//     // 1. Grab the date inputs and the total cost text element
//     const dateInputs = document.querySelectorAll('.date-inputs-row input[type="date"]');
    
//     // If we aren't on the details page, stop running the script
//     if (dateInputs.length < 2) return; 

//     const startDateInput = dateInputs[0];
//     const endDateInput = dateInputs[1];
//     const costDisplay = document.querySelector('.cost-estimate strong');

//     // 2. Extract the daily price from the HTML (Looks for "₹800 / day" and grabs the 800)
//     const priceText = document.querySelector('.details-price').innerText;
//     const dailyRate = parseInt(priceText.match(/\d+/)[0], 10);

//     // 3. The Calculator Function
//     function calculateCost() {
//         // Only run if both dates are filled out
//         if (startDateInput.value && endDateInput.value) {
//             const start = new Date(startDateInput.value);
//             const end = new Date(endDateInput.value);

//             // Make sure the end date isn't BEFORE the start date!
//             if (end >= start) {
//                 // Calculate the difference in milliseconds
//                 const diffTime = Math.abs(end - start);
                
//                 // Convert milliseconds to days (1000ms * 60s * 60m * 24h)
//                 // We add 1 so a same-day rental (e.g., 10th to 10th) counts as 1 full day
//                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
//                 // Calculate total and format it with commas
//                 const totalCost = diffDays * dailyRate;
//                 costDisplay.innerText = `₹${totalCost.toLocaleString('en-IN')}`;
//             } else {
//                 costDisplay.innerText = '₹0';
//                 alert("End date cannot be before the start date.");
//             }
//         }
//     }

//     // 4. Tell the inputs to listen for changes
//     startDateInput.addEventListener('change', calculateCost);
//     endDateInput.addEventListener('change', calculateCost);
// });




document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Get the Equipment ID from the URL (e.g., ?id=1)
    const urlParams = new URLSearchParams(window.location.search);
    const equipmentId = urlParams.get('id');

    if (!equipmentId) {
        document.body.innerHTML = '<h2 style="padding: 20px; text-align: center;">Equipment not found.</h2>';
        return;
    }

    // 2. DOM Elements
    const titleEl = document.querySelector('.details-title');
    const priceEl = document.querySelector('.details-price');
    const ownerEl = document.querySelector('.owner-info p:first-child');
    const ownerAvatar = document.querySelector('.owner-avatar');
    const locationBadge = document.querySelector('.badge-pending');
    
    const startDateInput = document.querySelectorAll('input[type="date"]')[0];
    const endDateInput = document.querySelectorAll('input[type="date"]')[1];
    const costDisplay = document.querySelector('.cost-estimate strong');
    const requestBtn = document.querySelector('.booking-console .btn-primary');

    let dailyRate = 0;
    let calculatedTotal = 0;

    // 3. Fetch specific equipment details from the server
    try {
        const response = await fetch(`http://localhost:3000/api/equipment/${equipmentId}`);
        const result = await response.json();

        if (result.success) {
            const item = result.data;
            dailyRate = item.Daily_Price;
            
            // Populate the UI with real data
            titleEl.innerText = item.Category;
            priceEl.innerText = `₹${item.Daily_Price} / day`;
            ownerEl.innerText = item.OwnerName;
            ownerAvatar.innerText = item.OwnerName.charAt(0).toUpperCase();
            locationBadge.innerHTML = `📍 ${item.District_Location}`;
            // --- NEW: Inject the real description ---
            const descEl = document.getElementById('dynamic-description');
            if (descEl) descEl.innerText = item.Description || "No description provided by the owner.";

            // --- NEW EDGE CASE PATCH ---
            // Check if the logged-in user owns this specific item
            const userJSON = localStorage.getItem('farmUser');
            if (userJSON) {
                const currentUser = JSON.parse(userJSON);
                
                // Compare the logged-in user's ID with the item's OwnerID
                if (currentUser.id === item.OwnerID) {
                    // Hide the date pickers and the button
                    const bookingConsole = document.querySelector('.booking-console');
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
            // ---------------------------
        } else {
            alert('Could not load equipment details.');
        }
    } catch (error) {
        console.error(error);
        alert('Server connection failed.');
    }

    // 4. The Math Logic (Recalculates when dates change)
    function calculateCost() {
        if (startDateInput.value && endDateInput.value) {
            const start = new Date(startDateInput.value);
            const end = new Date(endDateInput.value);

            if (end >= start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                calculatedTotal = diffDays * dailyRate;
                costDisplay.innerText = `₹${calculatedTotal.toLocaleString('en-IN')}`;
            } else {
                calculatedTotal = 0;
                costDisplay.innerText = '₹0';
                alert("End date cannot be before the start date.");
            }
        }
    }

    startDateInput.addEventListener('change', calculateCost);
    endDateInput.addEventListener('change', calculateCost);

    // 5. Send the Booking Request!
    requestBtn.addEventListener('click', async () => {
        // Check if user is logged in
        const userJSON = localStorage.getItem('farmUser');
        if (!userJSON) {
            alert('You must be logged in to book equipment.');
            window.location.href = 'index.html';
            return;
        }

        const user = JSON.parse(userJSON);

        if (!startDateInput.value || !endDateInput.value || calculatedTotal === 0) {
            alert('Please select valid rental dates.');
            return;
        }

        requestBtn.innerText = 'Sending Request...';
        requestBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/rentals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipmentId: equipmentId,
                    renterId: user.id, // ID from the logged-in user!
                    startDate: startDateInput.value,
                    endDate: endDateInput.value,
                    totalCost: calculatedTotal
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('Booking request sent successfully!');
                window.location.href = 'my-rentals.html'; // Send them to the tracking hub
            } else {
                alert('Error: ' + result.message);
                requestBtn.innerText = 'Request to Rent';
                requestBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('Failed to send booking request.');
            requestBtn.innerText = 'Request to Rent';
            requestBtn.disabled = false;
        }
    });
});