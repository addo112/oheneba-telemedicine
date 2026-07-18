// Shared WebRTC Video Call Logic
let localStream;
let remoteStream;
let peerConnection;
let currentRoomId;
let isDoctor = false; // Set to true in doctor-app.js before calling join

// STUN Servers to get public IP
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
};

// Ensure socket is initialized globally
if (typeof io !== 'undefined') {
    window.socket = io('/');
}

async function joinVideoCall(appointmentId, role) {
    if (!window.socket) {
        alert("Real-time signaling server not connected.");
        return;
    }
    
    currentRoomId = appointmentId;
    isDoctor = (role === 'doctor');
    
    const videoModal = document.getElementById('videoModal');
    if (videoModal) videoModal.classList.add('show');
    
    const statusText = document.getElementById('videoStatusText');
    if (statusText) statusText.innerText = "Requesting camera access...";

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        if (statusText) statusText.innerText = isDoctor ? "Waiting for patient to join..." : "Waiting for doctor to join...";

        // Join the Socket.io room for this appointment
        window.socket.emit('join-room', currentRoomId, role);
        
        setupSocketListeners();
        setupControls();

    } catch (error) {
        console.error("Camera error:", error);
        alert("Failed to access camera and microphone.");
        endCall();
    }
}

function setupSocketListeners() {
    window.socket.off('user-connected');
    window.socket.off('offer');
    window.socket.off('answer');
    window.socket.off('ice-candidate');
    window.socket.off('user-disconnected');

    // When the other person joins the room
    window.socket.on('user-connected', async (userId) => {
        console.log(`User connected: ${userId}`);
        const statusText = document.getElementById('videoStatusText');
        if (statusText) statusText.innerText = "Connecting secure channel...";
        
        // The doctor acts as the caller (creates the offer)
        if (isDoctor) {
            createPeerConnection();
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                window.socket.emit('offer', offer, currentRoomId);
            } catch (err) {
                console.error("Error creating offer:", err);
            }
        }
    });

    // Receive Offer (Patient receives this from Doctor)
    window.socket.on('offer', async (offer) => {
        console.log("Received offer");
        if (!isDoctor) {
            createPeerConnection();
            try {
                await peerConnection.setRemoteDescription(offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                window.socket.emit('answer', answer, currentRoomId);
            } catch (err) {
                console.error("Error handling offer:", err);
            }
        }
    });

    // Receive Answer (Doctor receives this from Patient)
    window.socket.on('answer', async (answer) => {
        console.log("Received answer");
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(answer);
            } catch (err) {
                console.error("Error setting answer:", err);
            }
        }
    });

    // Receive ICE Candidate
    window.socket.on('ice-candidate', async (candidate) => {
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (err) {
                console.error("Error adding ice candidate:", err);
            }
        }
    });

    // User disconnected
    window.socket.on('user-disconnected', () => {
        console.log("User disconnected");
        const statusText = document.getElementById('videoStatusText');
        if (statusText) statusText.innerText = "The other person has left the call.";
        const overlay = document.getElementById('videoOverlay');
        if (overlay) overlay.style.display = 'flex';
        
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            document.getElementById('remoteVideo').srcObject = null;
        }
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    });
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) remoteVideo.srcObject = remoteStream;

    // Add local tracks to peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Listen for remote tracks
    peerConnection.ontrack = (event) => {
        console.log("Received remote track");
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
        // Hide overlay once video is playing
        const overlay = document.getElementById('videoOverlay');
        if (overlay) overlay.style.display = 'none';
    };

    // Listen for ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            window.socket.emit('ice-candidate', event.candidate, currentRoomId);
        }
    };
}

function setupControls() {
    const endCallBtn = document.getElementById('endCallBtn');
    const toggleAudioBtn = document.getElementById('toggleAudioBtn');
    const toggleVideoBtn = document.getElementById('toggleVideoBtn');

    if (endCallBtn) endCallBtn.onclick = endCall;
    
    if (toggleAudioBtn) {
        toggleAudioBtn.onclick = () => {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                toggleAudioBtn.style.background = audioTrack.enabled ? 'rgba(255,255,255,0.2)' : '#EF4444';
            }
        };
    }
    
    if (toggleVideoBtn) {
        toggleVideoBtn.onclick = () => {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                toggleVideoBtn.style.background = videoTrack.enabled ? 'rgba(255,255,255,0.2)' : '#EF4444';
            }
        };
    }
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    
    if (window.socket) {
        window.socket.emit('disconnect-room'); // Custom emit or just rely on disconnect
    }

    const videoModal = document.getElementById('videoModal');
    if (videoModal) videoModal.classList.remove('show');
    
    const overlay = document.getElementById('videoOverlay');
    if (overlay) overlay.style.display = 'flex';
}
