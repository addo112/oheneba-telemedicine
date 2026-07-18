document.addEventListener('DOMContentLoaded', () => {
    // Sidebar switching
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const panels = document.querySelectorAll('.dashboard-panel');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.innerText.includes('Log Out')) return;
            
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            panels.forEach(p => p.style.display = 'none');
            const target = document.getElementById(item.getAttribute('data-target'));
            if (target) target.style.display = 'block';
        });
    });

    // Initial load
    loadData();
});

async function loadData() {
    loadAppointments();
    loadPrescriptions();
    loadMessages();
}

// 1. Appointments
async function loadAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No appointments found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(apt => `
            <tr>
                <td><strong>${apt.patient}</strong></td>
                <td>${apt.date} at ${apt.time}</td>
                <td>${apt.type}</td>
                <td><span class="status-badge ${apt.status === 'Completed' ? 'status-completed' : 'status-upcoming'}">${apt.status}</span></td>
                <td>
                    ${apt.status !== 'Completed' ? `<button class="action-btn-sm action-btn-success" onclick="completeAppointment('${apt._id}')">Mark Completed</button>` : '<em>Done</em>'}
                    ${apt.type === 'Video Call' && apt.status !== 'Completed' ? `<button class="action-btn-sm" style="background:#3B82F6; margin-left:5px;" onclick="joinVideoCall('${apt._id}', 'doctor')">Join Video</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading appointments.</td></tr>';
    }
}

async function completeAppointment(id) {
    if (!confirm('Mark this appointment as completed?')) return;
    try {
        const res = await fetch(`/api/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Completed' })
        });
        if (res.ok) loadAppointments();
    } catch (err) {
        alert('Failed to update status');
    }
}

// 2. Prescriptions
async function loadPrescriptions() {
    const tbody = document.getElementById('prescriptionsTableBody');
    try {
        const res = await fetch('/api/prescriptions');
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No prescription requests.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(rx => `
            <tr>
                <td><strong>${rx.patient}</strong></td>
                <td>${rx.medication}</td>
                <td>${rx.pharmacy}</td>
                <td>${rx.notes || '-'}</td>
                <td><span class="status-badge ${rx.status === 'Approved' ? 'status-approved' : 'status-pending'}">${rx.status}</span></td>
                <td>
                    ${rx.status === 'Pending' ? `<button class="action-btn-sm action-btn-success" onclick="approvePrescription('${rx._id}')">Approve</button>` : '<em>Approved</em>'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading prescriptions.</td></tr>';
    }
}

async function approvePrescription(id) {
    if (!confirm('Approve this prescription refill?')) return;
    try {
        const res = await fetch(`/api/prescriptions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Approved' })
        });
        if (res.ok) loadPrescriptions();
    } catch (err) {
        alert('Failed to approve');
    }
}

// 3. Messages
async function loadMessages() {
    const container = document.getElementById('messagesContainer');
    try {
        const res = await fetch('/api/messages');
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = '<p class="text-center">No messages found.</p>';
            return;
        }
        
        container.innerHTML = data.map(msg => `
            <div class="message-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h4>${msg.subject} <span class="status-badge ${msg.status === 'Replied' ? 'status-replied' : 'status-unread'}">${msg.status}</span></h4>
                    <small class="text-muted">From: ${msg.patient}</small>
                </div>
                <p>${msg.body}</p>
                ${msg.reply ? `
                    <div style="background:#F8FAFC; padding:15px; border-radius:6px; margin-top:15px; border-left:4px solid var(--secondary);">
                        <strong style="color:var(--primary); font-size:0.9rem;">Your Reply:</strong>
                        <p style="margin-top:5px;">${msg.reply}</p>
                    </div>
                ` : `
                    <button class="action-btn-sm" style="margin-top:15px;" onclick="openReplyModal('${msg._id}')"><i class="fa-solid fa-reply"></i> Reply</button>
                `}
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="text-center">Error loading messages.</p>';
    }
}

function openReplyModal(id) {
    document.getElementById('replyMessageId').value = id;
    document.getElementById('replyBody').value = '';
    document.getElementById('replyModal').classList.add('show');
}

async function submitReply() {
    const id = document.getElementById('replyMessageId').value;
    const reply = document.getElementById('replyBody').value;
    const btn = document.getElementById('replySubmitBtn');
    
    if (!reply.trim()) { alert('Please enter a reply.'); return; }
    
    btn.innerText = 'Sending...';
    try {
        const res = await fetch(`/api/messages/${id}/reply`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply })
        });
        if (res.ok) {
            document.getElementById('replyModal').classList.remove('show');
            loadMessages();
        } else {
            alert('Failed to send reply');
        }
    } catch (err) {
        alert('Network error');
    } finally {
        btn.innerText = 'Send Reply';
    }
}
