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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'farm_rentals',
    allowed_formats: ['jpg', 'png', 'webp'],
  },
});

const upload = multer({ storage: storage });

// ==========================================
// SECURITY MIDDLEWARE: Verify JWT Token
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. Please log in.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'farm_super_secret_key_2026', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid or expired session.' });
        req.user = user;
        next();
    });
};

// ==========================================
// 1. REGISTRATION API
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, phone, password } = req.body;
        if (!fullName || !phone || !password) return res.status(400).json({ success: false, message: 'All fields are required.' });

        const [existingUsers] = await db.execute('SELECT * FROM users WHERE PhoneNumber = ?', [phone]);
        if (existingUsers.length > 0) return res.status(400).json({ success: false, message: 'Phone number already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.execute(
            'INSERT INTO users (FullName, PhoneNumber, PasswordHash) VALUES (?, ?, ?)',
            [fullName, phone, hashedPassword]
        );

        res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// ==========================================
// 2. LOGIN API
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE PhoneNumber = ?', [phone]);
        
        if (users.length === 0) return res.status(401).json({ success: false, message: 'Invalid phone number or password.' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid phone number or password.' });

        const token = jwt.sign(
            { id: user.UserID, name: user.FullName, phone: user.PhoneNumber }, 
            process.env.JWT_SECRET || 'farm_super_secret_key_2026', 
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            success: true, 
            token: token,
            user: { id: user.UserID, name: user.FullName, phone: user.PhoneNumber }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ==========================================
// 3. EQUIPMENT API
// ==========================================
app.get('/api/equipment', async (req, res) => {
    try {
        const query = `
            SELECT e.EquipmentID, e.Category, e.Daily_Price, e.District_Location, e.Status, e.ImageURL, u.FullName AS OwnerName 
            FROM equipment e
            JOIN users u ON e.OwnerID = u.UserID
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
// 4. SINGLE EQUIPMENT API
// ==========================================
app.get('/api/equipment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT e.*, u.FullName AS OwnerName 
            FROM equipment e
            JOIN users u ON e.OwnerID = u.UserID
            WHERE e.EquipmentID = ?
        `;
        const [equipment] = await db.execute(query, [id]);
        if (equipment.length === 0) return res.status(404).json({ success: false, message: 'Equipment not found' });
        res.status(200).json({ success: true, data: equipment[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==========================================
// 5. CREATE RENTAL API
// ==========================================
app.post('/api/rentals', authenticateToken, async (req, res) => {
    try {
        const { equipmentId, startDate, endDate } = req.body;
        const renterId = req.user.id;

        const todayString = new Date().toISOString().split('T')[0];
        if (startDate < todayString || endDate < startDate) return res.status(400).json({ success: false, message: 'Invalid dates.' });

        const [equipment] = await db.execute('SELECT Daily_Price, OwnerID FROM equipment WHERE EquipmentID = ?', [equipmentId]);
        if (equipment.length === 0) return res.status(404).json({ success: false, message: 'Equipment not found.' });
        if (equipment[0].OwnerID === renterId) return res.status(403).json({ success: false, message: 'You cannot rent your own equipment.' });
            
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        const trueTotalCost = diffDays * equipment[0].Daily_Price;

        const [overlaps] = await db.execute(`
            SELECT RentalID FROM rentals 
            WHERE EquipmentID = ? AND Status = 'Approved'
            AND StartDate <= ? AND EndDate >= ?
        `, [equipmentId, endDate, startDate]);

        if (overlaps.length > 0) return res.status(409).json({ success: false, message: 'This equipment is already booked.' });

        await db.execute(
            'INSERT INTO rentals (EquipmentID, RenterID, StartDate, EndDate, Total_Cost, Status) VALUES (?, ?, ?, ?, ?, "Pending")',
            [equipmentId, renterId, startDate, endDate, trueTotalCost]
        );

        res.status(201).json({ success: true, message: 'Booking requested!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
});

// ==========================================
// 6. ADD EQUIPMENT API
// ==========================================
app.post('/api/equipment', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { category, description, dailyPrice, district } = req.body;
        const ownerId = req.user.id;
        const imageUrl = req.file ? req.file.path : 'https://placehold.co/800x400?text=No+Image';

        await db.execute(
            'INSERT INTO equipment (OwnerID, Category, Description, Daily_Price, District_Location, ImageURL, Status) VALUES (?, ?, ?, ?, ?, ?, "Available")',
            [ownerId, category, description, dailyPrice, district, imageUrl]
        );
        res.status(201).json({ success: true, message: 'Listed successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add equipment.' });
    }
});

// ==========================================
// 7. FETCH RENTER'S BOOKINGS
// ==========================================
app.get('/api/rentals/renter/:userId', async (req, res) => {
    try {
        const query = `
            SELECT r.RentalID, r.StartDate, r.EndDate, r.Status, e.Category, e.ImageURL, u.PhoneNumber AS OwnerPhone 
            FROM rentals r
            JOIN equipment e ON r.EquipmentID = e.EquipmentID
            JOIN users u ON e.OwnerID = u.UserID
            WHERE r.RenterID = ?
            ORDER BY r.RentalID DESC
        `;
        const [rentals] = await db.execute(query, [req.params.userId]);
        res.status(200).json({ success: true, data: rentals });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load bookings.' });
    }
});

// ==========================================
// 8. FETCH INCOMING REQUESTS
// ==========================================
app.get('/api/requests/:ownerId', async (req, res) => {
    try {
        const query = `
            SELECT r.RentalID, r.StartDate, r.EndDate, r.Status, r.Total_Cost, e.Category, e.ImageURL, u.FullName AS RenterName, u.PhoneNumber AS RenterPhone 
            FROM rentals r
            JOIN equipment e ON r.EquipmentID = e.EquipmentID
            JOIN users u ON r.RenterID = u.UserID
            WHERE e.OwnerID = ?
            ORDER BY r.RentalID DESC
        `;
        const [requests] = await db.execute(query, [req.params.ownerId]);
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load requests.' });
    }
});

// ==========================================
// 9. UPDATE BOOKING STATUS
// ==========================================
app.put('/api/rentals/:rentalId/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const [rentalData] = await db.execute(`
            SELECT e.OwnerID FROM rentals r JOIN equipment e ON r.EquipmentID = e.EquipmentID WHERE r.RentalID = ?
        `, [req.params.rentalId]);

        if (rentalData.length === 0 || rentalData[0].OwnerID !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await db.execute('UPDATE rentals SET Status = ? WHERE RentalID = ?', [status, req.params.rentalId]);
        res.status(200).json({ success: true, message: `Status updated.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update.' });
    }
});

// ==========================================
// 10. FETCH OWNER'S INVENTORY
// ==========================================
app.get('/api/inventory/:ownerId', async (req, res) => {
    try {
        const [equipment] = await db.execute('SELECT * FROM equipment WHERE OwnerID = ? ORDER BY EquipmentID DESC', [req.params.ownerId]);
        res.status(200).json({ success: true, data: equipment });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load inventory.' });
    }
});

// ==========================================
// 11. DELETE EQUIPMENT
// ==========================================
app.delete('/api/equipment/:id', authenticateToken, async (req, res) => {
    try {
        const [equipment] = await db.execute('SELECT OwnerID FROM equipment WHERE EquipmentID = ?', [req.params.id]);
        if (equipment.length === 0 || equipment[0].OwnerID !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        const [activeRentals] = await db.execute('SELECT RentalID FROM rentals WHERE EquipmentID = ? AND Status IN ("Pending", "Approved")', [req.params.id]);
        if (activeRentals.length > 0) return res.status(400).json({ success: false, message: 'Cannot delete: active bookings exist.' });

        await db.execute('DELETE FROM equipment WHERE EquipmentID = ?', [req.params.id]);
        res.status(200).json({ success: true, message: 'Deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});