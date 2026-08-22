const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// Setup uploads folder for photos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage for uploaded complaint photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `report-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// In-Memory Database (or connect to MongoDB / PostgreSQL)
let reportsDB = [
  {
    id: 'REP-1092',
    userPhone: '+919876543210',
    issueType: 'Dark Area / No Lights',
    location: 'College Road, Near Girls Hostel',
    latitude: 28.6139,
    longitude: 77.2090,
    notes: 'Road pitch dark after 9 PM. Streetlights not working.',
    imageUrl: null,
    status: 'inReview',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'REP-1088',
    userPhone: '+919876543210',
    issueType: 'Multiple Lights Non-Functional',
    location: 'Station Link Road, Pillar 42',
    latitude: 28.6180,
    longitude: 77.2150,
    notes: '3 poles in a row not working. Flickering since yesterday.',
    imageUrl: null,
    status: 'inRepair',
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
];

let darkZonesDB = [
  {
    id: 'DZ-1',
    roadName: 'College Road (Hostel Stretch)',
    latitude: 28.6155,
    longitude: 77.2110,
    riskLevel: 'critical',
    riskScore: 91,
    totalLights: 8,
    workingLights: 2,
    faultyLights: 6,
    estimatedFootfall: 'High',
    activeReports: 14,
  },
  {
    id: 'DZ-2',
    roadName: 'Station Link Underpass',
    latitude: 28.6190,
    longitude: 77.2160,
    riskLevel: 'high',
    riskScore: 84,
    totalLights: 12,
    workingLights: 4,
    faultyLights: 8,
    estimatedFootfall: 'High',
    activeReports: 9,
  },
];

// --- ROUTES ---

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'TARA Night Safety API' });
});

// 2. Auth: Send OTP
app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  console.log(`[AUTH] OTP requested for phone: ${phone}`);
  res.json({ success: true, message: 'OTP sent to mobile number', otpDemo: '123456' });
});

// 3. Auth: Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  console.log(`[AUTH] Verifying OTP ${otp} for phone: ${phone}`);
  res.json({
    success: true,
    token: `jwt_token_${Date.now()}`,
    user: { phone, name: 'TARA Citizen' },
  });
});

// 4. Reports: Submit Complaint (supports Photo Upload)
app.post('/api/reports', upload.single('photo'), (req, res) => {
  const { issueType, location, latitude, longitude, notes, userPhone } = req.body;

  const newReport = {
    id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
    userPhone: userPhone || '+919876543210',
    issueType: issueType || 'Broken Streetlight',
    location: location || 'Pinned GPS Location',
    latitude: parseFloat(latitude) || 28.6139,
    longitude: parseFloat(longitude) || 77.2090,
    notes: notes || '',
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    status: 'logged',
    createdAt: new Date().toISOString(),
  };

  reportsDB.unshift(newReport);
  console.log(`[REPORTS] New complaint created: ${newReport.id} at ${newReport.location}`);

  res.status(201).json(newReport);
});

// 5. Reports: Get List of Complaints
app.get('/api/reports', (req, res) => {
  const { phone } = req.query;
  if (phone) {
    const filtered = reportsDB.filter((r) => r.userPhone === phone);
    return res.json(filtered);
  }
  res.json(reportsDB);
});

// 6. Reports: Update Complaint Status (Used by Admin Dashboard / Municipality)
app.patch('/api/reports/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'inReview', 'inRepair', 'resolved'

  const report = reportsDB.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.status = status;
  console.log(`[REPORTS] Report ${id} updated to status: ${status}`);
  res.json(report);
});

// 7. Dark Zones: Get All Active Dark Corridors
app.get('/api/dark-zones', (req, res) => {
  res.json(darkZonesDB);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TARA Backend API running on http://localhost:${PORT}`);
});
