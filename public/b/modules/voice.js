// Voice Channel Manager - WebRTC Implementation
export class VoiceManager {
    constructor(socket, toastManager, soundManager) {
        this.socket = socket;
        this.toast = toastManager;
        this.sound = soundManager;

        // Voice state
        this.currentChannel = null;
        this.localStream = null;
        this.localVideoStream = null;
        this.localScreenStream = null;
        this.peerConnections = new Map();
        this.remoteVideoStreams = new Map();
        this.remoteScreenStreams = new Map();
        this.userVoiceStates = new Map();

        // UI state
        this.isMuted = false;
        this.isDeafened = false;
        this.isCameraOn = false;
        this.isScreenSharing = false;

        // Context menu state
        this.contextMenuTarget = null;
        this.localMutedUsers = new Set(); // Users muted locally
        this.userVolumes = new Map(); // Per-user volume settings

        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.init();
    }

    init() {
        this.setupSocketHandlers();
        this.setupUIHandlers();
        this.setupContextMenu();
    }

    setupSocketHandlers() {
        // User joined voice
        this.socket.on('userJoinedVoice', (data) => {
            console.log(`${data.username} joined voice channel: ${data.channel}`);
            this.toast.show(`${data.username} joined voice chat`, 'success');

            if (data.username !== this.socket.auth?.username) {
                this.sound.play('join');
            }

            // Create peer connection if we're in the same channel
            if (data.socketId !== this.socket.id &&
                this.currentChannel === data.channel &&
                this.localStream) {
                const shouldInitiate = this.socket.id > data.socketId;

                if (!this.peerConnections.has(data.socketId)) {
                    console.log(`Creating WebRTC connection to ${data.username}`);
                    this.createPeerConnection(data.socketId, data.username, shouldInitiate);
                }
            }
        });

        // User left voice
        this.socket.on('userLeftVoice', (data) => {
            console.log(`${data.username} left voice channel: ${data.channel}`);
            this.toast.show(`${data.username} left voice chat`, 'info');
            this.sound.play('leave');

            // Clean up peer connection
            if (this.peerConnections.has(data.socketId)) {
                this.peerConnections.get(data.socketId).close();
                this.peerConnections.delete(data.socketId);
            }

            this.removeRemoteAudio(data.username);
            this.removeRemoteVideo(data.username);
            this.removeRemoteScreen(data.username);
            this.userVoiceStates.delete(data.username);
        });

        // Voice channel deleted
        this.socket.on('voiceChannelDeleted', (channelName) => {
            if (this.currentChannel === channelName) {
                console.log(`Voice channel ${channelName} was deleted`);
                this.leave();
                this.toast.show(`Voice channel ${channelName} was deleted`, 'error');
            }
        });

        // User muted/unmuted
        this.socket.on('userMuted', (data) => {
            const state = this.userVoiceStates.get(data.username) || {};
            state.muted = data.muted;
            this.userVoiceStates.set(data.username, state);
            this.updateParticipantStatus(data.username);
        });

        // User deafened/undeafened
        this.socket.on('userDeafened', (data) => {
            const state = this.userVoiceStates.get(data.username) || {};
            state.deafened = data.deafened;
            this.userVoiceStates.set(data.username, state);
            this.updateParticipantStatus(data.username);
        });

        // User camera on/off
        this.socket.on('userCamera', (data) => {
            const state = this.userVoiceStates.get(data.username) || {};
            state.camera = data.camera;
            this.userVoiceStates.set(data.username, state);

            // Remove video display if camera is turned off
            if (!data.camera) {
                this.removeVideoFromChannelList(data.username);
                this.remoteVideoStreams.delete(data.username);
            }

            this.updateParticipantStatus(data.username);
        });

        // User screen sharing
        this.socket.on('userScreenSharing', (data) => {
            const state = this.userVoiceStates.get(data.username) || {};
            state.screenSharing = data.screenSharing;
            this.userVoiceStates.set(data.username, state);

            if (!data.screenSharing) {
                this.removeRemoteScreen(data.username);
            }
        });

        // WebRTC signaling
        this.socket.on('webrtc-offer', async (data) => {
            console.log(`📞 Received WebRTC offer from ${data.username}`);

            if (!this.localStream) {
                console.error('Cannot handle offer - no local stream');
                return;
            }

            let pc = this.peerConnections.get(data.from);

            // Handle renegotiation
            if (pc) {
                if (pc.signalingState === 'stable') {
                    console.log(`🔄 Handling renegotiation from ${data.username}`);
                    try {
                        await pc.setRemoteDescription(data.offer);
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        this.socket.emit('webrtc-answer', {
                            answer: answer,
                            to: data.from
                        });
                        console.log(`✅ Sent renegotiation answer to ${data.username}`);
                    } catch (err) {
                        console.error(`Error handling renegotiation: ${err.message}`);
                    }
                    return;
                } else {
                    console.warn(`Connection not stable (${pc.signalingState}), ignoring offer`);
                    return;
                }
            }

            // Create new peer connection for initial connection
            pc = this.createPeerConnection(data.from, data.username, false);

            try {
                await pc.setRemoteDescription(data.offer);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                this.socket.emit('webrtc-answer', {
                    answer: answer,
                    to: data.from
                });
                console.log(`✅ Sent initial answer to ${data.username}`);
            } catch (err) {
                console.error(`Error handling WebRTC offer: ${err.message}`);
            }
        });

        this.socket.on('webrtc-answer', async (data) => {
            console.log(`📞 Received WebRTC answer from ${data.username}`);
            const pc = this.peerConnections.get(data.from);
            if (pc) {
                try {
                    await pc.setRemoteDescription(data.answer);
                } catch (err) {
                    console.error(`Error handling WebRTC answer: ${err.message}`);
                }
            }
        });

        this.socket.on('webrtc-ice-candidate', async (data) => {
            const pc = this.peerConnections.get(data.from);
            if (pc && data.candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error(`Error adding ICE candidate: ${err.message}`);
                }
            }
        });

