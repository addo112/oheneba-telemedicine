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

// --- MOCK DATABASE (In-Memory for MVP Prototype) ---
// We are using this so the app works instantly on Render without needing MongoDB Atlas configured!

const db = {
    users: [],
    appointments: [],
    prescriptions: [],
    messages: []
};


// --- REST API ENDPOINTS ---

// AUTH: Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = db.users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const newUser = { _id: Date.now().toString(), name, email, password, role: 'patient', createdAt: new Date() };
        db.users.push(newUser);
        
        res.status(201).json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ error: 'Signup failed.' });
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

        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed.' });
    }
});

// APPOINTMENTS: Get All
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = [...db.appointments].sort((a, b) => b.createdAt - a.createdAt);
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// APPOINTMENTS: Book New
app.post('/api/appointments/book', async (req, res) => {
    try {
        const { doctor, date, time, type, patient } = req.body;
        const newApt = {
            _id: Date.now().toString(),
            patient: patient || "Unknown Patient",
            doctor,
            date,
            time,
            type,
            status: 'Upcoming',
            createdAt: new Date()
        };
        db.appointments.push(newApt);
        res.status(201).json({ success: true, appointment: newApt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// APPOINTMENTS: Update Status
app.put('/api/appointments/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const apt = db.appointments.find(a => a._id === req.params.id);
        if (apt) apt.status = status;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// PRESCRIPTIONS: Get All
app.get('/api/prescriptions', async (req, res) => {
    try {
        const prescriptions = [...db.prescriptions].sort((a, b) => b.createdAt - a.createdAt);
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

// PRESCRIPTIONS: Request New
app.post('/api/prescriptions/request', async (req, res) => {
    try {
        const { medication, pharmacy, notes, patient } = req.body;
        const newPrescription = {
            _id: Date.now().toString(),
            patient: patient || "Unknown Patient",
            medication,
            pharmacy,
            notes,
            status: 'Pending',
            createdAt: new Date()
        };
        db.prescriptions.push(newPrescription);
        res.json({ success: true, message: "Prescription requested" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to request prescription' });
    }
});

// PRESCRIPTIONS: Update Status
app.put('/api/prescriptions/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const reqItem = db.prescriptions.find(p => p._id === req.params.id);
        if (reqItem) reqItem.status = status;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update prescription' });
    }
});

// MESSAGES: Get All
app.get('/api/messages', async (req, res) => {
    try {
        const messages = [...db.messages].sort((a, b) => b.createdAt - a.createdAt);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// MESSAGES: Send New
app.post('/api/messages/send', async (req, res) => {
    try {
        const { subject, body, patient } = req.body;
        const newMessage = {
            _id: Date.now().toString(),
            patient: patient || "Unknown Patient",
            subject,
            body,
            reply: '',
            status: 'Unread',
            createdAt: new Date()
        };
        db.messages.push(newMessage);
        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// MESSAGES: Reply
app.put('/api/messages/:id/reply', async (req, res) => {
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
