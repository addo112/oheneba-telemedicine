require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MONGODB CONNECTION ---
// We will use process.env.MONGODB_URI. If not provided, we will just log a warning and not crash immediately.
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB database successfully!');
}).catch((err) => {
    console.error('Failed to connect to MongoDB. Have you set MONGODB_URI?');
    console.error(err.message);
});

// --- MONGOOSE SCHEMAS ---

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'patient' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const AppointmentSchema = new mongoose.Schema({
    patient: { type: String, required: true },
    doctor: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, default: 'Upcoming' },
    createdAt: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', AppointmentSchema);

const PrescriptionSchema = new mongoose.Schema({
    patient: { type: String, required: true },
    medication: { type: String, required: true },
    pharmacy: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Prescription = mongoose.model('Prescription', PrescriptionSchema);

const MessageSchema = new mongoose.Schema({
    patient: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    reply: { type: String, default: '' },
    status: { type: String, default: 'Unread' },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);


// --- REST API ENDPOINTS ---

// AUTH: Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const newUser = new User({ name, email, password, role: 'patient' });
        await newUser.save();
        
        res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: 'Signup failed. Check database connection.' });
    }
});

// AUTH: Log In
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Hardcoded secure doctor login
        if (email === 'doctor@oheneba.com' && password === 'admin123') {
            return res.json({ success: true, user: { name: 'Oheneba Ntim-Barimah', email: 'doctor@oheneba.com', role: 'doctor' } });
        }

        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: 'Login failed. Check database connection.' });
    }
});

// APPOINTMENTS: Get All
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// APPOINTMENTS: Book New
app.post('/api/appointments/book', async (req, res) => {
    try {
        const { doctor, date, time, type, patient } = req.body;
        const newApt = new Appointment({
            patient: patient || "Unknown Patient",
            doctor,
            date,
            time,
            type
        });
        await newApt.save();
        res.status(201).json({ success: true, appointment: newApt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// APPOINTMENTS: Update Status
app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await Appointment.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// PRESCRIPTIONS: Get All
app.get('/api/prescriptions', async (req, res) => {
    try {
        const prescriptions = await Prescription.find().sort({ createdAt: -1 });
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

// PRESCRIPTIONS: Request New
app.post('/api/prescriptions/request', async (req, res) => {
    try {
        const { medication, pharmacy, notes, patient } = req.body;
        const newPrescription = new Prescription({
            patient: patient || "Unknown Patient",
            medication,
            pharmacy,
            notes
        });
        await newPrescription.save();
        res.json({ success: true, message: "Prescription requested" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to request prescription' });
    }
});

// PRESCRIPTIONS: Update Status
app.put('/api/prescriptions/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await Prescription.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update prescription' });
    }
});

// MESSAGES: Get All
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// MESSAGES: Send New
app.post('/api/messages/send', async (req, res) => {
    try {
        const { subject, body, patient } = req.body;
        const newMessage = new Message({
            patient: patient || "Unknown Patient",
            subject,
            body
        });
        await newMessage.save();
        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// MESSAGES: Reply
app.put('/api/messages/:id/reply', async (req, res) => {
    try {
        const { reply } = req.body;
        await Message.findByIdAndUpdate(req.params.id, {
            reply: reply,
            status: 'Replied'
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reply to message' });
    }
});

// PAYMENTS: Mock Initialization
app.post('/api/payments/initialize', (req, res) => {
    const { amount, email, method } = req.body;
    res.json({
        success: true,
        message: "Payment initialized",
        authorization_url: "https://checkout.paystack.com/mock-url",
        reference: `REF_${Math.floor(Math.random() * 1000000)}`
    });
});
app.post('/api/payments/dashboard', (req, res) => {
    const { amount, method, account } = req.body;
    console.log(`[API] Payment initiated: GHS ${amount} via ${method}`);
    res.json({ success: true, reference: "PAY-" + Math.floor(Math.random() * 100000) });
});


// --- REAL-TIME VIDEO SIGNALING (WebRTC + Socket.io) ---

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`${userId} joined room: ${roomId}`);
        
        socket.to(roomId).emit('user-connected', userId);

        socket.on('offer', (offer) => {
            socket.to(roomId).emit('offer', offer);
        });

        socket.on('answer', (answer) => {
            socket.to(roomId).emit('answer', answer);
        });

        socket.on('ice-candidate', (candidate) => {
            socket.to(roomId).emit('ice-candidate', candidate);
        });

        socket.on('disconnect-room', () => {
            socket.to(roomId).emit('user-disconnected', userId);
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
