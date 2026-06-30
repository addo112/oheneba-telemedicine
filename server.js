require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
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

const Appointment = mongoose.model('Appointment', AppointmentSchema);

// --- REST API ENDPOINTS ---

// Get Appointments
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        
        // If DB is empty, return some default mock data for demonstration purposes
        if (appointments.length === 0) {
            return res.json([
                { _id: '1', patient: "John Doe", doctor: "Dr. Sarah Mensah", date: "2026-07-15", time: "10:00 AM", type: "Video Call", status: "Upcoming" },
                { _id: '2', patient: "John Doe", doctor: "Dr. Kwame Osei", date: "2026-07-22", time: "02:30 PM", type: "In-Person", status: "Upcoming" }
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
        const { doctor, date, time, type } = req.body;
        const newApt = new Appointment({
            patient: "John Doe", // Mock auth user for MVP
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
    console.log(`Oheneba Center Telemedicine Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
