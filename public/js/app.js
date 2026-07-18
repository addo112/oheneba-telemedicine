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
    // --- AUTHENTICATION CHECK ---
    const isPublicPage = window.location.pathname.includes('index.html') || window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html') || window.location.pathname === '/' || window.location.pathname === '';
    
    const userData = localStorage.getItem('user');
    let currentUser = null;
    
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
        } catch (e) {
            console.error("Invalid user data");
        }
    }

    if (!currentUser && !isPublicPage) {
        window.location.href = 'login.html';
        return;
    }
    
    // Dynamic UI Updates for logged-in user
    if (currentUser && !isPublicPage) {
        const welcomeMessage = document.getElementById('welcomeMessage');
        const profileName = document.getElementById('profileName');
        const profileRole = document.getElementById('profileRole');
        const profileAvatar = document.getElementById('profileAvatar');
        const settingsName = document.getElementById('settingsName');
        
        if (welcomeMessage) {
            welcomeMessage.innerText = `Welcome, ${currentUser.name.split(' ')[0]}!`;
        }
        if (profileName) {
            profileName.innerText = currentUser.name;
        }
        if (profileRole) {
            profileRole.innerText = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        }
        if (profileAvatar) {
            const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            profileAvatar.innerText = initials;
        }
        if (settingsName) {
            settingsName.value = currentUser.name;
        }
    }
    // --- END AUTH CHECK ---

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

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

    // View All Appointments Button
    const viewAllAptBtn = document.getElementById('viewAllAptBtn');
    if (viewAllAptBtn) {
        viewAllAptBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Find and click the Appointments sidebar item
            if (sidebarItems.length > 0) {
                const aptItem = Array.from(sidebarItems).find(i => i.innerText.includes('Appointments'));
                if (aptItem) aptItem.click();
            }
        });
    }

    // Action buttons interaction demo & Modal logic
    const actionBtns = document.querySelectorAll('.action-btn');
    
    // Modals
    const bookingModal = document.getElementById('bookingModal');
    const prescriptionModal = document.getElementById('prescriptionModal');
    const messageModal = document.getElementById('messageModal');
    const paymentModal = document.getElementById('paymentModal');
    
    // Close buttons
    const closeBookingModal = document.getElementById('closeBookingModal');
    const closePrescriptionModal = document.getElementById('closePrescriptionModal');
    const closeMessageModal = document.getElementById('closeMessageModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    
    // Forms
    const bookingForm = document.getElementById('bookingForm');
    const prescriptionForm = document.getElementById('prescriptionForm');
    const messageForm = document.getElementById('messageForm');
    const paymentForm = document.getElementById('paymentForm');

    if (actionBtns.length > 0) {
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const actionName = btn.querySelector('span').innerText;
                
                if (actionName === 'Book New Appointment') {
                    if(bookingModal) bookingModal.classList.add('show');
                } else if (actionName === 'Request Prescription Refill') {
                    if(prescriptionModal) prescriptionModal.classList.add('show');
                } else if (actionName === 'Message Your Doctor') {
                    if(messageModal) messageModal.classList.add('show');
                } else if (actionName === 'Make a Payment (MoMo/Card)') {
                    if(paymentModal) paymentModal.classList.add('show');
                } else {
                    alert(`Module in progress: ${actionName}`);
                }
            });
        });
    }

    // Close Modal Logic
    if (closeBookingModal) closeBookingModal.addEventListener('click', () => bookingModal.classList.remove('show'));
    if (closePrescriptionModal) closePrescriptionModal.addEventListener('click', () => prescriptionModal.classList.remove('show'));
    if (closeMessageModal) closeMessageModal.addEventListener('click', () => messageModal.classList.remove('show'));
    if (closePaymentModal) closePaymentModal.addEventListener('click', () => paymentModal.classList.remove('show'));

    // --- CUSTOM TOAST NOTIFICATION ---
    window.showToast = function(message, type = 'success') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#10B981' : '#EF4444'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 500;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
    // --- END TOAST NOTIFICATION ---

    // Booking Form Submit
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
                    body: JSON.stringify({ doctor, type, date, time, patient: currentUser.name })
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Appointment booked successfully!");
                    bookingModal.classList.remove('show');
                    bookingForm.reset();
                    loadAppointments(); // Reload list
                } else {
                    showToast("Failed to book appointment.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error connecting to server.", "error");
            } finally {
                submitBtn.innerText = 'Confirm Booking';
            }
        });
    }

    // Prescription Form Submit
    if (prescriptionForm) {
        prescriptionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitPrescriptionBtn');
            submitBtn.innerText = 'Submitting...';
            
            const medication = document.getElementById('medicationInput').value;
            const pharmacy = document.getElementById('pharmacyInput').value;
            const notes = document.getElementById('prescriptionNotes').value;
            
            try {
                const res = await fetch('/api/prescriptions/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ medication, pharmacy, notes, patient: currentUser.name })
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Prescription refill requested successfully! We will notify you when it is ready.");
                    prescriptionModal.classList.remove('show');
                    prescriptionForm.reset();
                }
            } catch (err) {
                console.error(err);
                showToast("Error connecting to server.", "error");
            } finally {
                submitBtn.innerText = 'Submit Request';
            }
        });
    }

    // Message Form Submit
    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitMessageBtn');
            submitBtn.innerText = 'Sending...';
            
            const subject = document.getElementById('messageSubject').value;
            const body = document.getElementById('messageBody').value;
            
            try {
                const res = await fetch('/api/messages/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject, body, patient: currentUser.name })
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Message sent securely to Oheneba Ntim-Barimah. You will receive a reply in your dashboard soon.");
                    messageModal.classList.remove('show');
                    messageForm.reset();
                }
            } catch (err) {
                console.error(err);
                showToast("Error connecting to server.", "error");
            } finally {
                submitBtn.innerText = 'Send Message';
            }
        });
    }

    // Payment Form Submit
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitPaymentBtn');
            submitBtn.innerText = 'Processing...';
            
            const amount = document.getElementById('paymentAmount').value;
            const method = document.getElementById('paymentMethod').value;
            const account = document.getElementById('paymentAccount').value;
            
            try {
                const res = await fetch('/api/payments/dashboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, method, account })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Payment Initialized! Redirecting to secure checkout (Ref: ${data.reference})...`);
                    paymentModal.classList.remove('show');
                    paymentForm.reset();
                }
            } catch (err) {
                console.error(err);
                showToast("Error connecting to server.", "error");
            } finally {
                submitBtn.innerText = 'Pay Now';
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
                        `<button class="btn btn-primary" onclick="joinVideoCall('${apt._id}', 'patient')"><i class="fa-solid fa-video"></i> Join</button>` : 
                        `<button class="btn btn-outline">Details</button>`}
                </div>
                `;
            });
        }
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}
