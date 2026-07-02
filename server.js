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

// --- MOCK DATABASE (In-Memory for MVP Prototype) ---
// Since there is no MONGODB_URI provided on Render, we will use in-memory arrays
// so the prototype works perfectly without needing a database setup.

const db = {
    users: [],
    appointments: [
        { _id: '1', patient: "John Doe", doctor: "Oheneba Ntim-Barimah", date: "2026-07-15", time: "10:00 AM", type: "Video Call", status: "Upcoming", createdAt: new Date() },
        { _id: '2', patient: "John Doe", doctor: "Oheneba Ntim-Barimah", date: "2026-07-22", time: "02:30 PM", type: "In-Person (Madina Centre)", status: "Upcoming", createdAt: new Date() }
    ],
    prescriptions: [],
    messages: []
};

// --- REST API ENDPOINTS ---

// --- AUTH ENDPOINTS ---
app.post('/api/auth/signup', (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = db.users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const newUser = { id: Date.now().toString(), name, email, password, role: 'patient' };
        db.users.push(newUser);
        
        res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        // Hardcode doctor check
        if (email === 'doctor@oheneba.com' && password === 'admin123') {
            return res.json({ success: true, user: { name: 'Oheneba Ntim-Barimah', email: 'doctor@oheneba.com', role: 'doctor' } });
        }

        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Appointments
app.get('/api/appointments', (req, res) => {
    try {
        const sortedApts = [...db.appointments].sort((a, b) => b.createdAt - a.createdAt);
        res.json(sortedApts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Book Appointment
app.post('/api/appointments/book', (req, res) => {
    try {
        const { doctor, date, time, type, patient } = req.body;
        const newApt = {
            _id: Date.now().toString(),
            patient: patient || "Unknown Patient",
            doctor,
            date,
            time,
            type,
            status: "Upcoming",
            createdAt: new Date()
        };
        db.appointments.push(newApt);
        res.status(201).json({ success: true, appointment: newApt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// Update Appointment Status
app.put('/api/appointments/:id', (req, res) => {
    try {
        const { status } = req.body;
        const apt = db.appointments.find(a => a._id === req.params.id);
        if (apt) apt.status = status;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Get Prescriptions
app.get('/api/prescriptions', (req, res) => {
    try {
        const sortedPrescriptions = [...db.prescriptions].sort((a, b) => b.createdAt - a.createdAt);
        res.json(sortedPrescriptions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

// Request Prescription
app.post('/api/prescriptions/request', (req, res) => {
    try {
        const { medication, pharmacy, notes, patient } = req.body;
        const newPrescription = {
            _id: Date.now().toString(),
            patient: patient || "Unknown Patient",
            medication,
            pharmacy,
            notes,
            status: "Pending",
            createdAt: new Date()
        };
        db.prescriptions.push(newPrescription);
        res.json({ success: true, message: "Prescription requested" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to request prescription' });
    }
});

// Update Prescription Status
app.put('/api/prescriptions/:id', (req, res) => {
    try {
        const { status } = req.body;
        const reqItem = db.prescriptions.find(p => p._id === req.params.id);
        if (reqItem) reqItem.status = status;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update prescription' });
    }
});

// Get Messages
app.get('/api/messages', (req, res) => {
    try {
        const sortedMessages = [...db.messages].sort((a, b) => b.createdAt - a.createdAt);
        res.json(sortedMessages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send Message
app.post('/api/messages/send', (req, res) => {
    try {
        const { subject, body, patient } = req.body;
        const newMessage = {
            _id: Date.now().toString(),
            patient: patient || "Unknown Patient",
            subject,
            body,
            status: "Unread",
            createdAt: new Date()
        };
        db.messages.push(newMessage);
        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Reply to Message
app.put('/api/messages/:id/reply', (req, res) => {
    try {
        const { reply } = req.body;
        const msg = db.messages.find(m => m._id === req.params.id);
        if (msg) {
            msg.reply = reply;
            msg.status = 'Replied';
        }
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
