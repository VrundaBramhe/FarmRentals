const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
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
// IMAGE UPLOAD CONFIGURATION (Multer)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Save files to this folder
    },
    filename: (req, file, cb) => {
        // Give the file a unique name (timestamp + original extension)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// ==========================================
// SECURITY MIDDLEWARE: Verify JWT Token
// ==========================================
const authenticateToken = (req, res, next) => {
    // Look for the token in the headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. Please log in.' });
    }

    // Verify the token is real and hasn't been tampered with
    jwt.verify(token, process.env.JWT_SECRET || 'farm_super_secret_key_2026', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid or expired session.' });
        
        req.user = user; // Attach the verified user data to the request
        next(); // Let them pass to the actual API route
    });
};

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
// 2. LOGIN API (Authenticate User & Give Token)
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

        // --- SPRINT 1 SECURITY PATCH: Generate the VIP Wristband (JWT) ---
        const token = jwt.sign(
            { id: user.UserID, name: user.FullName, phone: user.PhoneNumber }, 
            process.env.JWT_SECRET || 'farm_super_secret_key_2026', 
            { expiresIn: '24h' } // Token expires in 1 day
        );

        // Success! Send back the token AND user data
        res.status(200).json({ 
            success: true, 
            message: 'Login successful!',
            token: token,
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
// ==========================================
// 5. CREATE RENTAL API (Booking Request - SECURED)
// ==========================================
app.post('/api/rentals', authenticateToken, async (req, res) => {
    try {
        // We only accept the equipment ID and the dates from the frontend now.
        const { equipmentId, startDate, endDate } = req.body;
        const renterId = req.user.id; // SECURE: Get ID from the verified JWT token!

        // 1. Fetch the real Daily_Price from the database
        const [equipment] = await db.execute('SELECT Daily_Price, OwnerID FROM Equipment WHERE EquipmentID = ?', [equipmentId]);
        if (equipment.length === 0) return res.status(404).json({ success: false, message: 'Equipment not found.' });
        
        // Prevent owners from renting their own tools via API hacking
        if (equipment[0].OwnerID === renterId) {
            return res.status(403).json({ success: false, message: 'You cannot rent your own equipment.' });
        }

        // 2. Server-Side Math: Calculate the true cost
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include the start day
        
        if (diffDays <= 0) return res.status(400).json({ success: false, message: 'Invalid dates.' });
        
        const trueTotalCost = diffDays * equipment[0].Daily_Price;

        // 3. Prevent Double Booking: Check for overlapping 'Approved' dates
        const [overlaps] = await db.execute(`
            SELECT RentalID FROM Rentals 
            WHERE EquipmentID = ? AND Status = 'Approved'
            AND StartDate <= ? AND EndDate >= ?
        `, [equipmentId, endDate, startDate]);

        if (overlaps.length > 0) {
            return res.status(409).json({ success: false, message: 'This equipment is already booked for these dates.' });
        }

        // 4. Save the verified, secure booking to the database
        await db.execute(
            'INSERT INTO Rentals (EquipmentID, RenterID, StartDate, EndDate, Total_Cost) VALUES (?, ?, ?, ?, ?)',
            [equipmentId, renterId, startDate, endDate, trueTotalCost]
        );

        res.status(201).json({ success: true, message: 'Booking requested successfully!' });
    } catch (error) {
        console.error('Booking Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
});

// ==========================================
// 6. ADD EQUIPMENT API (Now with Image Upload!)
// ==========================================
// Notice the 'upload.single("image")' and 'authenticateToken'
app.post('/api/equipment', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { category, description, dailyPrice, district } = req.body;
        const ownerId = req.user.id; // Securely get owner ID from token

        // Data Validation
        if (dailyPrice <= 0) return res.status(400).json({ success: false, message: 'Price must be a positive number.' });
        
        const validDistricts = ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'];
        if (!validDistricts.includes(district)) return res.status(400).json({ success: false, message: 'Invalid district selected.' });

        // Check if an image was actually uploaded
        let imageUrl = 'assets/images/placeholder.jpg'; // Default fallback
        if (req.file) {
            imageUrl = `uploads/${req.file.filename}`; // The new path!
        }

        // NOTE: We need to update our database to store the image URL.
        // We will do this via MySQL Workbench in a moment.
        await db.execute(
            'INSERT INTO Equipment (OwnerID, Category, Description, Daily_Price, District_Location, ImageURL, Status) VALUES (?, ?, ?, ?, ?, ?, "Available")',
            [ownerId, category, description, dailyPrice, district, imageUrl]
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
// SPRINT 1 PATCH: Added authenticateToken and Ownership Verification
app.put('/api/rentals/:rentalId/status', authenticateToken, async (req, res) => {
    try {
        const { rentalId } = req.params;
        const { status } = req.body; 

        // 1. Verify that the logged-in user actually owns the equipment attached to this rental
        const [rentalData] = await db.execute(`
            SELECT e.OwnerID 
            FROM Rentals r
            JOIN Equipment e ON r.EquipmentID = e.EquipmentID
            WHERE r.RentalID = ?
        `, [rentalId]);

        if (rentalData.length === 0) return res.status(404).json({ success: false, message: 'Rental request not found.' });

        if (rentalData[0].OwnerID !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Security Alert: You can only approve requests for your own equipment.' });
        }

        // 2. Update the status
        await db.execute('UPDATE Rentals SET Status = ? WHERE RentalID = ?', [status, rentalId]);

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
// 11. DELETE EQUIPMENT (Secured & Graceful)
// ==========================================
app.delete('/api/equipment/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Check who owns this equipment
        const [equipment] = await db.execute('SELECT OwnerID FROM Equipment WHERE EquipmentID = ?', [id]);
        
        if (equipment.length === 0) {
            return res.status(404).json({ success: false, message: 'Equipment not found.' });
        }

        // 2. Verify Identity (Are you the owner?)
        if (equipment[0].OwnerID !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Security Alert: You can only delete your own equipment.' });
        }

        // --- SPRINT 3 PATCH: Graceful Dependency Check ---
        // 3. Look for any pending or approved bookings for this specific tool
        const [activeRentals] = await db.execute(
            'SELECT RentalID FROM Rentals WHERE EquipmentID = ? AND Status IN ("Pending", "Approved")', 
            [id]
        );

        // If bookings exist, gracefully block the deletion BEFORE the database crashes
        if (activeRentals.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete this tool. It has active or pending bookings. Please reject or complete them first.' 
            });
        }
        // ------------------------------------------------

        // 4. Safe to Delete
        await db.execute('DELETE FROM Equipment WHERE EquipmentID = ?', [id]);
        res.status(200).json({ success: true, message: 'Equipment deleted successfully.' });
        
    } catch (error) {
        console.error('Delete Equipment Error:', error);
        res.status(500).json({ success: false, message: 'Server error during deletion.' });
    }
});

// ==========================================
// START THE SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FarmRentals server is running live on http://localhost:${PORT}`);
});