        // Kicked from voice
        this.socket.on('kickedFromVoice', (data) => {
            this.toast.show('You were kicked from the voice channel by an admin', 'error', 'Kicked');
            this.leave();
        });
    }

    setupUIHandlers() {
        // User panel mute button
        const userPanelMute = document.getElementById('userPanelMute');
        if (userPanelMute) {
            userPanelMute.addEventListener('click', () => this.toggleMute());
        }

        // User panel deafen button
        const userPanelDeafen = document.getElementById('userPanelDeafen');
        if (userPanelDeafen) {
            userPanelDeafen.addEventListener('click', () => this.toggleDeafen());
        }

        // Voice connection bar buttons
        const voiceDisconnect = document.getElementById('voiceDisconnect');
        if (voiceDisconnect) {
            voiceDisconnect.addEventListener('click', () => this.leave());
        }

        const voiceCamera = document.getElementById('voiceCamera');
        if (voiceCamera) {
            voiceCamera.addEventListener('click', () => this.toggleCamera());
        }

        const voiceScreenShare = document.getElementById('voiceScreenShare');
        if (voiceScreenShare) {
            voiceScreenShare.addEventListener('click', () => this.toggleScreenShare());
        }
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;

        // Hide context menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Context menu actions
        const contextProfile = document.getElementById('contextProfile');
        if (contextProfile) {
            contextProfile.addEventListener('click', () => {
                if (this.contextMenuTarget && window.openProfileModal) {
                    window.openProfileModal(this.contextMenuTarget);
                }
                this.hideContextMenu();
            });
        }

        const contextLocalMute = document.getElementById('contextLocalMute');
        if (contextLocalMute) {
            contextLocalMute.addEventListener('click', () => {
                if (this.contextMenuTarget) {
                    this.toggleLocalMute(this.contextMenuTarget);
                }
                this.hideContextMenu();
            });
        }

        // Volume slider
        const volumeSlider = document.getElementById('contextVolumeSlider');
        const volumeDisplay = document.getElementById('contextVolumeDisplay');
        if (volumeSlider && volumeDisplay) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value);
                volumeDisplay.textContent = `${volume}%`;

                if (this.contextMenuTarget) {
                    this.setUserVolume(this.contextMenuTarget, volume / 100);
                }
            });
        }

        // Admin actions (will be shown/hidden based on admin status)
        const contextServerMute = document.getElementById('contextServerMute');
        if (contextServerMute) {
            contextServerMute.addEventListener('click', () => {
                if (this.contextMenuTarget) {
                    this.serverMuteUser(this.contextMenuTarget);
                }
                this.hideContextMenu();
            });
        }

        const contextServerDeafen = document.getElementById('contextServerDeafen');
        if (contextServerDeafen) {
            contextServerDeafen.addEventListener('click', () => {
                if (this.contextMenuTarget) {
                    this.serverDeafenUser(this.contextMenuTarget);
                }
                this.hideContextMenu();
            });
        }

        const contextKickVoice = document.getElementById('contextKickVoice');
        if (contextKickVoice) {
            contextKickVoice.addEventListener('click', () => {
                if (this.contextMenuTarget) {
                    this.kickFromVoice(this.contextMenuTarget);
                }
                this.hideContextMenu();
            });
        }

        const contextBanUser = document.getElementById('contextBanUser');
        if (contextBanUser) {
            contextBanUser.addEventListener('click', () => {
                if (this.contextMenuTarget) {
                    this.banUser(this.contextMenuTarget);
                }
                this.hideContextMenu();
            });
        }
    }

    showContextMenu(event, username, isAdmin) {
        console.log(`📋 showContextMenu called for ${username}, isAdmin: ${isAdmin}`);
        event.preventDefault();
        event.stopPropagation();

        const myUsername = this.socket.auth?.username || sessionStorage.getItem('wyvernUsername');

        // Don't show context menu for self
        if (username === myUsername) {
            console.log(`⏭️ Not showing context menu for self`);
            return;
        }

        this.contextMenuTarget = username;

        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) {
            console.error('❌ Context menu element not found!');
            return;
        }

        console.log(`✅ Context menu element found, positioning at (${event.clientX}, ${event.clientY})`);

        // Position the menu
        const x = event.clientX;
        const y = event.clientY;

        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;

        // Update header
        const header = document.getElementById('contextMenuHeader');
        if (header) {
            header.textContent = username;
        }

        // Update local mute button text
        const localMuteBtn = document.getElementById('contextLocalMute');
        if (localMuteBtn) {
            const isMuted = this.localMutedUsers.has(username);
            const muteText = localMuteBtn.querySelector('span:last-child');
            if (muteText) {
                muteText.textContent = isMuted ? 'Unmute for Me' : 'Mute for Me';
            }
        }

        // Update volume slider
        const volumeSlider = document.getElementById('contextVolumeSlider');
        const volumeDisplay = document.getElementById('contextVolumeDisplay');
        if (volumeSlider && volumeDisplay) {
            const currentVolume = this.userVolumes.get(username) || 1.0;
            const volumePercent = Math.round(currentVolume * 100);
            volumeSlider.value = volumePercent;
            volumeDisplay.textContent = `${volumePercent}%`;
        }

        // Show/hide admin options
        const adminItems = [
            'contextServerMute',
            'contextServerDeafen',
            'contextKickVoice',
            'contextBanUser',
            'contextAdminSeparator'
        ];

        adminItems.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = isAdmin ? '' : 'none';
            }
        });

        // Show the menu
        contextMenu.classList.add('show');

        // Adjust position if menu goes off screen
        setTimeout(() => {
            const rect = contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
            }
            if (rect.bottom > window.innerHeight) {
                contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
            }
        }, 0);
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.classList.remove('show');
        }
        this.contextMenuTarget = null;
    }

    toggleLocalMute(username) {
        const audio = document.getElementById(`audio-${username}`);

        if (this.localMutedUsers.has(username)) {
            // Unmute
            this.localMutedUsers.delete(username);
            if (audio) {
                audio.muted = false;
            }
            this.toast.show(`Unmuted ${username} for you`, 'success');
        } else {
            // Mute
            this.localMutedUsers.add(username);
            if (audio) {
                audio.muted = true;
            }
            this.toast.show(`Muted ${username} for you`, 'success');
        }

        // Update visual indicator
        this.updateParticipantStatus(username);
    }

    setUserVolume(username, volume) {
        // Clamp volume between 0 and 2 (0-200%)
        volume = Math.max(0, Math.min(2, volume));

        this.userVolumes.set(username, volume);

        const audio = document.getElementById(`audio-${username}`);
        if (audio) {
            audio.volume = volume;
        }
    }

    // Admin actions
    serverMuteUser(username) {
        if (!this.currentChannel) return;

        this.socket.emit('adminServerMute', { username });
        this.toast.show(`Server muted ${username}`, 'success');
    }

    serverDeafenUser(username) {
        if (!this.currentChannel) return;

        this.socket.emit('adminServerDeafen', { username });
        this.toast.show(`Server deafened ${username}`, 'success');
    }

    kickFromVoice(username) {
        if (!this.currentChannel) return;

        if (confirm(`Kick ${username} from voice channel?`)) {
            this.socket.emit('adminKickFromVoice', { username });
            this.toast.show(`Kicked ${username} from voice`, 'success');
        }
    }

    banUser(username) {
        if (confirm(`Ban ${username} from the server? This action cannot be undone.`)) {
            this.socket.emit('adminBanUser', { username });
            this.toast.show(`Banned ${username}`, 'success');
        }
    }

    async join(channelName) {
        if (this.currentChannel === channelName) {
            console.log(`Already in voice channel: ${channelName}`);
            return;
        }

        console.log(`Requesting microphone access for: ${channelName}`);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            this.localStream = stream;
            this.currentChannel = channelName;

            // Apply mute state if already muted
            if (this.isMuted) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
                console.log('Applied pre-set mute state');
            }

            this.socket.emit('joinVoiceChannel', channelName);

            // Send current mute/deafen state to server
            if (this.isMuted) {
                this.socket.emit('userMuted', { muted: true });
            }
            if (this.isDeafened) {
                this.socket.emit('userDeafened', { deafened: true });
            }

            // Wait for server to process
            setTimeout(() => {
                console.log('Establishing WebRTC connections...');
            }, 500);

            this.showVoiceIndicators(channelName);
            this.toast.show(`Joined ${channelName}`, 'success');
            console.log(`✅ Joined voice channel: ${channelName}`);
        } catch (err) {
            console.error(`Microphone access denied: ${err.message}`);
            this.toast.show('Microphone access required for voice chat', 'error');
        }
    }

    leave() {
        if (!this.currentChannel) return;

        console.log(`Leaving voice channel: ${this.currentChannel}`);

        // Stop all local streams
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.localVideoStream) {
            this.localVideoStream.getTracks().forEach(track => track.stop());
            this.localVideoStream = null;
        }

        if (this.localScreenStream) {
            this.localScreenStream.getTracks().forEach(track => track.stop());
            this.localScreenStream = null;
        }

        this.isCameraOn = false;
        this.isScreenSharing = false;

        // Close all peer connections
        this.peerConnections.forEach((pc) => pc.close());
        this.peerConnections.clear();

        // Remove all remote audio elements
        document.querySelectorAll('audio[id^="audio-"]').forEach(audio => audio.remove());

        // Remove all remote video elements
        document.querySelectorAll('video.remote-video').forEach(video => {
            video.srcObject = null;
            video.remove();
        });

        this.socket.emit('leaveVoiceChannel');

        this.userVoiceStates.clear();
        this.hideVoiceIndicators();
        this.currentChannel = null;

        console.log('✅ Left voice channel');
    }

    createPeerConnection(socketId, username, isInitiator) {
        console.log(`🔗 Creating peer connection for ${username} - initiator: ${isInitiator}`);

        if (this.peerConnections.has(socketId)) {
            const existingPc = this.peerConnections.get(socketId);
            if (existingPc.connectionState === 'failed' || existingPc.connectionState === 'closed') {
                existingPc.close();
            } else {
                return existingPc;
            }
        }

        const pc = new RTCPeerConnection(this.rtcConfig);
        this.peerConnections.set(socketId, pc);

        // Add local audio stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Add local video if camera is on
        if (this.localVideoStream && this.isCameraOn) {
            this.localVideoStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localVideoStream);
            });
        }

        // Add local screen if sharing
        if (this.localScreenStream && this.isScreenSharing) {
            this.localScreenStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localScreenStream);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(`📺 Received ${event.track.kind} track from ${username}`);
            console.log(`   Track label: ${event.track.label}`);
            console.log(`   Stream ID: ${event.streams[0]?.id}`);
            const remoteStream = event.streams[0];

            if (event.track.kind === 'audio') {
                this.playRemoteAudio(remoteStream, username);
            } else if (event.track.kind === 'video') {
                const trackLabel = event.track.label.toLowerCase();

                // Enhanced screen detection - check multiple indicators
                const isScreenTrack = trackLabel.includes('screen') ||
                    trackLabel.includes('monitor') ||
                    trackLabel.includes('window') ||
                    trackLabel.includes('display') ||
                    trackLabel.includes('tab') ||
                    trackLabel.includes('chrome') ||
                    trackLabel.includes('firefox') ||
                    trackLabel.includes('web contents') ||
                    trackLabel.includes('entire screen');

                // Check user state
                const userState = this.userVoiceStates.get(username) || {};
                const hasExistingVideo = this.remoteVideoStreams.has(username);
                const hasExistingScreen = this.remoteScreenStreams.has(username);

                console.log(`   Track label: "${event.track.label}"`);
                console.log(`   Is screen track (by label): ${isScreenTrack}`);
                console.log(`   User state screenSharing: ${userState.screenSharing}`);
                console.log(`   Has existing video: ${hasExistingVideo}`);
                console.log(`   Has existing screen: ${hasExistingScreen}`);

                // Decision logic:
                // 1. If label clearly indicates screen -> screen
                // 2. If user state says screenSharing and we already have camera -> screen
                // 3. If we already have a screen stream -> this is camera
                // 4. Otherwise -> camera

                let isScreen = false;

                if (isScreenTrack) {
                    // Label clearly indicates screen
                    isScreen = true;
                    console.log(`   ✅ Identified as SCREEN (by label)`);
                } else if (userState.screenSharing && hasExistingVideo && !hasExistingScreen) {
                    // User is screen sharing, we have camera, but no screen yet
                    isScreen = true;
                    console.log(`   ✅ Identified as SCREEN (user state + has camera)`);
                } else if (hasExistingScreen && !hasExistingVideo) {
                    // We have screen but no camera, this must be camera
                    isScreen = false;
                    console.log(`   ✅ Identified as CAMERA (already have screen)`);
                } else if (userState.camera && !hasExistingVideo) {
                    // User has camera on and we don't have video yet
                    isScreen = false;
                    console.log(`   ✅ Identified as CAMERA (user state)`);
                } else {
                    // Default: if we don't have video yet, assume camera
                    // If we already have video, assume screen
                    isScreen = hasExistingVideo;
                    console.log(`   ⚠️ Guessing: ${isScreen ? 'SCREEN' : 'CAMERA'} (has existing video: ${hasExistingVideo})`);
                }

                if (isScreen) {
                    console.log(`🖥️ Playing as SCREEN SHARE from ${username}`);
                    this.playRemoteScreen(remoteStream, username);
                } else {
                    console.log(`📹 Playing as CAMERA from ${username}`);
                    this.playRemoteVideo(remoteStream, username);
                }
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc-ice-candidate', {
                    candidate: event.candidate,
                    to: socketId
                });
            }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
            console.log(`WebRTC state with ${username}: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.peerConnections.delete(socketId);
                this.removeRemoteAudio(username);
            }
        };

        // Create offer if initiator
        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    this.socket.emit('webrtc-offer', {
                        offer: pc.localDescription,
                        to: socketId
                    });
                })
                .catch(err => console.error(`Error creating offer: ${err.message}`));
        }

        return pc;
    }

    playRemoteAudio(stream, username) {
        this.removeRemoteAudio(username);

        const audio = document.createElement('audio');
        audio.id = `audio-${username}`;
        audio.srcObject = stream;
        audio.autoplay = true;

        // Apply saved volume or default to 1.0
        const savedVolume = this.userVolumes.get(username) || 1.0;
        audio.volume = savedVolume;

        // Apply local mute if set
        if (this.localMutedUsers.has(username)) {
            audio.muted = true;
        }

        audio.style.display = 'none';
        document.body.appendChild(audio);

        console.log(`Playing audio from ${username} (volume: ${savedVolume}, muted: ${audio.muted})`);
    }

    removeRemoteAudio(username) {
        const audio = document.getElementById(`audio-${username}`);
        if (audio) audio.remove();
    }

    playRemoteVideo(stream, username) {
        this.remoteVideoStreams.set(username, stream);
        this.displayVideoInChannelList(username, stream);
        console.log(`Stored and displayed video stream for ${username}`);
    }

    removeRemoteVideo(username) {
        this.remoteVideoStreams.delete(username);
    }

    playRemoteScreen(stream, username) {
        this.remoteScreenStreams.set(username, stream);
        console.log(`✅ Stored screen stream for ${username}`);

        // Only update state if we don't already have it set
        // (to avoid overriding server state)
        const state = this.userVoiceStates.get(username) || {};
        if (!state.screenSharing) {
            state.screenSharing = true;
            this.userVoiceStates.set(username, state);

            // Show toast notification only on first detection
            this.toast.show(`${username} is sharing their screen`, 'info');
        }

        // Update UI to show screen share button
        this.updateParticipantStatus(username);
    }

    removeRemoteScreen(username) {
        this.remoteScreenStreams.delete(username);
        console.log(`🗑️ Removed screen stream for ${username}`);

        // Update user state
        const state = this.userVoiceStates.get(username) || {};
        state.screenSharing = false;
        this.userVoiceStates.set(username, state);

        // Update UI to remove screen share button
        this.updateParticipantStatus(username);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        // Apply mute to local stream if we have one
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        // Update UI with animation
        const userPanelMute = document.getElementById('userPanelMute');
        if (userPanelMute) {
            const icon = userPanelMute.querySelector('i');
            if (icon) {
                // Add animation class
                icon.classList.add('icon-change');
                setTimeout(() => icon.classList.remove('icon-change'), 300);

                icon.className = this.isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
            }
            userPanelMute.classList.toggle('muted', this.isMuted);

            // Add pulse animation
            userPanelMute.classList.add('button-pulse');
            setTimeout(() => userPanelMute.classList.remove('button-pulse'), 300);
        }

        // Update own voice state
        const myUsername = this.socket.auth?.username || sessionStorage.getItem('wyvernUsername');
        const state = this.userVoiceStates.get(myUsername) || {};
        state.muted = this.isMuted;
        this.userVoiceStates.set(myUsername, state);

        if (this.currentChannel) {
            this.updateParticipantStatus(myUsername);
            this.socket.emit('userMuted', { muted: this.isMuted });
        }

        console.log(`${this.isMuted ? 'Muted' : 'Unmuted'} microphone${!this.currentChannel ? ' (will apply when joining voice)' : ''}`);
    }

    toggleDeafen() {
        this.isDeafened = !this.isDeafened;

        // Mute all remote audio if in a call
        if (this.currentChannel) {
            document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
                audio.muted = this.isDeafened;
            });
        }

        // If deafening, also mute microphone
        if (this.isDeafened && !this.isMuted) {
            this.toggleMute();
        }

        // Update UI with animation
        const userPanelDeafen = document.getElementById('userPanelDeafen');
        if (userPanelDeafen) {
            const icon = userPanelDeafen.querySelector('i');
            if (icon) {
                // Add animation class
                icon.classList.add('icon-change');
                setTimeout(() => icon.classList.remove('icon-change'), 300);

                icon.className = this.isDeafened ? 'fas fa-volume-mute' : 'fas fa-headphones';
            }
            userPanelDeafen.classList.toggle('deafened', this.isDeafened);

            // Add pulse animation
            userPanelDeafen.classList.add('button-pulse');
            setTimeout(() => userPanelDeafen.classList.remove('button-pulse'), 300);
        }

        if (this.currentChannel) {
            this.socket.emit('userDeafened', { deafened: this.isDeafened });
        }

        console.log(`${this.isDeafened ? 'Deafened' : 'Undeafened'}${!this.currentChannel ? ' (will apply when joining voice)' : ''}`);
    }

    async toggleCamera() {
        if (!this.currentChannel) {
            this.toast.show('Join a voice channel first', 'error');
            return;
        }

        try {
            if (!this.isCameraOn) {
                // Turn camera ON
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } }
                });

                this.localVideoStream = videoStream;
                this.isCameraOn = true;

                // Add video track to all existing peer connections and renegotiate
                const videoTrack = videoStream.getVideoTracks()[0];
                const renegotiationPromises = [];

                this.peerConnections.forEach((pc, socketId) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        // Replace existing video track
                        sender.replaceTrack(videoTrack);
                    } else {
                        // Add new video track and renegotiate
                        pc.addTrack(videoTrack, videoStream);

                        // Create new offer to renegotiate
                        const renegotiate = async () => {
                            try {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);

                                this.socket.emit('webrtc-offer', {
                                    offer: offer,
                                    to: socketId
                                });
                                console.log(`📤 Sent renegotiation offer for video track`);
                            } catch (error) {
                                console.error('Renegotiation error:', error);
                            }
                        };

                        renegotiationPromises.push(renegotiate());
                    }
                });

                // Wait for all renegotiations to complete
                await Promise.all(renegotiationPromises);

                this.toast.show('Camera enabled', 'success');
            } else {
                // Turn camera OFF
                if (this.localVideoStream) {
                    this.localVideoStream.getTracks().forEach(track => track.stop());
                    this.localVideoStream = null;
                }
                this.isCameraOn = false;

                // Remove video track from all peer connections and renegotiate
                const renegotiationPromises = [];

                this.peerConnections.forEach((pc, socketId) => {
                    const senders = pc.getSenders();
                    senders.forEach(sender => {
                        if (sender.track && sender.track.kind === 'video') {
                            pc.removeTrack(sender);
                        }
                    });

                    // Create new offer to renegotiate without video
                    const renegotiate = async () => {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            this.socket.emit('webrtc-offer', {
                                offer: offer,
                                to: socketId
                            });
                            console.log(`📤 Sent renegotiation offer to remove video track`);
                        } catch (error) {
                            console.error('Renegotiation error:', error);
                        }
                    };

                    renegotiationPromises.push(renegotiate());
                });

                // Wait for all renegotiations to complete
                await Promise.all(renegotiationPromises);

                this.toast.show('Camera disabled', 'info');
            }

            // Update button animation
            const cameraBtn = document.getElementById('voiceCamera');
            if (cameraBtn) {
                cameraBtn.classList.add('button-pulse');
                setTimeout(() => cameraBtn.classList.remove('button-pulse'), 300);
                cameraBtn.classList.toggle('active', this.isCameraOn);
            }

            // Update own voice state BEFORE displaying video
            const myUsername = this.socket.auth?.username || sessionStorage.getItem('wyvernUsername');
            console.log(`My username: ${myUsername}, Camera on: ${this.isCameraOn}`);

            const state = this.userVoiceStates.get(myUsername) || {};
            state.camera = this.isCameraOn;
            this.userVoiceStates.set(myUsername, state);

            // Display or remove own video

            if (this.isCameraOn && this.localVideoStream) {
                console.log(`Displaying own video for ${myUsername}`);
                // Store own video stream
                this.remoteVideoStreams.set(myUsername, this.localVideoStream);

                // Try to display immediately
                this.displayVideoInChannelList(myUsername, this.localVideoStream);

                // Also retry after a short delay in case the user list hasn't loaded yet
                setTimeout(() => {
                    console.log('Retrying video display after delay...');
                    this.displayVideoInChannelList(myUsername, this.localVideoStream);
                }, 500);
            } else {
                // Remove video display when camera is off
                console.log(`Removing own video for ${myUsername}`);
                this.remoteVideoStreams.delete(myUsername);
                this.removeVideoFromChannelList(myUsername);
            }

            this.socket.emit('userCamera', { camera: this.isCameraOn });
        } catch (err) {
            console.error('Camera error:', err);
            this.toast.show('Failed to access camera', 'error');
        }
    }

    async toggleScreenShare() {
        if (!this.currentChannel) {
            this.toast.show('Join a voice channel first', 'error');
            return;
        }

        try {
            if (!this.isScreenSharing) {
                // Start screen sharing
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

                this.localScreenStream = screenStream;
                this.isScreenSharing = true;

                // Add screen track to all peer connections and renegotiate
                const screenTrack = screenStream.getVideoTracks()[0];
                console.log(`🖥️ Screen track label: ${screenTrack.label}`);
                const renegotiationPromises = [];

                this.peerConnections.forEach((pc, socketId) => {
                    // Add screen track
                    console.log(`Adding screen track to peer connection ${socketId}`);
                    pc.addTrack(screenTrack, screenStream);

                    // Create new offer to renegotiate
                    const renegotiate = async () => {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            this.socket.emit('webrtc-offer', {
                                offer: offer,
                                to: socketId
                            });
                            console.log(`📤 Sent renegotiation offer for screen share`);
                        } catch (error) {
                            console.error('Renegotiation error:', error);
                        }
                    };

                    renegotiationPromises.push(renegotiate());
                });

                // Wait for all renegotiations to complete
                await Promise.all(renegotiationPromises);

                // Stop sharing when user stops via browser UI
                screenTrack.onended = () => {
                    this.isScreenSharing = false;

                    // Update button state
                    const screenBtn = document.getElementById('voiceScreenShare');
                    if (screenBtn) {
                        screenBtn.classList.remove('active');
                    }

                    // Update voice state
                    const state = this.userVoiceStates.get(this.socket.auth?.username) || {};
                    state.screenSharing = false;
                    this.userVoiceStates.set(this.socket.auth?.username, state);
                    this.updateParticipantStatus(this.socket.auth?.username);

                    this.socket.emit('userScreenSharing', { screenSharing: false });
                    this.toast.show('Screen sharing stopped', 'info');
                };

                this.toast.show('Screen sharing started', 'success');
            } else {
                // Stop screen sharing
                if (this.localScreenStream) {
                    this.localScreenStream.getTracks().forEach(track => track.stop());
                    this.localScreenStream = null;
                }
                this.isScreenSharing = false;

                // Remove screen track from all peer connections and renegotiate
                const renegotiationPromises = [];

                this.peerConnections.forEach((pc, socketId) => {
                    const senders = pc.getSenders();
                    const screenSenders = senders.filter(sender => {
                        if (!sender.track || sender.track.kind !== 'video') return false;
                        const label = sender.track.label.toLowerCase();
                        return label.includes('screen') ||
                            label.includes('monitor') ||
                            label.includes('window') ||
                            label.includes('display') ||
                            label.includes('tab');
                    });

                    screenSenders.forEach(sender => {
                        console.log(`Removing screen track: ${sender.track.label}`);
                        pc.removeTrack(sender);
                    });

                    // Create new offer to renegotiate without screen
                    const renegotiate = async () => {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            this.socket.emit('webrtc-offer', {
                                offer: offer,
                                to: socketId
                            });
                            console.log(`📤 Sent renegotiation offer to remove screen share`);
                        } catch (error) {
                            console.error('Renegotiation error:', error);
                        }
                    };

                    renegotiationPromises.push(renegotiate());
                });

                // Wait for all renegotiations to complete
                await Promise.all(renegotiationPromises);

                this.toast.show('Screen sharing stopped', 'info');
            }

            // Update button animation
            const screenBtn = document.getElementById('voiceScreenShare');
            if (screenBtn) {
                screenBtn.classList.add('button-pulse');
                setTimeout(() => screenBtn.classList.remove('button-pulse'), 300);
                screenBtn.classList.toggle('active', this.isScreenSharing);
            }

            // Update own voice state
            const state = this.userVoiceStates.get(this.socket.auth?.username) || {};
            state.screenSharing = this.isScreenSharing;
            this.userVoiceStates.set(this.socket.auth?.username, state);
            this.updateParticipantStatus(this.socket.auth?.username);

            this.socket.emit('userScreenSharing', { screenSharing: this.isScreenSharing });
        } catch (err) {
            console.error('Screen share error:', err);
            this.toast.show('Failed to share screen', 'error');
        }
    }

    showVoiceIndicators(channelName) {
        const voiceBar = document.getElementById('voiceConnectionBar');
        const channelNameEl = document.getElementById('voiceConnectionChannelName');

        if (voiceBar) voiceBar.style.display = 'flex';
        if (channelNameEl) channelNameEl.textContent = channelName;

        // Mark channel as connected
        const voiceChannelEl = document.querySelector(`.voice-channel-item[data-channel="${channelName}"]`);
        if (voiceChannelEl) {
            voiceChannelEl.classList.add('connected');
        }
    }

    hideVoiceIndicators() {
        const voiceBar = document.getElementById('voiceConnectionBar');
        if (voiceBar) voiceBar.style.display = 'none';

        // Remove connected class from all channels
        document.querySelectorAll('.voice-channel-item.connected').forEach(el => {
            el.classList.remove('connected');
        });
    }

    isInVoice() {
        return this.currentChannel !== null;
    }

    getCurrentChannel() {
        return this.currentChannel;
    }

    updateParticipantStatus(username) {
        const state = this.userVoiceStates.get(username) || {};

        // Determine status icon
        let statusIcon = 'fa-microphone';
        let statusClass = '';

        if (state.deafened) {
            statusIcon = 'fa-headphones-slash';
            statusClass = 'deafened';
        } else if (state.muted) {
            statusIcon = 'fa-microphone-slash';
            statusClass = 'muted';
        }

        // Update voice channel list users
        const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${username}"]`);
        voiceUsers.forEach((userEl) => {
            const statusEl = userEl.querySelector('.voice-user-status');
            if (statusEl) {
                statusEl.className = `fas ${statusIcon} voice-user-status ${statusClass}`;
            }

            // Add visual indicator if locally muted
            if (this.localMutedUsers.has(username)) {
                userEl.style.opacity = '0.5';
                userEl.title = `${username} (Muted for you)`;
            } else {
                userEl.style.opacity = '';
                userEl.title = '';
            }

            // Add/remove screen sharing button
            // IMPORTANT: Only show button if we actually have a screen stream
            const hasScreenStream = this.remoteScreenStreams.has(username);
            let screenBtn = userEl.querySelector('.screen-share-btn');

            if (state.screenSharing && hasScreenStream) {
                // User is sharing AND we have their stream
                if (!screenBtn) {
                    screenBtn = document.createElement('button');
                    screenBtn.className = 'screen-share-btn';
                    screenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
                    screenBtn.title = `View ${username}'s screen`;
                    screenBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.openScreenSharePIP(username);
                    };
                    userEl.appendChild(screenBtn);
                    console.log(`✅ Added screen share button for ${username}`);
                }
            } else if (screenBtn) {
                // Remove button if they stopped sharing or we don't have stream
                screenBtn.remove();
                console.log(`🗑️ Removed screen share button for ${username}`);
            }
        });

        console.log(`Updated status for ${username}:`, state, `hasStream: ${this.remoteScreenStreams.has(username)}`);
    }

    openScreenSharePIP(username) {
        const stream = this.remoteScreenStreams.get(username);
        if (!stream) {
            this.toast.show(`${username} is not sharing their screen`, 'error');
            return;
        }

        // Check if PIP is supported
        if (document.pictureInPictureEnabled) {
            this.openPIPMode(username, stream);
        } else {
            // Fallback to modal view
            this.openScreenShareModal(username, stream);
        }
    }

    openPIPMode(username, stream) {
        // Create a video element for PIP
        let pipVideo = document.getElementById(`pip-${username}`);
        if (!pipVideo) {
            pipVideo = document.createElement('video');
            pipVideo.id = `pip-${username}`;
            pipVideo.autoplay = true;
            pipVideo.playsInline = true;
            pipVideo.controls = true;
            pipVideo.style.display = 'none';
            document.body.appendChild(pipVideo);
        }

        pipVideo.srcObject = stream;

        // Wait for video to be ready, then try PIP
        pipVideo.onloadedmetadata = () => {
            if (pipVideo.requestPictureInPicture) {
                pipVideo
                    .requestPictureInPicture()
                    .then(() => {
                        console.log(`✅ Opened PIP for ${username}'s screen share`);
                        this.toast.show(`Viewing ${username}'s screen in PIP`, 'success');
                    })
                    .catch((err) => {
                        console.error('PIP error:', err);
                        // Fallback to modal if PIP fails
                        this.openScreenShareModal(username, stream);
                    });
            } else {
                this.openScreenShareModal(username, stream);
            }
        };

        // Handle errors
        pipVideo.onerror = (err) => {
            console.error('Video error:', err);
            this.toast.show('Failed to load screen share', 'error');
        };
    }

    openScreenShareModal(username, stream) {
        console.log(`📺 Opening screen share modal for ${username}`);

        // Create or get modal
        let modal = document.getElementById('screenShareModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'screenShareModal';
            modal.className = 'screen-share-modal';
            modal.innerHTML = `
                <div class="screen-share-modal-content">
                    <div class="screen-share-modal-header">
                        <div class="screen-share-modal-title">
                            <i class="fas fa-desktop"></i>
                            <span id="screenShareUsername">Screen Share</span>
                        </div>
                        <div class="screen-share-modal-controls">
                            <button class="screen-share-modal-btn" id="screenSharePIPBtn" title="Picture-in-Picture">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                            <button class="screen-share-modal-btn" id="screenShareFullscreenBtn" title="Fullscreen">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="screen-share-modal-btn close" id="screenShareCloseBtn" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="screen-share-modal-body">
                        <video id="screenShareVideo" autoplay playsinline controls></video>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Setup event listeners
            const closeBtn = modal.querySelector('#screenShareCloseBtn');
            closeBtn.addEventListener('click', () => this.closeScreenShareModal());

            const pipBtn = modal.querySelector('#screenSharePIPBtn');
            pipBtn.addEventListener('click', () => {
                const video = modal.querySelector('#screenShareVideo');
                if (video && video.srcObject) {
                    this.openPIPMode(username, video.srcObject);
                }
            });

            const fullscreenBtn = modal.querySelector('#screenShareFullscreenBtn');
            fullscreenBtn.addEventListener('click', () => {
                const video = modal.querySelector('#screenShareVideo');
                if (video.requestFullscreen) {
                    video.requestFullscreen();
                } else if (video.webkitRequestFullscreen) {
                    video.webkitRequestFullscreen();
                } else if (video.mozRequestFullScreen) {
                    video.mozRequestFullScreen();
                }
            });

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeScreenShareModal();
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    this.closeScreenShareModal();
                }
            });
        }

        // Update content
        const video = modal.querySelector('#screenShareVideo');
        const usernameEl = modal.querySelector('#screenShareUsername');

        if (video) {
            video.srcObject = stream;
        }
        if (usernameEl) {
            usernameEl.textContent = `${username}'s Screen`;
        }

        // Show modal
        modal.classList.add('show');
        this.toast.show(`Viewing ${username}'s screen`, 'success');
    }

    closeScreenShareModal() {
        const modal = document.getElementById('screenShareModal');
        if (modal) {
            modal.classList.remove('show');
            const video = modal.querySelector('#screenShareVideo');
            if (video) {
                video.srcObject = null;
            }
        }
    }

    updateVoiceChannelUsers(channelName, users) {
        console.log(`Updating voice channel users for ${channelName}: ${users.join(', ')}`);

        const voiceChannelsContainer = document.getElementById('voiceChannelsList');
        if (!voiceChannelsContainer) return;

        // Find the channel element
        const channelEl = voiceChannelsContainer.querySelector(`.voice-channel-item[data-channel="${channelName}"]`);
        if (!channelEl) return;

        const countEl = channelEl.querySelector('.voice-user-count');
        const usersEl = channelEl.querySelector('.voice-channel-users');
        const isConnected = channelName === this.currentChannel;

        // Update user count
        if (countEl) {
            countEl.textContent = users.length || '';
        }

        // Update users list
        if (usersEl) {
            if (users.length > 0) {
                usersEl.style.display = 'block';
                usersEl.innerHTML = users
                    .map((user) => {
                        const state = this.userVoiceStates.get(user) || {};
                        const isSelf = user === this.socket.auth?.username;

                        let statusIcon = 'fa-microphone';
                        if (state.deafened) {
                            statusIcon = 'fa-headphones-slash';
                        } else if (state.muted) {
                            statusIcon = 'fa-microphone-slash';
                        }

                        return `
            <div class="voice-user ${isSelf ? 'current-user' : ''}" data-username="${user}">
              <div class="voice-user-avatar">${user.charAt(0).toUpperCase()}</div>
              <span class="voice-user-name">${user}</span>
              <i class="fas ${statusIcon} voice-user-status"></i>
            </div>
          `;
                    })
                    .join('');

                // Add context menu event listeners to voice users
                const myUsername = this.socket.auth?.username || sessionStorage.getItem('wyvernUsername');
                const voiceUserEls = usersEl.querySelectorAll('.voice-user');
                console.log(`🎯 Adding context menu to ${voiceUserEls.length} voice users (myUsername: ${myUsername})`);

                voiceUserEls.forEach((userEl) => {
                    const username = userEl.dataset.username;

                    // Don't add context menu to self
                    if (username !== myUsername) {
                        console.log(`✅ Adding context menu listener to ${username}`);
                        userEl.addEventListener('contextmenu', (e) => {
                            console.log(`🖱️ Right-clicked on ${username}`);
                            // Check if user is admin (will be set by main app)
                            const isAdmin = window.wyvernIsAdmin || false;
                            console.log(`Admin status: ${isAdmin}`);
                            this.showContextMenu(e, username, isAdmin);
                        });

                        // Add hover effect
                        userEl.style.cursor = 'context-menu';
                    } else {
                        console.log(`⏭️ Skipping context menu for self (${username})`);
                    }
                });

                // Restore video elements for users with camera on
                users.forEach((user) => {
                    const state = this.userVoiceStates.get(user) || {};
                    if (state.camera) {
                        const stream = this.remoteVideoStreams.get(user);
                        if (stream) {
                            this.displayVideoInChannelList(user, stream);
                        }
                    }

                    // Add screen share button if sharing
                    if (state.screenSharing) {
                        this.updateParticipantStatus(user);
                    }
                });
            } else {
                usersEl.style.display = 'none';
            }
        }

        // Update connection status
        if (isConnected) {
            channelEl.classList.add('connected');
        } else {
            channelEl.classList.remove('connected');
        }
    }

    displayVideoInChannelList(username, stream) {
        console.log(`displayVideoInChannelList called for ${username}`);
        const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${username}"]`);
        console.log(`Found ${voiceUsers.length} voice-user elements for ${username}`);

        voiceUsers.forEach((userEl) => {
            // Create video container if it doesn't exist
            let videoContainer = userEl.querySelector('.voice-user-video-container');
            if (!videoContainer) {
                videoContainer = document.createElement('div');
                videoContainer.className = 'voice-user-video-container';

                const videoEl = document.createElement('video');
                videoEl.className = 'voice-user-video';
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.muted = username === this.socket.auth?.username; // Mute own video

                const nameOverlay = document.createElement('div');
                nameOverlay.className = 'voice-user-video-name';
                nameOverlay.textContent = username;

                videoContainer.appendChild(videoEl);
                videoContainer.appendChild(nameOverlay);

                // Replace user element content with video container
                const avatar = userEl.querySelector('.voice-user-avatar');
                const name = userEl.querySelector('.voice-user-name');
                const status = userEl.querySelector('.voice-user-status');

                if (avatar) avatar.remove();
                if (name) name.remove();

                userEl.insertBefore(videoContainer, userEl.firstChild);

                // Move status icon into video container
                if (status) {
                    videoContainer.appendChild(status);
                }
            }

            const videoEl = videoContainer.querySelector('video');
            if (videoEl) {
                videoEl.srcObject = stream;
            }

            userEl.classList.add('has-video-expanded');
        });
    }

    removeVideoFromChannelList(username) {
        const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${username}"]`);
        voiceUsers.forEach((userEl) => {
            // Remove video container
            const videoContainer = userEl.querySelector('.voice-user-video-container');
            if (videoContainer) {
                // Get status icon before removing container
                const status = videoContainer.querySelector('.voice-user-status');

                // Remove video container
                videoContainer.remove();

                // Restore original structure
                const avatar = document.createElement('div');
                avatar.className = 'voice-user-avatar';
                avatar.textContent = username.charAt(0).toUpperCase();

                const name = document.createElement('span');
                name.className = 'voice-user-name';
                name.textContent = username;

                userEl.insertBefore(avatar, userEl.firstChild);
                userEl.insertBefore(name, userEl.children[1]);

                // Re-add status icon
                if (status) {
                    userEl.appendChild(status);
                }

                userEl.classList.remove('has-video-expanded');
            }
        });
    }
}

