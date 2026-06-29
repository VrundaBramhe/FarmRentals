// Wait for the HTML to fully load before running the script
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Grab the HTML elements we need to manipulate
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    
    // Grab the links that the user will click to toggle views
    const showRegisterLink = document.querySelector('#login-section .auth-footer-link a');
    const showLoginLink = document.querySelector('#register-section .auth-footer-link a');

    // 2. Function to show Registration and hide Login
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault(); // Stops the page from refreshing
            loginSection.style.display = 'none';
            registerSection.style.display = 'block';
        });
    }

    // 3. Function to show Login and hide Registration
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault(); // Stops the page from refreshing
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        });
    }

    // ==========================================
    // 1. REGISTRATION LOGIC (Sending data to backend)
    // ==========================================
    const registerBtn = document.querySelector('#register-section .btn-primary');
    // Grabs all 4 inputs: [0] Name, [1] Phone, [2] Password, [3] Confirm
    const registerInputs = document.querySelectorAll('#register-section .input-field'); 

    if (registerBtn) {
        registerBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Stop the page from reloading
            
            const fullName = registerInputs[0].value.trim();
            const phone = registerInputs[1].value.trim();
            const password = registerInputs[2].value;
            const confirmPassword = registerInputs[3].value;

            // Basic checks before bothering the server
            if (!fullName || !phone || !password) return alert("Please fill in all fields.");
            if (password !== confirmPassword) return alert("Passwords do not match!");

            try {
                registerBtn.innerText = "Creating..."; // Show loading state

                // Send the data to our Node.js server!
                const response = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, phone, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Account created successfully! You can now log in.");
                    // Clear the form and switch to login view
                    registerInputs.forEach(input => input.value = '');
                    document.getElementById('register-section').style.display = 'none';
                    document.getElementById('login-section').style.display = 'block';
                } else {
                    alert("Error: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Failed to connect to the server. Is Node.js running?");
            } finally {
                registerBtn.innerText = "Create My Account"; // Reset button text
            }
        });
    }

    // ==========================================
    // 2. LOGIN LOGIC (Authenticating and Redirecting)
    // ==========================================
    const loginBtn = document.querySelector('#login-section .btn-primary');
    // Grabs the 2 inputs: [0] Phone, [1] Password
    const loginInputs = document.querySelectorAll('#login-section .input-field'); 

    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const phone = loginInputs[0].value.trim();
            const password = loginInputs[1].value;

            if (!phone || !password) return alert("Please enter both phone and password.");

            try {
                loginBtn.innerText = "Logging in...";

                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Save the user data to the browser's memory so they stay logged in!
                    localStorage.setItem('farmUser', JSON.stringify(data.user));
                    
                    alert("Welcome back, " + data.user.name + "!");
                    
                    // MAGIC: Redirect the user to the marketplace feed!
                    window.location.href = "dashboard.html";
                } else {
                    alert("Login failed: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Failed to connect to the server.");
            } finally {
                loginBtn.innerText = "Log In";
            }
        });
    }
});