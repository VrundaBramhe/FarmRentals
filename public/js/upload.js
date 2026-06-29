document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.querySelector('.add-body .btn-primary');
    
    // BULLETPROOF SELECTORS: Grab by exact HTML element type
    const nameInput = document.querySelector('input[type="text"]');
    const typeSelect = document.querySelectorAll('select')[0];
    const descInput = document.querySelector('textarea');
    const priceInput = document.querySelector('input[type="number"]');
    const districtSelect = document.querySelectorAll('select')[1];

    if (!submitBtn) return; // Stop if we aren't on the Add Equipment page

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // 1. Check if the user is logged in
        const userJSON = localStorage.getItem('farmUser');
        if (!userJSON) {
            alert("You must be logged in to list equipment.");
            window.location.href = 'index.html';
            return;
        }
        const user = JSON.parse(userJSON);

        // 2. Validate inputs safely
        const category = (typeSelect && typeSelect.value !== 'Select type') ? typeSelect.value : nameInput.value;
        const description = descInput ? descInput.value.trim() : "No description provided";
        const dailyPrice = priceInput ? priceInput.value : 0;
        const district = districtSelect.value;

        if (!category || !dailyPrice || district.includes('Select')) {
            alert("Please fill out the equipment name, price, and select a district.");
            return;
        }

        // 3. Send the data to the backend
        try {
            submitBtn.innerText = "Uploading...";
            submitBtn.disabled = true;

            const response = await fetch('http://localhost:3000/api/equipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerId: user.id,
                    category: category,
                    description: description,
                    dailyPrice: dailyPrice,
                    district: district
                })
            });

            const result = await response.json();

            if (result.success) {
                alert("Success! Your equipment is now live on the marketplace.");
                window.location.href = 'dashboard.html'; 
            } else {
                alert("Error: " + result.message);
                submitBtn.innerText = "List My Equipment";
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to connect to the server.");
            submitBtn.innerText = "List My Equipment";
            submitBtn.disabled = false;
        }
    });
});