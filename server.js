const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import our database connection
const db = require('./database.js');

const app = express();

// Middleware: Allows our server to understand JSON and talk to the frontend
app.use(cors());
app.use(express.json());

// Crucial: This tells the server to display your frontend files!
app.use(express.static('public'));


// ==========================================
// 1. REGISTRATION API (Create Account)
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, phone, password } = req.body;

        // Check if this phone number is already registered
        const [existingUsers] = await db.execute('SELECT * FROM Users WHERE PhoneNumber = ?', [phone]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'Phone number already registered.' });
        }

        // Scramble (hash) the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save the new farmer to the database
        await db.execute(
            'INSERT INTO Users (FullName, PhoneNumber, PasswordHash) VALUES (?, ?, ?)',
            [fullName, phone, hashedPassword]
        );

        res.status(201).json({ success: true, message: 'Account created successfully!' });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});


// ==========================================
// 2. LOGIN API (Authenticate User)
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Find the user by their phone number
        const [users] = await db.execute('SELECT * FROM Users WHERE PhoneNumber = ?', [phone]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid phone number or password.' });
        }

        const user = users[0];

        // Compare the typed password with the scrambled password in the database
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid phone number or password.' });
        }

        // Success! Send back the user data
        res.status(200).json({ 
            success: true, 
            message: 'Login successful!',
            user: {
                id: user.UserID,
                name: user.FullName,
                phone: user.PhoneNumber
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});


// ==========================================
// 3. EQUIPMENT API (Fetch Marketplace Data)
// ==========================================
app.get('/api/equipment', async (req, res) => {
    try {
        // JOIN to get the owner's name along with the equipment details
        const query = `
            SELECT 
                e.EquipmentID, 
                e.Category, 
                e.Daily_Price, 
                e.District_Location, 
                e.Status,
                u.FullName AS OwnerName 
            FROM Equipment e
            JOIN Users u ON e.OwnerID = u.UserID
            WHERE e.Status = 'Available'
        `;
        
        const [equipment] = await db.execute(query);
        
        res.status(200).json({ success: true, data: equipment });

    } catch (error) {
        console.error('Fetch Equipment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load equipment.' });
    }
});


// ==========================================
// 4. SINGLE EQUIPMENT API (For Details Page)
// ==========================================
app.get('/api/equipment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT e.*, u.FullName AS OwnerName 
            FROM Equipment e
            JOIN Users u ON e.OwnerID = u.UserID
            WHERE e.EquipmentID = ?
        `;
        const [equipment] = await db.execute(query, [id]);
        
        if (equipment.length === 0) {
            return res.status(404).json({ success: false, message: 'Equipment not found' });
        }
        
        res.status(200).json({ success: true, data: equipment[0] });
    } catch (error) {
        console.error('Fetch Single Equipment Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// ==========================================
// 5. CREATE RENTAL API (Booking Request)
// ==========================================
app.post('/api/rentals', async (req, res) => {
    try {
        const { equipmentId, renterId, startDate, endDate, totalCost } = req.body;

        await db.execute(
            'INSERT INTO Rentals (EquipmentID, RenterID, StartDate, EndDate, Total_Cost) VALUES (?, ?, ?, ?, ?)',
            [equipmentId, renterId, startDate, endDate, totalCost]
        );

        res.status(201).json({ success: true, message: 'Booking requested successfully!' });
    } catch (error) {
        console.error('Booking Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
});

// ==========================================
// 6. ADD EQUIPMENT API (Owner uploads a tool)
// ==========================================
app.post('/api/equipment', async (req, res) => {
    try {
        const { ownerId, category, description, dailyPrice, district } = req.body;

        await db.execute(
            'INSERT INTO Equipment (OwnerID, Category, Description, Daily_Price, District_Location, Status) VALUES (?, ?, ?, ?, ?, "Available")',
            [ownerId, category, description, dailyPrice, district]
        );

        res.status(201).json({ success: true, message: 'Equipment listed successfully!' });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ success: false, message: 'Failed to add equipment.' });
    }
});

// ==========================================
// 7. FETCH RENTER'S BOOKINGS API
// ==========================================
app.get('/api/rentals/renter/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Grab the booking info, the equipment name, and the owner's phone number
        const query = `
            SELECT 
                r.RentalID, r.StartDate, r.EndDate, r.Status, 
                e.Category, 
                u.PhoneNumber AS OwnerPhone 
            FROM Rentals r
            JOIN Equipment e ON r.EquipmentID = e.EquipmentID
            JOIN Users u ON e.OwnerID = u.UserID
            WHERE r.RenterID = ?
            ORDER BY r.RentalID DESC
        `;
        
        const [rentals] = await db.execute(query, [userId]);
        res.status(200).json({ success: true, data: rentals });
        
    } catch (error) {
        console.error('Fetch Rentals Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load bookings.' });
    }
});
// ==========================================
// 8. FETCH INCOMING REQUESTS (For the Owner)
// ==========================================
app.get('/api/requests/:ownerId', async (req, res) => {
    try {
        const { ownerId } = req.params;
        
        // We use a JOIN to get the Renter's name and phone number, plus the tool info
        const query = `
            SELECT 
                r.RentalID, r.StartDate, r.EndDate, r.Status, r.Total_Cost,
                e.Category, 
                u.FullName AS RenterName, u.PhoneNumber AS RenterPhone 
            FROM Rentals r
            JOIN Equipment e ON r.EquipmentID = e.EquipmentID
            JOIN Users u ON r.RenterID = u.UserID
            WHERE e.OwnerID = ?
            ORDER BY r.RentalID DESC
        `;
        
        const [requests] = await db.execute(query, [ownerId]);
        res.status(200).json({ success: true, data: requests });
        
    } catch (error) {
        console.error('Fetch Incoming Requests Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load requests.' });
    }
});

// ==========================================
// 9. UPDATE BOOKING STATUS (Approve/Reject)
// ==========================================
app.put('/api/rentals/:rentalId/status', async (req, res) => {
    try {
        const { rentalId } = req.params;
        const { status } = req.body; // Expects "Approved" or "Rejected"

        // Update the status in the database
        await db.execute(
            'UPDATE Rentals SET Status = ? WHERE RentalID = ?',
            [status, rentalId]
        );

        res.status(200).json({ success: true, message: `Booking marked as ${status}.` });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status.' });
    }
});

// ==========================================
// 10. FETCH OWNER'S INVENTORY
// ==========================================
app.get('/api/inventory/:ownerId', async (req, res) => {
    try {
        const { ownerId } = req.params;
        const [equipment] = await db.execute('SELECT * FROM Equipment WHERE OwnerID = ? ORDER BY EquipmentID DESC', [ownerId]);
        res.status(200).json({ success: true, data: equipment });
    } catch (error) {
        console.error('Fetch Inventory Error:', error);
        res.status(500).json({ success: false, message: 'Failed to load inventory.' });
    }
});

// ==========================================
// 11. DELETE EQUIPMENT
// ==========================================
app.delete('/api/equipment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM Equipment WHERE EquipmentID = ?', [id]);
        res.status(200).json({ success: true, message: 'Equipment deleted successfully.' });
    } catch (error) {
        console.error('Delete Equipment Error:', error);
        // If the tool is currently rented, MySQL will block the deletion for safety!
        res.status(500).json({ success: false, message: 'Cannot delete equipment that has active booking records.' });
    }
});



// ==========================================
// START THE SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FarmRentals server is running live on http://localhost:${PORT}`);
});