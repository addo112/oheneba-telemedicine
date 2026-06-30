// Socket.io Integration for Real-Time Video
let socket;
let localStream;
let remoteStream;
let peerConnection;
const roomId = 'room-123'; // Static room for MVP

// WebRTC STUN Servers
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.8)';
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // Interactive Payment Methods
    const methodBtns = document.querySelectorAll('.method-btn');
    const mockInput = document.querySelector('.mock-input');
    const payBtn = document.querySelector('#payBtn');

    if (methodBtns.length > 0) {
        methodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                methodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (btn.innerText.includes('MoMo')) {
                    mockInput.innerText = '024 XXX XXXX';
                } else {
                    mockInput.innerText = '4123 4567 8901 2345';
                }
            });
        });
    }

    if (payBtn) {
        payBtn.addEventListener('click', async () => {
            payBtn.innerText = 'Processing...';
            try {
                const res = await fetch('/api/payments/initialize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 250, email: "user@example.com", method: "momo" })
                });
                const data = await res.json();
                if (data.success) {
                    alert(`Payment Initialized! Redirecting to Paystack secure checkout (Ref: ${data.reference})...`);
                    payBtn.innerText = 'Pay Now';
                }
            } catch (err) {
                console.error(err);
                alert("Error connecting to payment gateway.");
                payBtn.innerText = 'Pay Now';
            }
        });
    }

    // Call End Button Demo
    const endCallBtn = document.querySelector('.end-call');
    const videoStatus = document.querySelector('.video-placeholder span');
    
    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => {
            if (peerConnection) {
                peerConnection.close();
            }
            if (socket) {
                socket.disconnect();
            }
            videoStatus.innerText = 'Call Ended.';
            document.querySelector('.status.online').style.display = 'none';
        });
    }

    // Load Appointments on Dashboard
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('dashboard')) {
        loadAppointments();
    }
    
    // Sidebar interaction demo
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const allPanels = document.querySelectorAll('.dashboard-panel');
    
    if (sidebarItems.length > 0) {
        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if(item.innerText.includes('Log Out')) return; // let href handle it
                e.preventDefault();
                
                // Update active sidebar style
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Switch panel
                const moduleName = item.innerText.trim();
                if (allPanels.length > 0) {
                    allPanels.forEach(panel => panel.style.display = 'none');
                    const targetPanel = document.getElementById(`panel-${moduleName}`);
                    if (targetPanel) {
                        targetPanel.style.display = 'block';
                    } else {
                        // Fallback to overview if not found
                        const overview = document.getElementById('panel-Overview');
                        if(overview) overview.style.display = 'block';
                    }
                }
            });
        });
    }

    // Action buttons interaction demo & Modal logic
    const actionBtns = document.querySelectorAll('.action-btn');
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModal = document.getElementById('closeBookingModal');
    const bookingForm = document.getElementById('bookingForm');

    if (actionBtns.length > 0) {
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const actionName = btn.querySelector('span').innerText;
                
                if (actionName === 'Book New Appointment') {
                    if(bookingModal) bookingModal.classList.add('show');
                } else {
                    alert(`Module in progress: ${actionName}`);
                }
            });
        });
    }

    if (closeBookingModal) {
        closeBookingModal.addEventListener('click', () => {
            bookingModal.classList.remove('show');
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBookingBtn');
            submitBtn.innerText = 'Booking...';
            
            const doctor = document.getElementById('docSelect').value;
            const type = document.getElementById('typeSelect').value;
            const date = document.getElementById('dateInput').value;
            const time = document.getElementById('timeInput').value;
            
            try {
                const res = await fetch('/api/appointments/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ doctor, type, date, time })
                });
                
                const data = await res.json();
                if (data.success) {
                    alert("Appointment booked successfully!");
                    bookingModal.classList.remove('show');
                    bookingForm.reset();
                    loadAppointments(); // Reload list
                } else {
                    alert("Failed to book appointment.");
                }
            } catch (err) {
                console.error(err);
                alert("Error connecting to server.");
            } finally {
                submitBtn.innerText = 'Confirm Booking';
            }
        });
    }
});

async function loadAppointments() {
    try {
        const response = await fetch('/api/appointments');
        const appointments = await response.json();
        const container = document.getElementById('appointmentsList');
        
        if (container && appointments.length > 0) {
            container.innerHTML = '';
            appointments.forEach(apt => {
                const dateObj = new Date(apt.date);
                const month = dateObj.toLocaleString('default', { month: 'short' });
                const day = dateObj.getDate();
                
                container.innerHTML += `
                <div class="appointment-card">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <div class="apt-date">
                            <small>${month}</small>
                            <span>${day}</span>
                        </div>
                        <div class="apt-info">
                            <h4>${apt.doctor}</h4>
                            <p>${apt.type} • ${apt.status}</p>
                            <p style="font-size: 0.8rem; margin-top: 4px;"><i class="fa-regular fa-clock"></i> ${apt.time}</p>
                        </div>
                    </div>
                    ${apt.type === 'Video Call' ? 
                        `<button class="btn btn-primary" onclick="joinVideoCall()"><i class="fa-solid fa-video"></i> Join</button>` : 
                        `<button class="btn btn-outline">Details</button>`}
                </div>
                `;
            });
        }
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}

// Socket.io + WebRTC logic for Video Calling
async function joinVideoCall() {
    const videoStatus = document.querySelector('.video-placeholder span');
    if (videoStatus) videoStatus.innerText = 'Requesting Camera...';
    
    alert("In a real environment, this would request your camera and connect to the doctor via Socket.io & WebRTC!");
    
    // Check if io is defined (needs script tag in html)
    if (typeof io !== 'undefined') {
        socket = io('/');
        
        const userId = 'patient-' + Math.floor(Math.random() * 1000);
        socket.emit('join-room', roomId, userId);
        
        socket.on('user-connected', (id) => {
            console.log('User connected: ' + id);
            // In a real app, we would initiate WebRTC offer here
        });
    }
}
