require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// --- NEW QUICK ACTION ENDPOINTS --- //

// Handle Prescription Refill Requests
app.post('/api/prescriptions/request', async (req, res) => {
    try {
        const { medication, pharmacy, notes, patient } = req.body;
        const newPrescription = new PrescriptionRequest({
            patient: patient || "Unknown Patient",
            medication,
            pharmacy,
            notes,
            status: "Pending"
        });
        await newPrescription.save();
        res.json({ success: true, message: "Prescription requested" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to request prescription' });
    }
});

// Handle Messaging Doctor
app.post('/api/messages/send', async (req, res) => {
    try {
        const { subject, body, patient } = req.body;
        const newMessage = new Message({
            patient: patient || "Unknown Patient",
            subject,
            body,
            status: "Unread"
        });
        await newMessage.save();
        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Handle Dashboard Payments
app.post('/api/payments/dashboard', (req, res) => {
    const { amount, method, account } = req.body;
    console.log(`[API] Payment initiated: GHS ${amount} via ${method}`);
    // In a real app, integrate with Paystack/Hubtel API
    res.json({ success: true, reference: "PAY-" + Math.floor(Math.random() * 100000) });
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MONGODB CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicine';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- MONGOOSE SCHEMAS ---
const AppointmentSchema = new mongoose.Schema({
    patient: { type: String, required: true },
    doctor: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, default: 'Upcoming' },
    createdAt: { type: Date, default: Date.now }
});

const PrescriptionRequestSchema = new mongoose.Schema({
    patient: { type: String, required: true },
    medication: { type: String, required: true },
    pharmacy: { type: String, required: true },
    notes: { type: String },
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
    patient: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    reply: { type: String },
    status: { type: String, default: 'Unread' },
    createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'patient' }, // 'patient' or 'doctor'
    createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', AppointmentSchema);
const PrescriptionRequest = mongoose.model('PrescriptionRequest', PrescriptionRequestSchema);
const Message = mongoose.model('Message', MessageSchema);
const User = mongoose.model('User', UserSchema);

// --- REST API ENDPOINTS ---

// --- AUTH ENDPOINTS ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Simple check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const newUser = new User({ name, email, password, role: 'patient' });
        await newUser.save();
        
        res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Hardcode doctor check for MVP (or check DB if doctor exists)
        if (email === 'doctor@oheneba.com' && password === 'admin123') {
            return res.json({ success: true, user: { name: 'Oheneba Ntim-Barimah', email: 'doctor@oheneba.com', role: 'doctor' } });
        }

        const user = await User.findOne({ email, password }); // In a real app, use bcrypt!
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Appointments
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        
        // If DB is empty, return some default mock data for demonstration purposes
        if (appointments.length === 0) {
            return res.json([
                { _id: '1', patient: "John Doe", doctor: "Oheneba Ntim-Barimah", date: "2026-07-15", time: "10:00 AM", type: "Video Call", status: "Upcoming" },
                { _id: '2', patient: "John Doe", doctor: "Oheneba Ntim-Barimah", date: "2026-07-22", time: "02:30 PM", type: "In-Person (Madina Centre)", status: "Upcoming" }
            ]);
        }
        
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Book Appointment
app.post('/api/appointments/book', async (req, res) => {
    try {
        const { doctor, date, time, type, patient } = req.body;
        const newApt = new Appointment({
            patient: patient || "Unknown Patient",
            doctor,
            date,
            time,
            type,
            status: "Upcoming"
        });
        await newApt.save();
        res.status(201).json({ success: true, appointment: newApt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// Update Appointment Status
app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await Appointment.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Get Prescriptions
app.get('/api/prescriptions', async (req, res) => {
    try {
        const prescriptions = await PrescriptionRequest.find().sort({ createdAt: -1 });
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

// Update Prescription Status
app.put('/api/prescriptions/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await PrescriptionRequest.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update prescription' });
    }
});

// Get Messages
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Reply to Message
app.put('/api/messages/:id/reply', async (req, res) => {
    try {
        const { reply } = req.body;
        await Message.findByIdAndUpdate(req.params.id, { reply, status: 'Replied' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reply to message' });
    }
});

// Mock Paystack Initialization
app.post('/api/payments/initialize', (req, res) => {
    const { amount, email, method } = req.body;
    // In a real app, this would securely call Paystack API using process.env.PAYSTACK_SECRET_KEY
    res.json({
        success: true,
        message: "Payment initialized",
        authorization_url: "https://checkout.paystack.com/mock-url",
        reference: `REF_${Math.floor(Math.random() * 1000000)}`
    });
});

// --- REAL-TIME VIDEO SIGNALING (WebRTC + Socket.io) ---

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a video consultation room
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`${userId} joined room: ${roomId}`);
        
        // Notify others in the room
        socket.to(roomId).emit('user-connected', userId);

        socket.on('offer', (offer, userId) => {
            socket.to(roomId).emit('offer', offer, userId);
        });

        socket.on('answer', (answer, userId) => {
            socket.to(roomId).emit('answer', answer, userId);
        });

        socket.on('ice-candidate', (candidate, userId) => {
            socket.to(roomId).emit('ice-candidate', candidate, userId);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Soul Health & Wellness Centre Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
