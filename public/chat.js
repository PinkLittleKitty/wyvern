(() => {
  // Unified Toast Notification System
  const toastContainer = document.getElementById('toastContainer');
  let toastId = 0;

  function showToast(message, type = 'info', title = null, duration = 4000) {
    const id = toastId++;
    
    // Icon mapping
    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>',
      debug: '<i class="fas fa-bug"></i>'
    };

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.id = id;
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
      ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    toastContainer.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(toast);
      }, duration);
    }

    return id;
  }

  function removeToast(toast) {
    if (!toast || !toast.parentElement) return;
    
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  // Convenience functions
  function showNotification(msg, type = 'success') {
    showToast(msg, type);
  }

  function log(msg) {
    console.log(msg);
    // Only show debug toasts in development or when needed
    // showToast(msg, 'debug', 'Debug', 3000);
  }

  // ==================== SOUND MANAGER ====================
  const soundManager = {
    sounds: {
      notification: new Audio('/sounds/notification.mp3'),
      join: new Audio('/sounds/join.mp3'),
      leave: new Audio('/sounds/leave.mp3')
    },
    
    enabled: localStorage.getItem('wyvernSoundsEnabled') !== 'false',
    volume: parseFloat(localStorage.getItem('wyvernSoundsVolume') || '0.5'),
    
    init() {
      // Set volume for all sounds
      Object.values(this.sounds).forEach(sound => {
        sound.volume = this.volume;
      });
      
      // Create fallback sounds using Web Audio API if files don't exist
      this.createFallbackSounds();
    },
    
    createFallbackSounds() {
      // Simple beep sounds as fallback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      this.playBeep = (frequency = 440, duration = 100, volume = 0.3) => {
        if (!this.enabled) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume * this.volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
      };
    },
    
    play(soundName) {
      if (!this.enabled) return;
      
      const sound = this.sounds[soundName];
      if (sound) {
        // Clone and play to allow overlapping sounds
        const clone = sound.cloneNode();
        clone.volume = this.volume;
        clone.play().catch(err => {
          log(`Sound play error: ${err.message}`);
          // Fallback to beep
          this.playFallback(soundName);
        });
      } else {
        this.playFallback(soundName);
      }
    },
    
    playFallback(soundName) {
      // Play different beeps for different events
      switch(soundName) {
        case 'message':
          this.playBeep(600, 80, 0.3);
          break;
        case 'notification':
          this.playBeep(700, 120, 0.35);
          break;
        case 'join':
          this.playBeep(500, 100, 0.25);
          setTimeout(() => this.playBeep(700, 100, 0.25), 80);
          break;
        case 'leave':
          this.playBeep(700, 100, 0.25);
          setTimeout(() => this.playBeep(500, 100, 0.25), 80);
          break;
      }
    },
    
    setEnabled(enabled) {
      this.enabled = enabled;
      localStorage.setItem('wyvernSoundsEnabled', enabled);
    },
    
    setVolume(volume) {
      this.volume = Math.max(0, Math.min(1, volume));
      localStorage.setItem('wyvernSoundsVolume', this.volume);
      Object.values(this.sounds).forEach(sound => {
        sound.volume = this.volume;
      });
    }
  };
  
  // Initialize sound manager
  soundManager.init();
  
  // Make it globally accessible for settings
  window.soundManager = soundManager;

  // Check if user is logged in
  let username = sessionStorage.getItem("wyvernUsername");
  if (!username) {
    log('No username found, redirecting to login');
    window.location.href = "/login.html";
    return;
  }

  log(`Username: ${username}`);

  // Loading screen
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingTips = document.getElementById('loadingTips');
  
  const tips = [
    'Explode',
    'Read if cute',
    'Have a nice day!',
    'Starting Lightcord...',
    'Loading 0BDFDB.plugin.js...',
    'Installing BetterDiscord...',
    'h',
    'shhhhh did you know that you\'re my favourite user? But don\'t tell the others!!',
    'Today\'s video is sponsored by Raid Shadow Legends, one of the biggest mobile role-playing games of 2019 and it\'s totally free!',
    'Never gonna give you up, Never gonna let you down',
    '( Í¡Â° ÍœÊ– Í¡Â°)',
    '(ï¾‰â—•ãƒ®â—•)ï¾‰*:ï½¥ï¾Ÿâœ§',
    'You look so pretty today!',
    'Thinking of a funny quote...',
    '3.141592653589793',
    'meow',
    'Welcome, friend',
    'If you, or someone you love, has Ligma, please see the Ligma health line',
    'I\'d just like to interject for a moment. What you\'re refering to as Linux, is in fact, GNU/Linux',
    'You\'re doing good today!',
    'Don\'t worry, it\'s nothing 9 cups of coffee couldn\'t solve!',
    'a light amount of tomfoolery is okay',
    'do you love?',
    'horror',
    'so eepy',
    'So without further ado, let\'s just jump right into it!',
    'Dying is absolutely safe',
    'hey you! you\'re cute :))',
    'heya ~',
    'Time is gone, space is insane. Here it comes, here again.',
    'sometimes it\'s okay to just guhhhhhhhhhhhhhh',
    'Welcome to nginx!'
  ];
  
  let tipInterval;
  function showRandomTip() {
    if (loadingTips) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      loadingTips.innerHTML = `<span class="loading-tip">${randomTip}</span>`;
    }
  }
  
  // Start showing random tips
  showRandomTip();
  tipInterval = setInterval(showRandomTip, 4000);
  
  // Fallback: hide loading screen after 10 seconds if something goes wrong
  const loadingTimeout = setTimeout(() => {
    log('âš ï¸ Loading timeout - forcing hide');
    hideLoadingScreen();
  }, 10000);
  
  // Allow clicking loading screen to dismiss it (emergency escape)
  if (loadingScreen) {
    loadingScreen.addEventListener('click', () => {
      log('Loading screen clicked - manual dismiss');
      hideLoadingScreen();
    });
  }
  
  function hideLoadingScreen() {
    log('ðŸ”„ Hiding loading screen...');
    if (tipInterval) clearInterval(tipInterval);
    if (loadingTimeout) clearTimeout(loadingTimeout);
    if (loadingScreen) {
      log('Adding hidden class to loading screen');
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        log('âœ… Loading screen hidden class added');
      }, 300);
    } else {
      log('âš ï¸ Loading screen element not found');
    }
  }

  // User profiles cache
  const userProfiles = new Map();

  async function getUserProfile(targetUsername) {
    // Check cache first
    if (userProfiles.has(targetUsername)) {
      return userProfiles.get(targetUsername);
    }

    try {
      const token = sessionStorage.getItem('wyvernToken');
      const response = await fetch(`/api/profile/${targetUsername}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const profile = await response.json();
      userProfiles.set(targetUsername, profile);
      return profile;
    } catch (error) {
      log(`Profile fetch error for ${targetUsername}: ${error.message}`);
      return null;
    }
  }

  function getAvatarHTML(targetUsername, profile) {
    if (profile && profile.avatar) {
      return `<img src="${profile.avatar}" alt="${targetUsername}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />`;
    } else {
      return targetUsername.charAt(0).toUpperCase();
    }
  }

  function getProfileColor(profile) {
    return profile && profile.profileColor ? profile.profileColor : '#8b5cf6';
  }

  // Voice chat variables (declared early for button handlers)
  let currentVoiceChannel = null;
  let localStream = null;
  let peerConnections = new Map();
  let isMuted = false;
  let isCameraOn = false;
  let localVideoStream = null;
  let isScreenSharing = false;
  let localScreenStream = null;
  
  // Store voice channel users for each channel
  const voiceChannelUsers = new Map();
  
  // Store user states (muted/deafened) for each user
  const userVoiceStates = new Map(); // username -> { muted: bool, deafened: bool, camera: bool, screenSharing: bool }
  
  // Store remote video streams for restoration after re-renders
  const remoteVideoStreams = new Map(); // username -> MediaStream
  
  // Store remote screen streams
  const remoteScreenStreams = new Map(); // username -> MediaStream

  // Get token
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  const token = getCookie('token') || localStorage.getItem('wyvernToken');
  log(`Token: ${token ? 'Found' : 'Not found'}`);

  if (!token) {
    log('No token found, redirecting to login');
    setTimeout(() => window.location.href = "/login.html", 2000);
    return;
  }

  // Test server connection first
  log('Testing server connection...');
  fetch('/api/server-info')
    .then(res => {
      log(`Server response status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      log(`Server HTTPS: ${data.https}, Voice: ${data.voiceSupported}`);
      initializeSocket();
    })
    .catch(err => {
      log(`Server connection failed: ${err.message}`);
      showNotification('Cannot connect to server', 'error');
      setTimeout(() => {
        log('Retrying connection...');
        window.location.reload();
      }, 5000);
    });

  function tryPollingOnlyConnection() {
    log('Trying polling-only connection as fallback...');

    const fallbackSocket = io('https://193.149.164.240:4196', {
      transports: ["polling"],
      auth: { token },
      timeout: 15000,
      reconnection: false,
      forceNew: true,
      secure: true
    });

    fallbackSocket.on("connect", () => {
      log("âœ… Fallback connection successful!");
      showNotification('Connected via polling fallback!', 'success');
      window.wyvernSocket = fallbackSocket;
      setupSocketHandlers(fallbackSocket);
    });

    fallbackSocket.on("connect_error", (error) => {
      log(`âŒ Fallback connection also failed: ${error.message}`);
      showNotification('All connection attempts failed. Please check server status.', 'error');
    });
  }

  function initializeSocket() {
    log('Initializing Socket.IO connection...');

    // Make sure Socket.IO is loaded
    if (typeof io === 'undefined') {
      log('Socket.IO not loaded, loading script...');
      const script = document.createElement('script');
      script.src = 'https://193.149.164.240:4196/socket.io/socket.io.js';
      script.onload = () => {
        log('Socket.IO script loaded, retrying...');
        setTimeout(initializeSocket, 100);
      };
      script.onerror = () => {
        log('Failed to load Socket.IO script');
        showNotification('Failed to load Socket.IO', 'error');
      };
      document.head.appendChild(script);
      return;
    }

    const socket = io('https://193.149.164.240:4196', {
      transports: ["websocket", "polling"],
      auth: { token },
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: false,
      secure: true
    });

    // Store socket globally for debugging
    window.wyvernSocket = socket;

    // Setup all socket handlers
    setupSocketHandlers(socket);

    socket.on("connect_error", (error) => {
      log(`âŒ Connection error: ${error.message}`);
      console.error('Full error:', error);
      console.error('Error type:', error.type);
      console.error('Error description:', error.description);
      showNotification(`Connection failed: ${error.message}`, 'error');

      // Try different approach based on error type
      if (error.message.includes('Authentication') || error.message.includes('auth')) {
        log('Authentication failed, redirecting to login');
        setTimeout(() => window.location.href = "/login.html", 2000);
      } else if (error.message.includes('timeout')) {
        log('Connection timeout - trying polling-only fallback...');
        setTimeout(() => {
          tryPollingOnlyConnection();
        }, 2000);
      } else if (error.message.includes('xhr poll error')) {
        log('Polling failed, this might be a server configuration issue');
        showNotification('Server connection issue - check if server is running', 'error');
      }
    });
  }

  function setupSocketHandlers(socket) {
    // Connection events
    socket.on("connect", () => {
      log("âœ… Connected to server successfully!");
      showNotification('Connected to Wyvern!', 'success');
      
      // Load and display own profile in user panel
      updateUserPanel();

      // Join default channel after connection
      socket.emit('joinChannel', 'general');
      currentTextChannel = 'general';
      log('Joined general channel');
    });

    socket.on("disconnect", (reason) => {
      log(`Disconnected: ${reason}`);
      showNotification('Disconnected from server', 'error');
    });

    socket.on("reconnect", (attemptNumber) => {
      log(`Reconnected after ${attemptNumber} attempts`);
      showNotification('Reconnected!', 'success');
      socket.emit('joinChannel', currentTextChannel || 'general');
      currentTextChannel = currentTextChannel || 'general';
    });

    socket.on("reconnect_error", (error) => {
      log(`Reconnection failed: ${error.message}`);
    });

    socket.on("reconnect_failed", () => {
      log('All reconnection attempts failed');
      showNotification('Connection lost. Please refresh the page.', 'error');
    });

    // User info
    socket.on("userInfo", (data) => {
      log(`Received user info: ${data.username}, Admin: ${data.isAdmin}`);
      isCurrentUserAdmin = data.isAdmin || false;

      // Update user panel
      const userPanelName = document.getElementById("userPanelName");
      const userPanelAvatar = document.getElementById("userPanelAvatar");
      const userPanelAdminBadge = document.getElementById("userPanelAdminBadge");
      
      if (userPanelName) {
        userPanelName.textContent = data.username;
      }
      if (userPanelAvatar) {
        userPanelAvatar.textContent = data.username.charAt(0).toUpperCase();
      }
      if (userPanelAdminBadge && data.isAdmin) {
        userPanelAdminBadge.style.display = 'inline-block';
      }
    });

    // Online users list
    socket.on("onlineUsers", (users) => {
      log(`Received ${users.length} online users`);
      updateOnlineUsersList(users);
    });

    // Basic chat functionality
    socket.on("chatMessage", (data) => {
      log(`Received message from ${data.username}`);
      displayMessage(data);
    });

    socket.on("chatHistory", async (history) => {
      try {
        log(`Received ${history.length} messages`);
        const messagesContainer = document.getElementById("chat-messages");
        messagesContainer.innerHTML = "";
        
        // Pre-fetch all unique user profiles in parallel
        const uniqueUsernames = [...new Set(history.map(msg => msg.username))];
        await Promise.all(uniqueUsernames.map(name => getUserProfile(name)));
        
        // Now display messages sequentially (profiles are cached)
        // Pass true to indicate this is history loading (no notifications)
        for (const message of history) {
          await displayMessage(message, true);
        }
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Hide loading screen after everything is loaded
        log('âœ… All messages loaded, hiding loading screen');
        hideLoadingScreen();
      } catch (error) {
        log(`âŒ Error loading messages: ${error.message}`);
        console.error(error);
        // Hide loading screen even on error
        hideLoadingScreen();
      }
    });

    // Message deleted by admin
    socket.on("messageDeleted", (data) => {
      const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
      if (messageEl) {
        messageEl.classList.add('removing');
        setTimeout(() => messageEl.remove(), 300);
      }
    });

    // Kicked from voice by admin
    socket.on("kickedFromVoice", (data) => {
      showToast('You were kicked from the voice channel by an admin', 'error', 'Kicked');
      leaveVoiceChannel();
    });

    // Disconnected by admin
    socket.on("disconnected", (data) => {
      showToast('You were disconnected by an admin', 'error', 'Disconnected');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });

    // Typing indicator
    const typingUsers = new Set();
    socket.on("typing", (data) => {
      const typingIndicator = document.getElementById("typingIndicator");
      if (!typingIndicator) return;

      if (data.isTyping && data.username !== username) {
        typingUsers.add(data.username);
      } else {
        typingUsers.delete(data.username);
      }

      // Update typing indicator display
      if (typingUsers.size === 0) {
        typingIndicator.textContent = "";
        typingIndicator.style.display = "none";
      } else if (typingUsers.size === 1) {
        const user = Array.from(typingUsers)[0];
        typingIndicator.textContent = `${user} is typing...`;
        typingIndicator.style.display = "flex";
      } else if (typingUsers.size === 2) {
        const users = Array.from(typingUsers);
        typingIndicator.textContent = `${users[0]} and ${users[1]} are typing...`;
        typingIndicator.style.display = "flex";
      } else {
        typingIndicator.textContent = `Several people are typing...`;
        typingIndicator.style.display = "flex";
      }
    });

    // Track channel joins
    socket.on("joinedChannel", (channelName) => {
      currentTextChannel = channelName;
      updateChannelActiveStates();
    });

    // Channel updates
    socket.on("channelUpdate", (channels) => {
      log(`Received ${channels.length} text channels`);
      updateChannelList(channels, 'text');
    });

    socket.on("voiceChannelUpdate", (channels) => {
      log(`Received ${channels.length} voice channels`);
      updateChannelList(channels, 'voice');

      // Force update display after receiving channels
      setTimeout(() => {
        forceUpdateVoiceChannelDisplay();
      }, 100);
    });

    // Voice channel users
    socket.on("voiceChannelUsers", (data) => {
      log(`Voice channel ${data.channel} has ${data.users.length} users: ${data.users.join(', ')}`);
      updateVoiceChannelUsers(data.channel, data.users);

      // If we're in this voice channel and have local stream, establish connections with existing users
      if (currentVoiceChannel === data.channel && localStream && data.users.length > 1) {
        log(`Checking for existing users to connect to in ${data.channel}`);
        // Note: We should get userJoinedVoice events for existing users, but let's add this as backup
      }
    });

    // Voice chat events
    socket.on("userJoinedVoice", (data) => {
      log(`${data.username} joined voice channel: ${data.channel}`);
      showNotification(`${data.username} joined voice chat`, 'success');
      
      // Play join sound if not self
      if (data.username !== username) {
        soundManager.play('join');
      }

      // Create peer connection for new user if we're in the same channel and have local stream
      if (data.socketId !== socket.id && currentVoiceChannel === data.channel && localStream) {
        // Only initiate if our socket ID is "greater" to avoid duplicate connections
        const shouldInitiate = socket.id > data.socketId;
        
        // Skip if we already have a connection to this user
        if (!peerConnections.has(data.socketId)) {
          log(`Creating WebRTC connection to ${data.username} (${data.socketId}) - shouldInitiate: ${shouldInitiate}`);
          createPeerConnection(data.socketId, data.username, shouldInitiate);
        } else {
          log(`Already have peer connection to ${data.username}, skipping`);
        }
      } else {
        log(`Skipping WebRTC connection: socketId=${data.socketId}, myId=${socket.id}, currentChannel=${currentVoiceChannel}, targetChannel=${data.channel}, hasStream=${!!localStream}`);
      }
    });

    socket.on("userLeftVoice", (data) => {
      log(`${data.username} left voice channel: ${data.channel}`);
      showNotification(`${data.username} left voice chat`, 'info');
      
      // Play leave sound
      soundManager.play('leave');

      // Clean up peer connection
      if (peerConnections.has(data.socketId)) {
        peerConnections.get(data.socketId).close();
        peerConnections.delete(data.socketId);
      }

      // Clean up video, audio, and screen
      removeRemoteAudio(data.username);
      removeRemoteVideo(data.username);
      removeRemoteScreen(data.username);

      // Clear user voice state
      userVoiceStates.delete(data.username);
    });

    socket.on("voiceChannelDeleted", (channelName) => {
      if (currentVoiceChannel === channelName) {
        log(`Voice channel ${channelName} was deleted`);
        leaveVoiceChannel();
        showNotification(`Voice channel ${channelName} was deleted`, 'error');
      }
    });

    socket.on("userSpeaking", (data) => {
      // Handle speaking indicator
      const participants = document.querySelectorAll('.voice-participant');
      participants.forEach(participant => {
        const nameEl = participant.querySelector('.voice-participant-name');
        const statusEl = participant.querySelector('.voice-participant-status');
        if (nameEl && nameEl.textContent === data.username) {
          statusEl.innerHTML = data.speaking ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-microphone"></i>';
        }
      });
    });

    socket.on("userMuted", (data) => {
      log(`${data.username} ${data.muted ? 'muted' : 'unmuted'}`);
      
      // Update stored state
      const state = userVoiceStates.get(data.username) || { muted: false, deafened: false };
      state.muted = data.muted;
      userVoiceStates.set(data.username, state);
      
      // Update UI
      updateParticipantStatus(data.username);
    });

    socket.on("userDeafened", (data) => {
      log(`${data.username} ${data.deafened ? 'deafened' : 'undeafened'}`);
      
      // Update stored state
      const state = userVoiceStates.get(data.username) || { muted: false, deafened: false, camera: false };
      state.deafened = data.deafened;
      userVoiceStates.set(data.username, state);
      
      // Update UI
      updateParticipantStatus(data.username);
    });

    socket.on("userCamera", (data) => {
      log(`${data.username} camera ${data.camera ? 'enabled' : 'disabled'}`);
      
      // Update stored state
      const state = userVoiceStates.get(data.username) || { muted: false, deafened: false, camera: false, screenSharing: false };
      state.camera = data.camera;
      userVoiceStates.set(data.username, state);
      
      // Update UI
      updateParticipantStatus(data.username);
    });

    socket.on("userScreenSharing", (data) => {
      log(`${data.username} screen sharing ${data.screenSharing ? 'started' : 'stopped'}`);
      
      // Update stored state
      const state = userVoiceStates.get(data.username) || { muted: false, deafened: false, camera: false, screenSharing: false };
      state.screenSharing = data.screenSharing;
      userVoiceStates.set(data.username, state);
      
      if (data.screenSharing) {
        // They started sharing - check if we already received a video stream that we misidentified
        const existingVideoStream = remoteVideoStreams.get(data.username);
        const hasScreenStream = remoteScreenStreams.has(data.username);
        
        log(`ðŸ“Š Screen sharing state for ${data.username}: hasVideo=${!!existingVideoStream}, hasScreen=${hasScreenStream}`);
        
        if (existingVideoStream && !hasScreenStream) {
          // We have a video stream but no screen stream - the video stream might be the screen
          // Move it from video to screen
          log(`ðŸ”„ Re-identifying video stream as screen share for ${data.username}`);
          remoteScreenStreams.set(data.username, existingVideoStream);
          
          // Don't delete from remoteVideoStreams yet - they might have both camera and screen
          // Just hide the video elements that were created
          const participants = document.querySelectorAll(`.voice-participant[data-username="${data.username}"]`);
          participants.forEach(participant => {
            const videoEl = participant.querySelector('video.remote-video');
            if (videoEl && videoEl.srcObject === existingVideoStream) {
              videoEl.srcObject = null;
              videoEl.remove();
              participant.classList.remove('has-video');
            }
          });
          
          const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${data.username}"]`);
          voiceUsers.forEach(userEl => {
            const videoContainer = userEl.querySelector('.voice-user-video-container');
            if (videoContainer) {
              const videoEl = videoContainer.querySelector('video');
              if (videoEl && videoEl.srcObject === existingVideoStream) {
                videoContainer.remove();
                userEl.classList.remove('has-video-expanded');
              }
            }
          });
          
          // Force re-render to restore original structure
          forceUpdateVoiceChannelDisplay();
        }
      } else {
        // They stopped sharing, remove the stream
        removeRemoteScreen(data.username);
      }
      
      // Update UI to show/hide screen sharing icon
      updateParticipantStatus(data.username);
    });

    // WebRTC signaling events
    socket.on("webrtc-offer", async (data) => {
      log(`ðŸ“ž Received WebRTC offer from ${data.username} (${data.from})`);

      if (!localStream) {
        log(`âŒ Cannot handle offer - no local stream`);
        return;
      }

      // Check if we already have a connection
      let pc = peerConnections.get(data.from);
      
      if (pc) {
        // Handle renegotiation
        if (pc.signalingState === 'stable') {
          log(`ðŸ”„ Handling renegotiation from ${data.username}`);
          try {
            await pc.setRemoteDescription(data.offer);
            log(`âœ… Set remote description for renegotiation from ${data.username}`);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            log(`âœ… Created and set local answer for renegotiation`);

            socket.emit("webrtc-answer", {
              answer: answer,
              to: data.from
            });
            log(`ðŸ“¤ Sent WebRTC answer to ${data.username}`);
          } catch (err) {
            log(`âŒ Error handling renegotiation from ${data.username}: ${err.message}`);
          }
          return;
        } else {
          log(`âš ï¸ Connection not stable (${pc.signalingState}), ignoring offer`);
          return;
        }
      }

      // Create new peer connection for initial connection
      pc = createPeerConnection(data.from, data.username, false);

      try {
        await pc.setRemoteDescription(data.offer);
        log(`âœ… Set remote description for ${data.username}`);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        log(`âœ… Created and set local answer for ${data.username}`);

        socket.emit("webrtc-answer", {
          answer: answer,
          to: data.from
        });
        log(`ðŸ“¤ Sent WebRTC answer to ${data.username}`);
      } catch (err) {
        log(`âŒ Error handling WebRTC offer from ${data.username}: ${err.message}`);
      }
    });

    socket.on("webrtc-answer", async (data) => {
      log(`ðŸ“ž Received WebRTC answer from ${data.username} (${data.from})`);
      const pc = peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(data.answer);
          log(`âœ… Set remote description from answer for ${data.username}`);
        } catch (err) {
          log(`âŒ Error handling WebRTC answer from ${data.username}: ${err.message}`);
        }
      } else {
        log(`âŒ No peer connection found for ${data.username} (${data.from})`);
      }
    });

    socket.on("webrtc-ice-candidate", async (data) => {
      log(`ðŸ§Š Received ICE candidate from ${data.from}`);
      const pc = peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.addIceCandidate(data.candidate);
          log(`âœ… Added ICE candidate from ${data.from}`);
        } catch (err) {
          log(`âŒ Error adding ICE candidate from ${data.from}: ${err.message}`);
        }
      } else {
        log(`âŒ No peer connection found for ICE candidate from ${data.from}`);
      }
    });

    // Direct Message handlers
    socket.on("directMessage", async (data) => {
      log(`ðŸ“¨ Received DM from ${data.sender}`);
      
      // If we're currently viewing this DM conversation, display it
      if (currentDMRecipient === data.sender || currentDMRecipient === data.recipient) {
        await displayDirectMessage(data);
      }
      
      // Update DM list
      updateDMList();
      
      // Show notification if not from self
      if (data.sender !== username) {
        showToast(`New message from ${data.sender}`, 'info', 'Direct Message');
        soundManager.play('message');
      }
    });

    socket.on("directMessageHistory", async (data) => {
      log(`ðŸ“¨ Received DM history with ${data.recipient}: ${data.messages.length} messages`);
      const messagesContainer = document.getElementById("chat-messages");
      messagesContainer.innerHTML = "";
      
      for (const message of data.messages) {
        await displayDirectMessage(message);
      }
      
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    socket.on("conversationsList", (conversations) => {
      log(`ðŸ“¨ Received ${conversations.length} conversations`);
      displayConversationsList(conversations);
    });

    socket.on("dmRead", (data) => {
      log(`âœ… ${data.username} read your messages`);
    });

    // Basic message sending
    const input = document.getElementById("chat-input");
    const button = document.getElementById("send-button");
    let typingTimeout;
    let isTyping = false;

    // File upload handling
    let selectedFiles = [];
    const uploadButton = document.getElementById('upload-button');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');

    if (uploadButton && fileInput) {
      uploadButton.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        selectedFiles = [...selectedFiles, ...files];
        updateFilePreview();
        fileInput.value = ''; // Reset input
      });
    }

    function updateFilePreview() {
      if (selectedFiles.length === 0) {
        filePreview.classList.remove('show');
        filePreview.innerHTML = '';
        return;
      }

      filePreview.classList.add('show');
      filePreview.innerHTML = selectedFiles.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        const fileSize = formatFileSize(file.size);
        
        if (isImage) {
          const url = URL.createObjectURL(file);
          return `
            <div class="file-preview-item">
              <img src="${url}" alt="${file.name}" />
              <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${fileSize}</div>
              </div>
              <button class="file-preview-remove" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        } else {
          return `
            <div class="file-preview-item">
              <div class="file-icon">
                <i class="fas fa-file"></i>
              </div>
              <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${fileSize}</div>
              </div>
              <button class="file-preview-remove" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        }
      }).join('');
    }

    window.removeFile = function(index) {
      selectedFiles.splice(index, 1);
      updateFilePreview();
    };

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async function uploadFiles() {
      if (selectedFiles.length === 0) return [];

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      try {
        const token = sessionStorage.getItem('wyvernToken');
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.files;
      } catch (error) {
        log(`Upload error: ${error.message}`);
        showToast('Failed to upload files', 'error');
        return [];
      }
    }

    async function sendMessage() {
      const text = input.value.trim();
      const hasFiles = selectedFiles.length > 0;
      
      if (!text && !hasFiles) return;

      // Check if we're in DM mode
      if (isDMMode && currentDMRecipient) {
        // Upload files first if any
        let attachments = [];
        if (hasFiles) {
          attachments = await uploadFiles();
          if (attachments.length === 0 && hasFiles) {
            return;
          }
        }

        log(`Sending DM to ${currentDMRecipient}: ${text}`);
        
        socket.emit("sendDirectMessage", { 
          recipient: currentDMRecipient,
          message: text || '',
          attachments: attachments
        });
        
        input.value = "";
        selectedFiles = [];
        updateFilePreview();
        return;
      }

      // Regular channel message
      // Upload files first if any
      let attachments = [];
      if (hasFiles) {
        attachments = await uploadFiles();
        if (attachments.length === 0 && hasFiles) {
          // Upload failed
          return;
        }
      }

      // Extract mentions from the message
      const mentions = extractMentions(text);

      log(`Sending message: ${text}${mentions.length > 0 ? ` (mentions: ${mentions.join(', ')})` : ''}${attachments.length > 0 ? ` with ${attachments.length} file(s)` : ''}`);
      
      socket.emit("chatMessage", { 
        username, 
        message: text || '',
        mentions: mentions,
        attachments: attachments
      });
      
      input.value = "";
      selectedFiles = [];
      updateFilePreview();
      
      // Stop typing indicator when message is sent
      stopTyping();
    }

    function extractMentions(text) {
      const mentions = [];
      // Match @username or @everyone
      const mentionRegex = /@(\w+)/g;
      let match;
      
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }
      
      return mentions;
    }

    function startTyping() {
      if (!isTyping) {
        isTyping = true;
        socket.emit("typing", { username, isTyping: true });
      }
      
      // Clear existing timeout
      clearTimeout(typingTimeout);
      
      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeout = setTimeout(() => {
        stopTyping();
      }, 3000);
    }

    function stopTyping() {
      if (isTyping) {
        isTyping = false;
        socket.emit("typing", { username, isTyping: false });
      }
      clearTimeout(typingTimeout);
    }

    if (button) {
      button.addEventListener("click", sendMessage);
    }

    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        } else if (e.key.length === 1 || e.key === "Backspace") {
          // User is typing
          startTyping();
        }
      });

      // Stop typing when input loses focus
      input.addEventListener("blur", () => {
        stopTyping();
      });

      // Mention autocomplete
      input.addEventListener("input", handleMentionAutocomplete);
      input.addEventListener("keydown", handleMentionKeydown);
    }

    // Mention autocomplete variables
    let mentionAutocompleteVisible = false;
    let mentionAutocompleteIndex = 0;
    let mentionSuggestions = [];

    function handleMentionAutocomplete(e) {
      if (!input) {
        log('âŒ Input element not found in autocomplete handler');
        return;
      }
      
      const text = input.value;
      const cursorPos = input.selectionStart;
      
      // Find if we're typing a mention
      const textBeforeCursor = text.substring(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      log(`Autocomplete check: "${textBeforeCursor}" - match: ${mentionMatch ? mentionMatch[0] : 'none'}`);
      
      if (mentionMatch) {
        const query = mentionMatch[1].toLowerCase();
        log(`Showing autocomplete for query: "${query}"`);
        showMentionAutocomplete(query);
      } else {
        hideMentionAutocomplete();
      }
    }

    function showMentionAutocomplete(query) {
      // Get online users from the users list
      const onlineUsers = Array.from(document.querySelectorAll('#usersList .user-item')).map(el => {
        return el.querySelector('.user-name')?.textContent || '';
      }).filter(name => name && name !== username);
      
      log(`Found ${onlineUsers.length} online users: ${onlineUsers.join(', ')}`);
      
      // Add @everyone option
      const allOptions = ['everyone', ...onlineUsers];
      
      // Filter based on query
      mentionSuggestions = allOptions.filter(name => 
        name.toLowerCase().startsWith(query)
      );
      
      log(`Filtered suggestions for "${query}": ${mentionSuggestions.join(', ')}`);
      
      if (mentionSuggestions.length === 0) {
        log('No suggestions found, hiding autocomplete');
        hideMentionAutocomplete();
        return;
      }
      
      mentionAutocompleteIndex = 0;
      mentionAutocompleteVisible = true;
      
      // Create or update autocomplete UI
      let autocompleteEl = document.getElementById('mention-autocomplete');
      if (!autocompleteEl) {
        autocompleteEl = document.createElement('div');
        autocompleteEl.id = 'mention-autocomplete';
        autocompleteEl.className = 'mention-autocomplete';
        document.querySelector('.chat-input').appendChild(autocompleteEl);
      }
      
      autocompleteEl.innerHTML = mentionSuggestions.map((name, index) => `
        <div class="mention-autocomplete-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
          <i class="fas ${name === 'everyone' ? 'fa-users' : 'fa-user'}"></i>
          <span>${name}</span>
        </div>
      `).join('');
      
      autocompleteEl.style.display = 'block';
      
      // Add click handlers
      autocompleteEl.querySelectorAll('.mention-autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          selectMention(parseInt(item.dataset.index));
        });
      });
    }

    function hideMentionAutocomplete() {
      mentionAutocompleteVisible = false;
      const autocompleteEl = document.getElementById('mention-autocomplete');
      if (autocompleteEl) {
        autocompleteEl.style.display = 'none';
      }
    }

    function handleMentionKeydown(e) {
      if (!mentionAutocompleteVisible) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        mentionAutocompleteIndex = (mentionAutocompleteIndex + 1) % mentionSuggestions.length;
        updateAutocompleteSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        mentionAutocompleteIndex = (mentionAutocompleteIndex - 1 + mentionSuggestions.length) % mentionSuggestions.length;
        updateAutocompleteSelection();
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (mentionAutocompleteVisible) {
          e.preventDefault();
          selectMention(mentionAutocompleteIndex);
        }
      } else if (e.key === 'Escape') {
        hideMentionAutocomplete();
      }
    }

    function updateAutocompleteSelection() {
      const items = document.querySelectorAll('.mention-autocomplete-item');
      items.forEach((item, index) => {
        if (index === mentionAutocompleteIndex) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    }

    function selectMention(index) {
      const selectedName = mentionSuggestions[index];
      if (!selectedName) return;
      
      const text = input.value;
      const cursorPos = input.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);
      const textAfterCursor = text.substring(cursorPos);
      
      // Replace the @mention being typed
      const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${selectedName} `);
      input.value = newTextBefore + textAfterCursor;
      input.selectionStart = input.selectionEnd = newTextBefore.length;
      
      hideMentionAutocomplete();
      input.focus();
    }

    // Logout functionality
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await fetch("/auth/logout", { method: "POST" });
        sessionStorage.removeItem("wyvernUsername");
        localStorage.removeItem("wyvernToken");
        window.location.href = "/login.html";
      });
    }

    // User panel button functionality
    const userPanelSettings = document.getElementById("userPanelSettings");

    if (userPanelSettings) {
      userPanelSettings.addEventListener("click", () => {
        openSettingsModal();
      });
    }

    // Settings Modal Functionality
    function openSettingsModal() {
      const modal = document.getElementById('settingsModal');
      if (modal) {
        modal.classList.add('show');
      }
    }

    function closeSettingsModal() {
      const modal = document.getElementById('settingsModal');
      if (modal) {
        modal.classList.remove('show');
      }
    }

    // Close settings button
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', closeSettingsModal);
    }

    // Settings navigation
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    settingsNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        
        // Update active nav item
        settingsNavItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Update active tab
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
      });
    });

    // Theme switching
    const themeOptions = document.querySelectorAll('.theme-option');
    const currentTheme = localStorage.getItem('wyvernTheme') || 'wyvern';
    const customThemeBuilder = document.getElementById('customThemeBuilder');
    
    // Apply saved theme
    applyTheme(currentTheme);
    
    // Mark current theme as selected
    themeOptions.forEach(option => {
      if (option.dataset.theme === currentTheme) {
        option.classList.add('selected');
      }
      
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        
        // Update UI
        themeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Show/hide custom theme builder
        if (theme === 'custom') {
          customThemeBuilder.style.display = 'block';
          loadCustomTheme();
        } else {
          customThemeBuilder.style.display = 'none';
        }
        
        // Apply theme
        applyTheme(theme);
        localStorage.setItem('wyvernTheme', theme);
        
        const themeName = theme.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        showToast(`Theme changed to ${themeName}`, 'success', 'Settings');
      });
    });
    
    // Show custom theme builder if custom theme is selected
    if (currentTheme === 'custom') {
      customThemeBuilder.style.display = 'block';
      loadCustomTheme();
    }
    
    function applyTheme(theme) {
      if (theme === 'custom') {
        applyCustomTheme();
      } else {
        document.body.setAttribute('data-theme', theme);
        // Remove custom theme styles if any
        const customStyle = document.getElementById('custom-theme-style');
        if (customStyle) {
          customStyle.remove();
        }
      }
    }
    
    function loadCustomTheme() {
      const customTheme = JSON.parse(localStorage.getItem('wyvernCustomTheme') || '{}');
      const base = customTheme.base || 'dark';
      
      document.getElementById('customThemeBase').value = base;
      document.getElementById('customAccent').value = customTheme.accent || '#8b5cf6';
      document.getElementById('customBg').value = customTheme.bg || '#0a0a0f';
      document.getElementById('customSidebar').value = customTheme.sidebar || '#13131a';
      document.getElementById('customText').value = customTheme.text || '#e4e4e7';
    }
    
    function applyCustomTheme() {
      const customTheme = JSON.parse(localStorage.getItem('wyvernCustomTheme') || '{}');
      const base = customTheme.base || 'dark';
      
      // Start with base theme
      document.body.setAttribute('data-theme', base === 'dark' ? 'wyvern' : base === 'light' ? 'wyvern-light' : 'wyvern-amoled');
      
      // Apply custom colors
      if (Object.keys(customTheme).length > 0) {
        let customStyle = document.getElementById('custom-theme-style');
        if (!customStyle) {
          customStyle = document.createElement('style');
          customStyle.id = 'custom-theme-style';
          document.head.appendChild(customStyle);
        }
        
        const accent = customTheme.accent || '#8b5cf6';
        const bg = customTheme.bg || '#0a0a0f';
        const sidebar = customTheme.sidebar || '#13131a';
        const text = customTheme.text || '#e4e4e7';
        
        customStyle.textContent = `
          body {
            --accent: ${accent} !important;
            --accent-soft: ${adjustColor(accent, -20)} !important;
            --accent-dark: ${adjustColor(accent, -40)} !important;
            --bg: ${bg} !important;
            --chat-bg: ${adjustColor(bg, 10)} !important;
            --sidebar: ${sidebar} !important;
            --sidebar-dark: ${adjustColor(sidebar, -10)} !important;
            --text: ${text} !important;
            --text-bright: ${adjustColor(text, 20)} !important;
            --text-muted: ${adjustColor(text, -30)} !important;
          }
        `;
      }
    }
    
    function adjustColor(color, percent) {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
    }
    
    // Custom theme builder
    const applyCustomThemeBtn = document.getElementById('applyCustomTheme');
    const resetCustomThemeBtn = document.getElementById('resetCustomTheme');
    
    if (applyCustomThemeBtn) {
      applyCustomThemeBtn.addEventListener('click', () => {
        const customTheme = {
          base: document.getElementById('customThemeBase').value,
          accent: document.getElementById('customAccent').value,
          bg: document.getElementById('customBg').value,
          sidebar: document.getElementById('customSidebar').value,
          text: document.getElementById('customText').value
        };
        
        localStorage.setItem('wyvernCustomTheme', JSON.stringify(customTheme));
        applyCustomTheme();
        showToast('Custom theme applied!', 'success', 'Settings');
      });
    }
    
    if (resetCustomThemeBtn) {
      resetCustomThemeBtn.addEventListener('click', () => {
        const base = document.getElementById('customThemeBase').value;
        localStorage.removeItem('wyvernCustomTheme');
        
        // Reset to base theme defaults
        if (base === 'dark') {
          document.getElementById('customAccent').value = '#8b5cf6';
          document.getElementById('customBg').value = '#0a0a0f';
          document.getElementById('customSidebar').value = '#13131a';
          document.getElementById('customText').value = '#e4e4e7';
        } else if (base === 'light') {
          document.getElementById('customAccent').value = '#8b5cf6';
          document.getElementById('customBg').value = '#f5f5f7';
          document.getElementById('customSidebar').value = '#e8e8ec';
          document.getElementById('customText').value = '#1a1a1f';
        } else {
          document.getElementById('customAccent').value = '#8b5cf6';
          document.getElementById('customBg').value = '#000000';
          document.getElementById('customSidebar').value = '#000000';
          document.getElementById('customText').value = '#ffffff';
        }
        
        showToast('Reset to base theme', 'info', 'Settings');
      });
    }
    
    // Update custom theme preview when base changes
    const customThemeBase = document.getElementById('customThemeBase');
    if (customThemeBase) {
      customThemeBase.addEventListener('change', () => {
        const base = customThemeBase.value;
        if (base === 'dark') {
          document.getElementById('customBg').value = '#0a0a0f';
          document.getElementById('customSidebar').value = '#13131a';
          document.getElementById('customText').value = '#e4e4e7';
        } else if (base === 'light') {
          document.getElementById('customBg').value = '#f5f5f7';
          document.getElementById('customSidebar').value = '#e8e8ec';
          document.getElementById('customText').value = '#1a1a1f';
        } else {
          document.getElementById('customBg').value = '#000000';
          document.getElementById('customSidebar').value = '#000000';
          document.getElementById('customText').value = '#ffffff';
        }
      });
    }

    // Compact mode
    const compactMode = document.getElementById('compactMode');
    if (compactMode) {
      const isCompact = localStorage.getItem('wyvernCompactMode') === 'true';
      compactMode.checked = isCompact;
      if (isCompact) {
        document.body.classList.add('compact-mode');
      }
      
      compactMode.addEventListener('change', () => {
        if (compactMode.checked) {
          document.body.classList.add('compact-mode');
          localStorage.setItem('wyvernCompactMode', 'true');
        } else {
          document.body.classList.remove('compact-mode');
          localStorage.setItem('wyvernCompactMode', 'false');
        }
      });
    }

    // Notification settings
    const desktopNotifications = document.getElementById('desktopNotifications');
    const notificationSounds = document.getElementById('notificationSounds');
    const mentionNotifications = document.getElementById('mentionNotifications');

    if (desktopNotifications) {
      desktopNotifications.checked = localStorage.getItem('wyvernDesktopNotifications') !== 'false';
      desktopNotifications.addEventListener('change', () => {
        localStorage.setItem('wyvernDesktopNotifications', desktopNotifications.checked);
        if (desktopNotifications.checked) {
          Notification.requestPermission();
        }
      });
    }

    if (notificationSounds) {
      notificationSounds.checked = localStorage.getItem('wyvernNotificationSounds') !== 'false';
      notificationSounds.addEventListener('change', () => {
        localStorage.setItem('wyvernNotificationSounds', notificationSounds.checked);
      });
    }

    if (mentionNotifications) {
      mentionNotifications.checked = localStorage.getItem('wyvernMentionNotifications') !== 'false';
      mentionNotifications.addEventListener('change', () => {
        localStorage.setItem('wyvernMentionNotifications', mentionNotifications.checked);
      });
    }

    // Input volume slider
    const inputVolume = document.getElementById('inputVolume');
    const inputVolumeValue = document.getElementById('inputVolumeValue');
    if (inputVolume && inputVolumeValue) {
      inputVolume.addEventListener('input', () => {
        inputVolumeValue.textContent = `${inputVolume.value}%`;
      });
    }

    // Sound effects settings
    const soundEffects = document.getElementById('soundEffects');
    const soundVolume = document.getElementById('soundVolume');
    const soundVolumeValue = document.getElementById('soundVolumeValue');
    const testSound = document.getElementById('testSound');

    if (soundEffects) {
      soundEffects.checked = soundManager.enabled;
      soundEffects.addEventListener('change', () => {
        soundManager.setEnabled(soundEffects.checked);
        if (soundEffects.checked) {
          soundManager.play('notification');
        }
      });
    }

    if (soundVolume && soundVolumeValue) {
      soundVolume.value = soundManager.volume * 100;
      soundVolumeValue.textContent = `${Math.round(soundManager.volume * 100)}%`;
      
      soundVolume.addEventListener('input', () => {
        const volume = soundVolume.value / 100;
        soundManager.setVolume(volume);
        soundVolumeValue.textContent = `${soundVolume.value}%`;
      });
    }

    if (testSound) {
      testSound.addEventListener('click', () => {
        soundManager.play('notification');
      });
    }

    // Close modal when clicking outside
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          closeSettingsModal();
        }
      });
    }

    // Profile Modal Functionality
    let currentProfileUser = null;
    let isOwnProfile = false;

    function openProfileModal(targetUsername) {
      currentProfileUser = targetUsername;
      isOwnProfile = targetUsername === username;
      
      const modal = document.getElementById('profileModal');
      if (modal) {
        modal.classList.add('show');
        loadUserProfile(targetUsername);
      }
    }

    function closeProfileModal() {
      const modal = document.getElementById('profileModal');
      if (modal) {
        modal.classList.remove('show');
      }
    }

    async function loadUserProfile(targetUsername) {
      try {
        const token = sessionStorage.getItem('wyvernToken');
        const response = await fetch(`/api/profile/${targetUsername}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load profile');
        }

        const profile = await response.json();
        displayProfile(profile);
      } catch (error) {
        log(`Profile load error: ${error.message}`);
        showToast('Failed to load profile', 'error');
      }
    }

    function displayProfile(profile) {
      // Set title
      document.getElementById('profileModalTitle').textContent = `${profile.username}'s Profile`;
      
      // Set banner
      const banner = document.getElementById('profileBanner');
      if (profile.banner) {
        banner.style.backgroundImage = `url(${profile.banner})`;
      } else {
        banner.style.background = `linear-gradient(135deg, ${profile.profileColor} 0%, ${adjustColor(profile.profileColor, -40)} 100%)`;
      }
      
      // Set avatar
      const avatarLetter = document.getElementById('profileAvatarLetter');
      const avatarImage = document.getElementById('profileAvatarImage');
      const profileAvatar = document.getElementById('profileAvatar');
      
      if (profile.avatar) {
        avatarImage.src = profile.avatar;
        avatarImage.style.display = 'block';
        avatarLetter.style.display = 'none';
      } else {
        avatarLetter.textContent = profile.username.charAt(0).toUpperCase();
        avatarLetter.style.display = 'block';
        avatarImage.style.display = 'none';
      }
      
      profileAvatar.style.background = profile.profileColor;
      
      // Set username and status
      document.getElementById('profileUsername').textContent = profile.username;
      document.getElementById('profileStatus').textContent = profile.customStatus || 'Online';
      
      // Set bio
      document.getElementById('profileAbout').textContent = profile.bio || 'No bio set';
      document.getElementById('profileAboutEdit').value = profile.bio || '';
      
      // Set custom status
      document.getElementById('profileCustomStatus').textContent = profile.customStatus || 'No status set';
      document.getElementById('profileCustomStatusEdit').value = profile.customStatus || '';
      
      // Set profile color
      const colorPreview = document.getElementById('profileColorPreview');
      colorPreview.style.background = profile.profileColor;
      document.getElementById('profileColorPicker').value = profile.profileColor;
      
      // Set member since
      const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      document.getElementById('profileMemberSince').textContent = memberSince;
      
      // Show/hide edit buttons
      const editButtons = document.querySelectorAll('.profile-edit-btn, .profile-avatar-edit, .profile-banner-edit');
      editButtons.forEach(btn => {
        btn.style.display = isOwnProfile ? 'flex' : 'none';
      });
    }

    async function updateProfile(field, value) {
      try {
        const token = sessionStorage.getItem('wyvernToken');
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ [field]: value })
        });

        if (!response.ok) {
          throw new Error('Failed to update profile');
        }

        // Clear cache for this user
        userProfiles.delete(username);
        
        showToast('Profile updated!', 'success');
        loadUserProfile(username);
        
        // Update user panel if it's own profile
        if (currentProfileUser === username) {
          updateUserPanel();
        }
      } catch (error) {
        log(`Profile update error: ${error.message}`);
        showToast('Failed to update profile', 'error');
      }
    }

    // Close profile modal
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    if (closeProfileBtn) {
      closeProfileBtn.addEventListener('click', closeProfileModal);
    }

    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
          closeProfileModal();
        }
      });
    }

    // Edit About
    const editAboutBtn = document.getElementById('editAboutBtn');
    const saveAboutBtn = document.getElementById('saveAboutBtn');
    const cancelAboutBtn = document.getElementById('cancelAboutBtn');
    
    if (editAboutBtn) {
      editAboutBtn.addEventListener('click', () => {
        document.getElementById('profileAbout').style.display = 'none';
        document.getElementById('profileAboutEdit').style.display = 'block';
        document.getElementById('aboutEditActions').style.display = 'flex';
      });
    }
    
    if (saveAboutBtn) {
      saveAboutBtn.addEventListener('click', () => {
        const bio = document.getElementById('profileAboutEdit').value;
        updateProfile('bio', bio);
        document.getElementById('profileAbout').style.display = 'block';
        document.getElementById('profileAboutEdit').style.display = 'none';
        document.getElementById('aboutEditActions').style.display = 'none';
      });
    }
    
    if (cancelAboutBtn) {
      cancelAboutBtn.addEventListener('click', () => {
        document.getElementById('profileAbout').style.display = 'block';
        document.getElementById('profileAboutEdit').style.display = 'none';
        document.getElementById('aboutEditActions').style.display = 'none';
      });
    }

    // Edit Status
    const editStatusBtn = document.getElementById('editStatusBtn');
    const saveStatusBtn = document.getElementById('saveStatusBtn');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    
    if (editStatusBtn) {
      editStatusBtn.addEventListener('click', () => {
        document.getElementById('profileCustomStatus').style.display = 'none';
        document.getElementById('profileCustomStatusEdit').style.display = 'block';
        document.getElementById('statusEditActions').style.display = 'flex';
      });
    }
    
    if (saveStatusBtn) {
      saveStatusBtn.addEventListener('click', () => {
        const customStatus = document.getElementById('profileCustomStatusEdit').value;
        updateProfile('customStatus', customStatus);
        document.getElementById('profileCustomStatus').style.display = 'block';
        document.getElementById('profileCustomStatusEdit').style.display = 'none';
        document.getElementById('statusEditActions').style.display = 'none';
      });
    }
    
    if (cancelStatusBtn) {
      cancelStatusBtn.addEventListener('click', () => {
        document.getElementById('profileCustomStatus').style.display = 'block';
        document.getElementById('profileCustomStatusEdit').style.display = 'none';
        document.getElementById('statusEditActions').style.display = 'none';
      });
    }

    // Edit Color
    const editColorBtn = document.getElementById('editColorBtn');
    const saveColorBtn = document.getElementById('saveColorBtn');
    const cancelColorBtn = document.getElementById('cancelColorBtn');
    
    if (editColorBtn) {
      editColorBtn.addEventListener('click', () => {
        document.getElementById('profileColorPreview').style.display = 'none';
        document.getElementById('profileColorEdit').style.display = 'block';
      });
    }
    
    if (saveColorBtn) {
      saveColorBtn.addEventListener('click', () => {
        const profileColor = document.getElementById('profileColorPicker').value;
        updateProfile('profileColor', profileColor);
        document.getElementById('profileColorPreview').style.display = 'block';
        document.getElementById('profileColorEdit').style.display = 'none';
      });
    }
    
    if (cancelColorBtn) {
      cancelColorBtn.addEventListener('click', () => {
        document.getElementById('profileColorPreview').style.display = 'block';
        document.getElementById('profileColorEdit').style.display = 'none';
      });
    }

    // Avatar upload
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    
    if (editAvatarBtn && avatarInput) {
      editAvatarBtn.addEventListener('click', () => {
        avatarInput.click();
      });
      
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('files', file);
        
        try {
          const token = sessionStorage.getItem('wyvernToken');
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const data = await response.json();
          const avatarUrl = data.files[0].url;
          
          await updateProfile('avatar', avatarUrl);
        } catch (error) {
          log(`Avatar upload error: ${error.message}`);
          showToast('Failed to upload avatar', 'error');
        }
        
        avatarInput.value = '';
      });
    }

    // Banner upload
    const editBannerBtn = document.getElementById('editBannerBtn');
    const bannerInput = document.getElementById('bannerInput');
    
    if (editBannerBtn && bannerInput) {
      editBannerBtn.addEventListener('click', () => {
        bannerInput.click();
      });
      
      bannerInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('files', file);
        
        try {
          const token = sessionStorage.getItem('wyvernToken');
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const data = await response.json();
          const bannerUrl = data.files[0].url;
          
          await updateProfile('banner', bannerUrl);
        } catch (error) {
          log(`Banner upload error: ${error.message}`);
          showToast('Failed to upload banner', 'error');
        }
        
        bannerInput.value = '';
      });
    }

    // Make openProfileModal globally accessible
    window.openProfileModal = openProfileModal;

    // Voice connection bar controls (non-voice buttons)
    const voiceScreenShare = document.getElementById('voiceScreenShare');
    const voiceCamera = document.getElementById('voiceCamera');

    if (voiceScreenShare) {
      voiceScreenShare.addEventListener('click', () => {
        toggleScreenShare();
      });
    }

    // Camera button is handled in setupVoiceButtonHandlers (after voice functions are defined)

    // User panel info click - show profile or settings
    const userPanelInfo = document.querySelector('.user-panel-info');
    if (userPanelInfo) {
      userPanelInfo.addEventListener("click", () => {
        if (window.openProfileModal) {
          window.openProfileModal(username);
        }
      });
    }
  }

  // Track if current user is admin
  let isCurrentUserAdmin = false;

  function highlightMentions(text, mentions) {
    if (!mentions || mentions.length === 0) return text;
    
    // Replace @mentions with highlighted spans
    let highlightedText = text;
    mentions.forEach(mention => {
      const mentionRegex = new RegExp(`@${mention}\\b`, 'gi');
      const isCurrentUser = mention.toLowerCase() === username.toLowerCase();
      const isEveryone = mention.toLowerCase() === 'everyone';
      const mentionClass = (isCurrentUser || isEveryone) ? 'mention mention-me' : 'mention';
      
      highlightedText = highlightedText.replace(mentionRegex, `<span class="${mentionClass}">@${mention}</span>`);
    });
    
    return highlightedText;
  }

  function playNotificationSound() {
    // Check if notification sounds are enabled
    const soundsEnabled = localStorage.getItem('wyvernNotificationSounds') !== 'false';
    if (!soundsEnabled) return;
    
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  async function displayMessage(data, isHistoryLoad = false) {
    const messagesContainer = document.getElementById("chat-messages");
    const messageEl = document.createElement("div");
    messageEl.className = "message-container";
    messageEl.dataset.username = data.username;
    messageEl.dataset.timestamp = data.timestamp;
    messageEl.dataset.messageId = data._id || data.id || '';

    if (data.username === username) {
      messageEl.classList.add("mine");
    }

    const timeStr = data.timestamp
      ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    // Check if we should group this message with the previous one
    const lastMessage = messagesContainer.lastElementChild;
    const shouldGroup = lastMessage && 
                       lastMessage.dataset.username === data.username &&
                       data.timestamp && lastMessage.dataset.timestamp &&
                       (new Date(data.timestamp) - new Date(lastMessage.dataset.timestamp)) < 300000; // 5 minutes

    if (shouldGroup) {
      messageEl.classList.add("grouped");
    }

    // Get user profile for avatar and color
    const profile = await getUserProfile(data.username);
    const avatarHTML = getAvatarHTML(data.username, profile);
    const profileColor = getProfileColor(profile);
    
    // Check if user is admin
    const isAdmin = data.isAdmin || false;
    const adminBadge = isAdmin ? '<span class="message-admin-badge">Admin</span>' : '';

    // Escape HTML in message but preserve line breaks
    let escapedMessage = escapeHtml(data.message);
    
    // Highlight mentions
    escapedMessage = highlightMentions(escapedMessage, data.mentions);
    
    // Check if current user is mentioned
    const isMentioned = data.mentions && (
      data.mentions.includes(username) || 
      data.mentions.includes('everyone')
    );
    
    if (isMentioned && data.username !== username) {
      messageEl.classList.add('mentioned');
      
      // Only show notification for new messages, not history
      if (!isHistoryLoad) {
        // Check if mention notifications are enabled
        const mentionNotificationsEnabled = localStorage.getItem('wyvernMentionNotifications') !== 'false';
        if (mentionNotificationsEnabled) {
          // Show notification for mention
          showToast(`${data.username} mentioned you`, 'info', 'Mention');
          // Play notification sound
          playNotificationSound();
        }
      }
    }

    // Admin delete button (show if current user is admin OR it's their own message)
    const canDelete = isCurrentUserAdmin || data.username === username;
    const deleteButton = canDelete ? `
      <button class="message-action-btn message-delete-btn" title="Delete Message" data-message-id="${data._id || data.id || ''}">
        <i class="fas fa-trash"></i>
      </button>
    ` : '';

    // Build attachments HTML
    let attachmentsHTML = '';
    if (data.attachments && data.attachments.length > 0) {
      attachmentsHTML = '<div class="message-attachments">';
      data.attachments.forEach(attachment => {
        const isImage = attachment.mimetype.startsWith('image/');
        const isVideo = attachment.mimetype.startsWith('video/');
        
        if (isImage) {
          attachmentsHTML += `
            <div class="message-attachment">
              <img src="${attachment.url}" alt="${attachment.originalName}" onclick="openLightbox('${attachment.url}')" />
            </div>
          `;
        } else if (isVideo) {
          attachmentsHTML += `
            <div class="message-attachment">
              <video controls>
                <source src="${attachment.url}" type="${attachment.mimetype}">
              </video>
            </div>
          `;
        } else {
          const fileSize = formatFileSize(attachment.size);
          attachmentsHTML += `
            <a href="${attachment.url}" download="${attachment.originalName}" class="message-file">
              <div class="message-file-icon">
                <i class="fas fa-file"></i>
              </div>
              <div class="message-file-info">
                <div class="message-file-name">${attachment.originalName}</div>
                <div class="message-file-size">${fileSize}</div>
              </div>
              <div class="message-file-download">
                <i class="fas fa-download"></i>
              </div>
            </a>
          `;
        }
      });
      attachmentsHTML += '</div>';
    }

    messageEl.innerHTML = `
      <div class="message-avatar" style="background: ${profileColor};">${avatarHTML}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-username">${escapeHtml(data.username)}</span>
          ${adminBadge}
          <span class="message-timestamp">${timeStr}</span>
        </div>
        ${escapedMessage ? `<div class="message-text">${escapedMessage}</div>` : ''}
        ${attachmentsHTML}
      </div>
      <div class="message-actions">
        <button class="message-action-btn" title="Add Reaction">
          <i class="far fa-smile"></i>
        </button>
        <button class="message-action-btn" title="Reply">
          <i class="fas fa-reply"></i>
        </button>
        ${deleteButton}
        <button class="message-action-btn" title="More">
          <i class="fas fa-ellipsis-h"></i>
        </button>
      </div>
    `;

    // Add delete button handler
    if (canDelete) {
      const deleteBtn = messageEl.querySelector('.message-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          deleteMessage(data._id || data.id, messageEl);
        });
      }
    }

    // Make username clickable to view profile
    const usernameEl = messageEl.querySelector('.message-username');
    if (usernameEl) {
      usernameEl.style.cursor = 'pointer';
      usernameEl.addEventListener('click', () => {
        openProfileModal(data.username);
      });
    }

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Admin: Delete message
  function deleteMessage(messageId, messageEl) {
    if (!isCurrentUserAdmin || !messageId) return;

    if (confirm('Are you sure you want to delete this message?')) {
      window.wyvernSocket.emit('deleteMessage', { messageId });
      
      // Optimistically remove from UI
      messageEl.classList.add('removing');
      setTimeout(() => messageEl.remove(), 300);
    }
  }

  // Admin: Kick user from voice
  function kickFromVoice(targetUsername) {
    if (!isCurrentUserAdmin) return;

    if (confirm(`Kick ${targetUsername} from voice channel?`)) {
      window.wyvernSocket.emit('kickFromVoice', { targetUsername });
      showToast(`Kicked ${targetUsername} from voice`, 'success', 'Admin Action');
    }
  }

  // Admin: Disconnect user
  function disconnectUser(targetUsername) {
    if (!isCurrentUserAdmin) return;

    if (confirm(`Disconnect ${targetUsername} from the server?`)) {
      window.wyvernSocket.emit('disconnectUser', { targetUsername });
      showToast(`Disconnected ${targetUsername}`, 'success', 'Admin Action');
    }
  }

  // Update user panel with profile
  async function updateUserPanel() {
    const profile = await getUserProfile(username);
    const userPanelAvatar = document.getElementById('userPanelAvatar');
    
    if (userPanelAvatar && profile) {
      const avatarHTML = getAvatarHTML(username, profile);
      const profileColor = getProfileColor(profile);
      
      userPanelAvatar.style.background = profileColor;
      userPanelAvatar.innerHTML = `
        ${avatarHTML}
        <div class="user-panel-status" id="userPanelStatus"></div>
      `;
    }
  }

  // Online users list functionality
  async function updateOnlineUsersList(users) {
    const usersList = document.getElementById('usersList');
    const usersCount = document.getElementById('usersCount');
    
    if (!usersList || !usersCount) return;

    usersCount.textContent = users.length;
    usersList.innerHTML = '';

    for (const user of users) {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      if (user.username === username) {
        userItem.classList.add('self');
      }

      const statusText = user.voiceChannel ? `<i class="fas fa-volume-up"></i> ${user.voiceChannel}` : 'Online';
      const statusClass = user.voiceChannel ? 'in-voice' : '';

      // Get user profile for avatar
      const profile = await getUserProfile(user.username);
      const avatarHTML = getAvatarHTML(user.username, profile);
      const profileColor = getProfileColor(profile);

      userItem.innerHTML = `
        <div class="user-item-avatar" style="background: ${profileColor};">
          ${avatarHTML}
          <div class="user-item-status ${statusClass}"></div>
        </div>
        <div class="user-item-info">
          <div class="user-item-name">
            ${user.username}
            ${user.isAdmin ? '<span class="user-item-badge">ADMIN</span>' : ''}
          </div>
          <div class="user-item-status-text">${statusText}</div>
        </div>
      `;

      // Click to view profile
      userItem.addEventListener('click', () => {
        openProfileModal(user.username);
      });

      // Add admin context menu for other users
      if (isCurrentUserAdmin && user.username !== username) {
        userItem.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showAdminContextMenu(e, user);
        });
      }

      usersList.appendChild(userItem);
    }
  }

  // Show admin context menu
  function showAdminContextMenu(event, user) {
    // Remove existing menu
    const existingMenu = document.querySelector('.admin-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'admin-context-menu';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    menu.innerHTML = `
      <div class="context-menu-header">Admin Actions: ${user.username}</div>
      ${user.voiceChannel ? `
        <div class="context-menu-item" data-action="kick-voice">
          <i class="fas fa-volume-mute"></i>
          <span>Kick from Voice</span>
        </div>
      ` : ''}
      <div class="context-menu-item danger" data-action="disconnect">
        <i class="fas fa-sign-out-alt"></i>
        <span>Disconnect User</span>
      </div>
    `;

    document.body.appendChild(menu);

    // Handle menu actions
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        if (action === 'kick-voice') {
          kickFromVoice(user.username);
        } else if (action === 'disconnect') {
          disconnectUser(user.username);
        }
        menu.remove();
      });
    });

    // Close menu on click outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  }

  // Toggle users panel
  const toggleUsersBtn = document.getElementById('toggleUsersBtn');
  if (toggleUsersBtn) {
    // Check localStorage for saved state
    const usersPanelHidden = localStorage.getItem('usersPanelHidden') === 'true';
    if (usersPanelHidden) {
      document.body.classList.add('users-panel-hidden');
    } else {
      toggleUsersBtn.classList.add('active');
    }

    toggleUsersBtn.addEventListener('click', () => {
      document.body.classList.toggle('users-panel-hidden');
      toggleUsersBtn.classList.toggle('active');
      
      // Save state to localStorage
      const isHidden = document.body.classList.contains('users-panel-hidden');
      localStorage.setItem('usersPanelHidden', isHidden);
    });
  }

  function updateChannelList(channels, type) {
    const containerId = type === 'text' ? 'textChannelsList' : 'voiceChannelsList';
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = '';

    channels.forEach(channel => {
      const channelEl = document.createElement('div');
      channelEl.className = 'channel';

      if (type === 'text') {
        const isCurrentChannel = currentTextChannel === channel.name;
        channelEl.innerHTML = `
          <div class="channel-name ${isCurrentChannel ? 'active' : ''}"># ${channel.name}</div>
        `;

        channelEl.addEventListener('click', () => {
          log(`Switching to text channel: ${channel.name}`);
          switchToTextChannel(channel.name);
        });
      } else if (type === 'voice') {
        const users = voiceChannelUsers.get(channel.name) || [];
        const isConnected = currentVoiceChannel === channel.name;

        channelEl.classList.add('voice-channel-item');
        if (isConnected) {
          channelEl.classList.add('connected');
        }

        channelEl.innerHTML = `
          <div class="voice-channel-header">
            <div class="voice-channel-info">
              <i class="fas fa-volume-up voice-channel-icon"></i>
              <span class="voice-channel-name">${channel.name}</span>
            </div>
            <span class="voice-user-count">${users.length || ''}</span>
          </div>
          <div class="voice-channel-users" style="display: ${users.length > 0 ? 'block' : 'none'}">
            ${users.map(user => {
              const state = userVoiceStates.get(user) || { muted: false, deafened: false };
              let statusIcon = 'fa-microphone';
              let statusClass = '';
              
              if (state.deafened) {
                statusIcon = 'fa-headphones-slash';
                statusClass = 'deafened';
              } else if (state.muted) {
                statusIcon = 'fa-microphone-slash';
                statusClass = 'muted';
              }
              
              return `
                <div class="voice-user ${user === username ? 'current-user' : ''}" data-username="${user}">
                  <span class="voice-user-avatar">${user.charAt(0).toUpperCase()}</span>
                  <span class="voice-user-name">${user}</span>
                  <i class="fas ${statusIcon} voice-user-status ${statusClass}"></i>
                  ${user === username && isConnected ? '<button class="voice-user-disconnect" title="Disconnect"><i class="fas fa-phone-slash"></i></button>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Add disconnect button handler
        if (isConnected) {
          const disconnectBtn = channelEl.querySelector('.voice-user-disconnect');
          if (disconnectBtn) {
            disconnectBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              leaveVoiceChannel();
            });
          }
        }

        const headerEl = channelEl.querySelector('.voice-channel-header');
        headerEl.addEventListener('click', () => {
          if (isConnected) {
            log(`Switching to voice channel UI: ${channel.name}`);
            showVoiceChannelUI(channel.name);
          } else {
            log(`Joining voice channel: ${channel.name}`);
            joinVoiceChannel(channel.name);
          }
        });
      }

      container.appendChild(channelEl);
    });
  }

  // Global error handler
  window.addEventListener('error', (e) => {
    log(`JavaScript error: ${e.message}`);
    console.error('Error details:', e);
  });

  // Voice chat functionality
  let currentTextChannel = 'general';
  
  // Direct Message functionality
  let currentDMRecipient = null;
  let isDMMode = false;
  const dmConversations = new Map();
  let currentView = 'channels'; // 'channels' or 'dms'

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  function createPeerConnection(socketId, username, isInitiator) {
    log(`ðŸ”— Creating peer connection for ${username} (${socketId}) - initiator: ${isInitiator}`);

    if (peerConnections.has(socketId)) {
      const existingPc = peerConnections.get(socketId);
      log(`âš ï¸ Peer connection already exists for ${username} in state: ${existingPc.signalingState}`);
      
      // Only close if it's in a failed state or we're explicitly told to recreate
      if (existingPc.connectionState === 'failed' || existingPc.connectionState === 'closed') {
        log(`Closing failed connection`);
        existingPc.close();
      } else {
        log(`Reusing existing connection`);
        return existingPc;
      }
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(socketId, pc);

    // Add local audio stream to peer connection
    if (localStream) {
      log(`ðŸŽ¤ Adding ${localStream.getTracks().length} audio tracks to peer connection for ${username}`);
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        log(`âœ… Added ${track.kind} track to ${username}`);
      });
    } else {
      log(`âŒ No local stream to add to peer connection for ${username}`);
    }

    // Add local video stream if camera is on
    if (localVideoStream && isCameraOn) {
      log(`ðŸ“¹ Adding video track to peer connection for ${username}`);
      localVideoStream.getTracks().forEach(track => {
        pc.addTrack(track, localVideoStream);
        log(`âœ… Added video track to ${username}`);
      });
    }

    // Add local screen stream if screen sharing
    if (localScreenStream && isScreenSharing) {
      log(`ðŸ–¥ï¸ Adding screen track to peer connection for ${username}`);
      localScreenStream.getTracks().forEach(track => {
        pc.addTrack(track, localScreenStream);
        log(`âœ… Added screen track to ${username}`);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      log(`ðŸ“º Received ${event.track.kind} track from ${username} (label: ${event.track.label}, stream: ${event.streams[0]?.id})`);
      const remoteStream = event.streams[0];
      
      if (event.track.kind === 'audio') {
        playRemoteAudio(remoteStream, username);
      } else if (event.track.kind === 'video') {
        // Check if it's a screen share track
        // Screen tracks typically have 'screen' in the label or come from getDisplayMedia
        const trackLabel = event.track.label.toLowerCase();
        const isScreenTrack = trackLabel.includes('screen') || 
                             trackLabel.includes('monitor') ||
                             trackLabel.includes('window') ||
                             trackLabel.includes('tab') ||
                             trackLabel.includes('display');
        
        // Also check if this user already has a video stream (camera)
        // If they do, this must be their screen share
        const hasExistingVideo = remoteVideoStreams.has(username);
        const userState = userVoiceStates.get(username) || {};
        
        if (isScreenTrack || (hasExistingVideo && userState.screenSharing)) {
          log(`ðŸ–¥ï¸ Detected screen share track from ${username} - storing for PIP only`);
          playRemoteScreen(remoteStream, username);
        } else {
          log(`ðŸ“¹ Detected camera track from ${username} - displaying in UI`);
          playRemoteVideo(remoteStream, username);
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && window.wyvernSocket) {
        window.wyvernSocket.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          to: socketId
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      log(`WebRTC connection state with ${username}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        peerConnections.delete(socketId);
        removeRemoteAudio(username);
      }
    };

    // If we're the initiator, create and send offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (window.wyvernSocket) {
            window.wyvernSocket.emit('webrtc-offer', {
              offer: pc.localDescription,
              to: socketId
            });
          }
        })
        .catch(err => log(`Error creating offer: ${err.message}`));
    }

    return pc;
  }

  function playRemoteAudio(stream, username) {
    // Remove existing audio element for this user
    removeRemoteAudio(username);

    // Create new audio element
    const audio = document.createElement('audio');
    audio.id = `audio-${username}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.volume = 1.0;

    // Hide the audio element
    audio.style.display = 'none';
    document.body.appendChild(audio);

    log(`Playing audio from ${username}`);
  }

  function removeRemoteAudio(username) {
    const existingAudio = document.getElementById(`audio-${username}`);
    if (existingAudio) {
      existingAudio.remove();
      log(`Removed audio element for ${username}`);
    }
  }

  function playRemoteVideo(stream, username) {
    log(`ðŸ“¹ Playing video from ${username}`);
    
    // Store the stream for restoration after re-renders
    remoteVideoStreams.set(username, stream);
    
    // Find all participant elements for this user
    const participants = document.querySelectorAll(`.voice-participant[data-username="${username}"]`);
    
    participants.forEach(participant => {
      let videoEl = participant.querySelector('video.remote-video');
      
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.className = 'remote-video';
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        
        // Insert video before other content
        participant.insertBefore(videoEl, participant.firstChild);
      }
      
      videoEl.srcObject = stream;
      participant.classList.add('has-video');
    });

    // Update voice channel list with expanded video
    const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${username}"]`);
    voiceUsers.forEach(userEl => {
      // Create video container if it doesn't exist
      let videoContainer = userEl.querySelector('.voice-user-video-container');
      if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.className = 'voice-user-video-container';
        
        const videoEl = document.createElement('video');
        videoEl.className = 'voice-user-video';
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        
        const nameOverlay = document.createElement('div');
        nameOverlay.className = 'voice-user-video-name';
        nameOverlay.textContent = username;
        
        videoContainer.appendChild(videoEl);
        videoContainer.appendChild(nameOverlay);
        
        // Move status icon into video container
        const statusIcon = userEl.querySelector('.voice-user-status');
        if (statusIcon) {
          videoContainer.appendChild(statusIcon);
        }
        
        // Replace entire user element content with video container
        userEl.innerHTML = '';
        userEl.appendChild(videoContainer);
      }
      
      const videoEl = videoContainer.querySelector('video');
      if (videoEl) {
        videoEl.srcObject = stream;
      }
      
      userEl.classList.add('has-video-expanded');
    });
  }

  function removeRemoteVideo(username) {
    // Clear stored stream
    remoteVideoStreams.delete(username);
    
    // Remove from participants
    const participants = document.querySelectorAll(`.voice-participant[data-username="${username}"]`);
    participants.forEach(participant => {
      const videoEl = participant.querySelector('video.remote-video');
      if (videoEl) {
        videoEl.srcObject = null;
        videoEl.remove();
      }
      participant.classList.remove('has-video');
    });

    // Remove from voice channel list and restore original structure
    const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${username}"]`);
    voiceUsers.forEach(userEl => {
      const videoContainer = userEl.querySelector('.voice-user-video-container');
      if (videoContainer) {
        const videoEl = videoContainer.querySelector('video');
        if (videoEl) {
          videoEl.srcObject = null;
        }
        videoContainer.remove();
      }
      userEl.classList.remove('has-video-expanded');
    });
    
    // Force re-render to restore original structure
    forceUpdateVoiceChannelDisplay();

    log(`Removed video for ${username}`);
  }

  function playRemoteScreen(stream, username) {
    log(`ðŸ–¥ï¸ Playing screen share from ${username}`);
    
    // Store the screen stream
    remoteScreenStreams.set(username, stream);
    
    // Ensure state is set (in case socket event hasn't arrived yet)
    const state = userVoiceStates.get(username) || { muted: false, deafened: false, camera: false, screenSharing: false };
    state.screenSharing = true;
    userVoiceStates.set(username, state);
    
    // Update participant status to show screen sharing icon
    updateParticipantStatus(username);
  }

  function removeRemoteScreen(username) {
    remoteScreenStreams.delete(username);
    updateParticipantStatus(username);
    log(`Removed screen share for ${username}`);
  }

  function openScreenSharePIP(username) {
    const stream = remoteScreenStreams.get(username);
    if (!stream) {
      showNotification(`${username} is not sharing their screen`, 'error');
      return;
    }

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
      // Check if PIP is supported
      if (document.pictureInPictureEnabled && pipVideo.requestPictureInPicture) {
        pipVideo.requestPictureInPicture()
          .then(() => {
            log(`Opened PIP for ${username}'s screen share`);
            showNotification(`Viewing ${username}'s screen`, 'success');
          })
          .catch(err => {
            console.error('PIP error:', err);
            // Fallback to modal
            openScreenShareModal(username, stream);
          });
      } else {
        // PIP not supported, use modal fallback
        log('PIP not supported, using modal fallback');
        openScreenShareModal(username, stream);
      }
    };
  }

  function openScreenShareModal(username, stream) {
    // Create a modal to display the screen share
    let modal = document.getElementById('screen-share-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'screen-share-modal';
      modal.className = 'screen-share-modal';
      modal.innerHTML = `
        <div class="screen-share-modal-content">
          <div class="screen-share-modal-header">
            <h3>${username}'s Screen</h3>
            <button class="screen-share-modal-close" onclick="this.closest('.screen-share-modal').style.display='none'">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <video id="screen-share-video" autoplay playsinline controls></video>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const video = modal.querySelector('#screen-share-video');
    const header = modal.querySelector('h3');
    
    if (video) {
      video.srcObject = stream;
    }
    if (header) {
      header.textContent = `${username}'s Screen`;
    }

    modal.style.display = 'flex';
    showNotification(`Viewing ${username}'s screen`, 'success');
  }

  function switchToTextChannel(channelName) {
    // Switch to text channel without leaving voice
    if (window.wyvernSocket) {
      window.wyvernSocket.emit('joinChannel', channelName);
      currentTextChannel = channelName;
    }

    // Show chat area (hide voice UI if it's showing)
    const chatArea = document.querySelector('.chat-area');
    const voiceUI = document.getElementById('voiceUI');
    const currentChannelEl = document.getElementById('currentChannel');

    if (chatArea) {
      chatArea.style.display = 'flex';
    }

    if (voiceUI) {
      voiceUI.style.display = 'none';
    }

    if (currentChannelEl) {
      currentChannelEl.textContent = channelName;
    }

    // Update input placeholder
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.placeholder = `Message #${channelName}`;
    }

    // Update channel list to show active text channel
    updateChannelActiveStates();

    log(`Switched to text channel: ${channelName} (voice: ${currentVoiceChannel || 'none'})`);
  }

  function joinVoiceChannel(channelName) {
    if (currentVoiceChannel === channelName) {
      log(`Already in voice channel: ${channelName}`);
      return;
    }

    log(`Requesting microphone access for voice channel: ${channelName}`);

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        localStream = stream;
        currentVoiceChannel = channelName;

        if (window.wyvernSocket) {
          window.wyvernSocket.emit('joinVoiceChannel', channelName);

          // Wait a bit for the server to process, then establish connections
          setTimeout(() => {
            log('Establishing WebRTC connections with existing users...');
            // The server will send userJoinedVoice events for existing users
            // which will trigger createPeerConnection calls
          }, 500);
        }

        showVoiceIndicators(channelName);
        log(`âœ… Joined voice channel: ${channelName}`);
      })
      .catch(err => {
        log(`âŒ Microphone access denied: ${err.message}`);
        showNotification('Microphone access required for voice chat', 'error');
      });
  }

  function leaveVoiceChannel() {
    if (!currentVoiceChannel) return;

    log(`Leaving voice channel: ${currentVoiceChannel}`);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    // Stop and clean up camera
    if (localVideoStream) {
      localVideoStream.getTracks().forEach(track => track.stop());
      localVideoStream = null;
    }
    isCameraOn = false;
    hideLocalVideo();

    // Stop and clean up screen sharing
    if (localScreenStream) {
      localScreenStream.getTracks().forEach(track => track.stop());
      localScreenStream = null;
    }
    isScreenSharing = false;

    // Clean up all peer connections and remote audio/video/screen
    peerConnections.forEach((pc, socketId) => {
      pc.close();
    });
    peerConnections.clear();

    // Remove all remote audio elements
    document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
      audio.remove();
    });

    // Remove all remote video elements
    document.querySelectorAll('video.remote-video, video.remote-video-small').forEach(video => {
      video.srcObject = null;
      video.remove();
    });

    if (window.wyvernSocket) {
      window.wyvernSocket.emit('leaveVoiceChannel');
    }

    // Clear own voice state
    userVoiceStates.delete(username);

    hideVoiceIndicators();
    currentVoiceChannel = null;
    log(`âœ… Left voice channel`);
  }

  function toggleMute() {
    if (!localStream) return;

    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });

    const voiceUIMuteBtn = document.getElementById('voiceUIMuteBtn');
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    const userPanelMute = document.getElementById('userPanelMute');

    // Update button icons
    [voiceUIMuteBtn, modalMuteBtn].forEach(btn => {
      if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
          if (isMuted) {
            icon.className = 'fas fa-microphone-slash';
            btn.classList.replace('unmute', 'mute');
          } else {
            icon.className = 'fas fa-microphone';
            btn.classList.replace('mute', 'unmute');
          }
        }
      }
    });

    // Update user panel button
    if (userPanelMute) {
      const icon = userPanelMute.querySelector('i');
      if (icon) {
        icon.className = isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
      }
      if (isMuted) {
        userPanelMute.classList.add('muted');
      } else {
        userPanelMute.classList.remove('muted');
      }
    }

    // Update local state
    const state = userVoiceStates.get(username) || { muted: false, deafened: false };
    state.muted = isMuted;
    userVoiceStates.set(username, state);
    
    // Update own participant status in UI
    updateParticipantStatus(username);

    if (window.wyvernSocket) {
      window.wyvernSocket.emit('userMuted', { muted: isMuted });
    }

    log(`${isMuted ? 'Muted' : 'Unmuted'} microphone`);
  }

  async function toggleCamera() {
    if (!currentVoiceChannel) {
      showNotification('Join a voice channel first', 'error');
      return;
    }

    try {
      if (!isCameraOn) {
        // Turn camera ON
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        localVideoStream = videoStream;
        isCameraOn = true;

        // Add video track to all existing peer connections
        const videoTrack = videoStream.getVideoTracks()[0];
        const renegotiationPromises = [];
        
        peerConnections.forEach((pc, socketId) => {
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
                
                if (window.wyvernSocket) {
                  window.wyvernSocket.emit('webrtc-offer', {
                    offer: offer,
                    to: socketId
                  });
                  log(`ðŸ“¤ Sent renegotiation offer to ${socketId} for video track`);
                }
              } catch (error) {
                console.error('Renegotiation error:', error);
              }
            };
            
            renegotiationPromises.push(renegotiate());
          }
        });

        // Wait for all renegotiations to complete
        await Promise.all(renegotiationPromises);

        // Show local video
        showLocalVideo();
        showNotification('Camera enabled', 'success');
      } else {
        // Turn camera OFF
        if (localVideoStream) {
          localVideoStream.getTracks().forEach(track => track.stop());
          localVideoStream = null;
        }

        isCameraOn = false;

        // Remove video track from all peer connections and renegotiate
        const renegotiationPromises = [];
        
        peerConnections.forEach((pc, socketId) => {
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
              
              if (window.wyvernSocket) {
                window.wyvernSocket.emit('webrtc-offer', {
                  offer: offer,
                  to: socketId
                });
                log(`ðŸ“¤ Sent renegotiation offer to ${socketId} to remove video track`);
              }
            } catch (error) {
              console.error('Renegotiation error:', error);
            }
          };
          
          renegotiationPromises.push(renegotiate());
        });

        // Wait for all renegotiations to complete
        await Promise.all(renegotiationPromises);

        // Hide local video
        hideLocalVideo();
        showNotification('Camera disabled', 'success');
      }

      // Update button state
      const voiceCamera = document.getElementById('voiceCamera');
      if (voiceCamera) {
        if (isCameraOn) {
          voiceCamera.classList.add('active');
        } else {
          voiceCamera.classList.remove('active');
        }
      }

      // Update local state
      const state = userVoiceStates.get(username) || { muted: false, deafened: false, camera: false };
      state.camera = isCameraOn;
      userVoiceStates.set(username, state);

      // Broadcast camera state
      if (window.wyvernSocket) {
        window.wyvernSocket.emit('userCamera', { camera: isCameraOn });
      }

      log(`Camera ${isCameraOn ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Camera error:', error);
      showNotification('Failed to access camera: ' + error.message, 'error');
    }
  }

  async function toggleScreenShare() {
    if (!currentVoiceChannel) {
      showNotification('Join a voice channel first', 'error');
      return;
    }

    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always'
          },
          audio: false
        });

        localScreenStream = screenStream;
        isScreenSharing = true;

        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        // Add screen track to all existing peer connections
        const screenTrack = screenStream.getVideoTracks()[0];
        log(`ðŸ–¥ï¸ Screen track label: "${screenTrack.label}", stream ID: ${screenStream.id}`);
        
        // Store our screen stream ID so we can identify it later
        if (!window.localScreenStreamId) {
          window.localScreenStreamId = screenStream.id;
        }
        
        const renegotiationPromises = [];
        
        peerConnections.forEach((pc, socketId) => {
          pc.addTrack(screenTrack, screenStream);
          log(`Added screen track to peer ${socketId}`);
          
          // Create new offer to renegotiate
          const renegotiate = async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              
              if (window.wyvernSocket) {
                window.wyvernSocket.emit('webrtc-offer', {
                  offer: offer,
                  to: socketId
                });
                log(`ðŸ“¤ Sent renegotiation offer to ${socketId} for screen track`);
              }
            } catch (error) {
              console.error('Renegotiation error:', error);
            }
          };
          
          renegotiationPromises.push(renegotiate());
        });

        await Promise.all(renegotiationPromises);
        showNotification('Screen sharing started', 'success');
      } else {
        // Stop screen sharing
        if (localScreenStream) {
          localScreenStream.getTracks().forEach(track => track.stop());
          localScreenStream = null;
        }

        isScreenSharing = false;

        // Remove screen track from all peer connections and renegotiate
        const renegotiationPromises = [];
        
        peerConnections.forEach((pc, socketId) => {
          const senders = pc.getSenders();
          senders.forEach(sender => {
            if (sender.track && sender.track.kind === 'video' && sender.track.label.includes('screen')) {
              pc.removeTrack(sender);
            }
          });
          
          // Create new offer to renegotiate without screen
          const renegotiate = async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              
              if (window.wyvernSocket) {
                window.wyvernSocket.emit('webrtc-offer', {
                  offer: offer,
                  to: socketId
                });
                log(`ðŸ“¤ Sent renegotiation offer to ${socketId} to remove screen track`);
              }
            } catch (error) {
              console.error('Renegotiation error:', error);
            }
          };
          
          renegotiationPromises.push(renegotiate());
        });

        await Promise.all(renegotiationPromises);
        showNotification('Screen sharing stopped', 'success');
      }

      // Update button state
      const voiceScreenShare = document.getElementById('voiceScreenShare');
      if (voiceScreenShare) {
        if (isScreenSharing) {
          voiceScreenShare.classList.add('active');
        } else {
          voiceScreenShare.classList.remove('active');
        }
      }

      // Update local state
      const state = userVoiceStates.get(username) || { muted: false, deafened: false, camera: false, screenSharing: false };
      state.screenSharing = isScreenSharing;
      userVoiceStates.set(username, state);

      // Broadcast screen sharing state
      if (window.wyvernSocket) {
        window.wyvernSocket.emit('userScreenSharing', { screenSharing: isScreenSharing });
      }

      // Update participant status to show screen sharing icon
      updateParticipantStatus(username);

      log(`Screen sharing ${isScreenSharing ? 'started' : 'stopped'}`);
    } catch (error) {
      console.error('Screen sharing error:', error);
      if (error.name === 'NotAllowedError') {
        showNotification('Screen sharing permission denied', 'error');
      } else {
        showNotification('Failed to share screen: ' + error.message, 'error');
      }
    }
  }

  function showLocalVideo() {
    // Show in user panel avatar
    const userPanelAvatar = document.getElementById('userPanelAvatar');
    if (userPanelAvatar) {
      let videoEl = userPanelAvatar.querySelector('video.local-video');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.className = 'local-video';
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        userPanelAvatar.appendChild(videoEl);
      }
      videoEl.srcObject = localVideoStream;
      userPanelAvatar.classList.add('has-video');
    }

    // Show in voice channel list for current user
    const currentUserVoiceElements = document.querySelectorAll(`.voice-user.current-user[data-username="${username}"]`);
    currentUserVoiceElements.forEach(userEl => {
      // Create video container if it doesn't exist
      let videoContainer = userEl.querySelector('.voice-user-video-container');
      if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.className = 'voice-user-video-container';
        
        const videoEl = document.createElement('video');
        videoEl.className = 'voice-user-video';
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        
        const nameOverlay = document.createElement('div');
        nameOverlay.className = 'voice-user-video-name';
        nameOverlay.textContent = username + ' (You)';
        
        videoContainer.appendChild(videoEl);
        videoContainer.appendChild(nameOverlay);
        
        // Move status icon into video container
        const statusIcon = userEl.querySelector('.voice-user-status');
        if (statusIcon) {
          videoContainer.appendChild(statusIcon);
        }
        
        // Replace entire user element content with video container
        userEl.innerHTML = '';
        userEl.appendChild(videoContainer);
      }
      
      const videoEl = videoContainer.querySelector('video');
      if (videoEl) {
        videoEl.srcObject = localVideoStream;
      }
      
      userEl.classList.add('has-video-expanded');
    });
  }

  function hideLocalVideo() {
    // Hide from user panel avatar
    const userPanelAvatar = document.getElementById('userPanelAvatar');
    if (userPanelAvatar) {
      const videoEl = userPanelAvatar.querySelector('video.local-video');
      if (videoEl) {
        videoEl.srcObject = null;
        videoEl.remove();
      }
      userPanelAvatar.classList.remove('has-video');
    }

    // Hide from voice channel list and restore original structure
    const currentUserVoiceElements = document.querySelectorAll(`.voice-user.current-user[data-username="${username}"]`);
    currentUserVoiceElements.forEach(userEl => {
      const videoContainer = userEl.querySelector('.voice-user-video-container');
      if (videoContainer) {
        const videoEl = videoContainer.querySelector('video');
        if (videoEl) {
          videoEl.srcObject = null;
        }
        videoContainer.remove();
      }
      userEl.classList.remove('has-video-expanded');
      
      // Force re-render to restore original structure
      forceUpdateVoiceChannelDisplay();
    });
  }

  function restoreVideosInChannelList() {
    // Restore local video if camera is on
    if (isCameraOn && localVideoStream) {
      const currentUserVoiceElements = document.querySelectorAll(`.voice-user.current-user[data-username="${username}"]`);
      currentUserVoiceElements.forEach(userEl => {
        // Only restore if not already present
        if (!userEl.querySelector('.voice-user-video-container')) {
          const videoContainer = document.createElement('div');
          videoContainer.className = 'voice-user-video-container';
          
          const videoEl = document.createElement('video');
          videoEl.className = 'voice-user-video';
          videoEl.autoplay = true;
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.srcObject = localVideoStream;
          
          const nameOverlay = document.createElement('div');
          nameOverlay.className = 'voice-user-video-name';
          nameOverlay.textContent = username + ' (You)';
          
          videoContainer.appendChild(videoEl);
          videoContainer.appendChild(nameOverlay);
          
          // Move status icon into video container
          const statusIcon = userEl.querySelector('.voice-user-status');
          if (statusIcon) {
            videoContainer.appendChild(statusIcon);
          }
          
          // Replace entire user element content with video container
          userEl.innerHTML = '';
          userEl.appendChild(videoContainer);
          userEl.classList.add('has-video-expanded');
        }
      });
    }

    // Restore remote videos for users with camera on
    userVoiceStates.forEach((state, user) => {
      if (state.camera && user !== username) {
        // Check if we have a stored video stream for this user
        const stream = remoteVideoStreams.get(user);
        if (stream) {
          // Restore video in channel list
          const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${user}"]`);
          voiceUsers.forEach(userEl => {
            if (!userEl.querySelector('.voice-user-video-container')) {
              const videoContainer = document.createElement('div');
              videoContainer.className = 'voice-user-video-container';
              
              const videoEl = document.createElement('video');
              videoEl.className = 'voice-user-video';
              videoEl.autoplay = true;
              videoEl.playsInline = true;
              videoEl.srcObject = stream;
              
              const nameOverlay = document.createElement('div');
              nameOverlay.className = 'voice-user-video-name';
              nameOverlay.textContent = user;
              
              videoContainer.appendChild(videoEl);
              videoContainer.appendChild(nameOverlay);
              
              // Move status icon into video container
              const statusIcon = userEl.querySelector('.voice-user-status');
              if (statusIcon) {
                videoContainer.appendChild(statusIcon);
              }
              
              // Replace entire user element content with video container
              userEl.innerHTML = '';
              userEl.appendChild(videoContainer);
              userEl.classList.add('has-video-expanded');
            }
          });
        }
      }
    });

    // Restore screen share buttons for all users
    userVoiceStates.forEach((state, user) => {
      if (state.screenSharing) {
        updateParticipantStatus(user);
      }
    });
  }

  function showVoiceIndicators(channelName) {
    // Update UI elements when joining voice
    const voiceUITitle = document.getElementById('voiceUITitle');
    const voiceUsername = document.getElementById('voiceUsername');
    const userPanelStatusText = document.getElementById('userPanelStatusText');
    const voiceConnectionBar = document.getElementById('voiceConnectionBar');
    const voiceConnectionChannelName = document.getElementById('voiceConnectionChannelName');

    if (voiceUITitle) {
      voiceUITitle.innerHTML = `<i class="fas fa-volume-up"></i> ${channelName}`;
    }

    if (voiceUsername) {
      voiceUsername.textContent = username;
    }

    // Update user panel status
    if (userPanelStatusText) {
      userPanelStatusText.innerHTML = `<i class="fas fa-volume-up"></i> ${channelName}`;
      userPanelStatusText.style.color = 'var(--voice-green)';
    }

    // Show voice connection bar
    if (voiceConnectionBar) {
      voiceConnectionBar.style.display = 'flex';
    }
    if (voiceConnectionChannelName) {
      voiceConnectionChannelName.textContent = channelName;
    }

    // Update channel list to show connection
    updateChannelActiveStates();

    log(`Connected to voice channel: ${channelName}`);
  }

  function showVoiceChannelUI(channelName) {
    // This function switches to the dedicated voice channel UI
    const chatArea = document.querySelector('.chat-area');
    const voiceUI = document.getElementById('voiceUI');

    if (chatArea) {
      chatArea.style.display = 'none';
    }

    if (voiceUI) {
      voiceUI.style.display = 'flex';
    }

    log(`Switched to voice channel UI: ${channelName}`);
  }

  function hideVoiceIndicators() {
    // Reset UI when leaving voice
    const userPanelStatusText = document.getElementById('userPanelStatusText');
    const userPanelMute = document.getElementById('userPanelMute');
    const userPanelDeafen = document.getElementById('userPanelDeafen');
    const voiceConnectionBar = document.getElementById('voiceConnectionBar');

    // Reset user panel status
    if (userPanelStatusText) {
      userPanelStatusText.textContent = 'Online';
      userPanelStatusText.style.color = '';
    }

    // Hide voice connection bar
    if (voiceConnectionBar) {
      voiceConnectionBar.style.display = 'none';
    }

    // Reset user panel buttons
    userPanelMute?.classList.remove('muted');
    userPanelDeafen?.classList.remove('deafened');

    // Update channel list to remove connection indicators
    updateChannelActiveStates();

    log('Disconnected from voice channel');
  }

  function updateVoiceChannelUsers(channelName, users) {
    log(`Updating voice channel users for ${channelName}: ${users.join(', ')}`);

    // Store users for this voice channel
    voiceChannelUsers.set(channelName, users);

    // Update voice channel user lists in various UI elements
    const voiceUIParticipants = document.getElementById('voiceUIParticipants');
    const voiceModalParticipants = document.getElementById('voiceModalParticipants');
    const voiceUIParticipantCount = document.getElementById('voiceUIParticipantCount');

    if (voiceUIParticipantCount) {
      voiceUIParticipantCount.textContent = `${users.length} participant${users.length !== 1 ? 's' : ''}`;
    }

    const participantHTML = users.map(user => {
      const isCurrentUser = user === username;
      const state = userVoiceStates.get(user) || { muted: false, deafened: false };
      
      // Determine status icon
      let statusIcon = '<i class="fas fa-microphone"></i>';
      if (state.deafened) {
        statusIcon = '<i class="fas fa-headphones-slash"></i>';
      } else if (state.muted) {
        statusIcon = '<i class="fas fa-microphone-slash"></i>';
      }
      
      return `
        <div class="voice-participant ${isCurrentUser ? 'current-user' : ''}" data-username="${user}">
          <div class="voice-participant-avatar">${user.charAt(0).toUpperCase()}</div>
          <div class="voice-participant-name">${user}${isCurrentUser ? ' (You)' : ''}</div>
          <div class="voice-participant-status">${statusIcon}</div>
        </div>
      `;
    }).join('');

    if (voiceUIParticipants) {
      voiceUIParticipants.innerHTML = participantHTML;
      log(`Updated voice UI participants: ${users.length} users`);
    }

    if (voiceModalParticipants) {
      voiceModalParticipants.innerHTML = participantHTML;
    }

    // Restore video elements after HTML update
    users.forEach(user => {
      const state = userVoiceStates.get(user) || { muted: false, deafened: false, camera: false };
      if (state.camera) {
        // Re-apply video for users with camera on
        if (user === username && localVideoStream) {
          // Restore own video in voice UI
          const participants = document.querySelectorAll(`.voice-participant[data-username="${user}"]`);
          participants.forEach(participant => {
            let videoEl = participant.querySelector('video.remote-video');
            if (!videoEl) {
              videoEl = document.createElement('video');
              videoEl.className = 'remote-video';
              videoEl.autoplay = true;
              videoEl.muted = true;
              videoEl.playsInline = true;
              participant.insertBefore(videoEl, participant.firstChild);
            }
            videoEl.srcObject = localVideoStream;
            participant.classList.add('has-video');
          });
        }
      }
    });

    // Update the channel list to show user counts and refresh the display
    updateChannelActiveStates();

    // Force re-render of voice channels to show updated user counts
    forceUpdateVoiceChannelDisplay();
    
    // Restore videos in channel list after re-render
    restoreVideosInChannelList();
  }

  function updateParticipantStatus(username) {
    const state = userVoiceStates.get(username) || { muted: false, deafened: false, camera: false, screenSharing: false };
    
    // Determine status icon and class
    let statusIcon = 'fa-microphone';
    let statusClass = '';
    
    if (state.deafened) {
      statusIcon = 'fa-headphones-slash';
      statusClass = 'deafened';
    } else if (state.muted) {
      statusIcon = 'fa-microphone-slash';
      statusClass = 'muted';
    }
    
    // Update voice UI participants
    const participants = document.querySelectorAll(`.voice-participant[data-username="${username}"]`);
    participants.forEach(participant => {
      const statusEl = participant.querySelector('.voice-participant-status');
      if (statusEl) {
        statusEl.innerHTML = `<i class="fas ${statusIcon}"></i>`;
      }
      
      // Add/remove screen sharing button
      let screenBtn = participant.querySelector('.screen-share-btn');
      if (state.screenSharing) {
        if (!screenBtn) {
          screenBtn = document.createElement('button');
          screenBtn.className = 'screen-share-btn';
          screenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
          screenBtn.title = `View ${username}'s screen`;
          screenBtn.onclick = () => openScreenSharePIP(username);
          participant.appendChild(screenBtn);
        }
      } else if (screenBtn) {
        screenBtn.remove();
      }
    });
    
    // Update voice channel list users
    const voiceUsers = document.querySelectorAll(`.voice-user[data-username="${username}"]`);
    voiceUsers.forEach(userEl => {
      const statusEl = userEl.querySelector('.voice-user-status');
      if (statusEl) {
        statusEl.className = `fas ${statusIcon} voice-user-status ${statusClass}`;
      }
      
      // Add/remove screen sharing button
      let screenBtn = userEl.querySelector('.screen-share-btn');
      if (state.screenSharing) {
        if (!screenBtn) {
          screenBtn = document.createElement('button');
          screenBtn.className = 'screen-share-btn';
          screenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
          screenBtn.title = `View ${username}'s screen`;
          screenBtn.onclick = () => openScreenSharePIP(username);
          userEl.appendChild(screenBtn);
        }
      } else if (screenBtn) {
        screenBtn.remove();
      }
    });
  }

  function forceUpdateVoiceChannelDisplay() {
    log('Force updating voice channel display');

    const voiceChannelsContainer = document.getElementById('voiceChannelsList');
    if (!voiceChannelsContainer) return;

    // Get all voice channel elements
    const voiceChannelElements = voiceChannelsContainer.querySelectorAll('.voice-channel-item');

    voiceChannelElements.forEach(channelEl => {
      const nameEl = channelEl.querySelector('.voice-channel-name');
      const countEl = channelEl.querySelector('.voice-user-count');
      const usersEl = channelEl.querySelector('.voice-channel-users');

      if (nameEl) {
        const channelName = nameEl.textContent.trim();
        const users = voiceChannelUsers.get(channelName) || [];
        const isConnected = channelName === currentVoiceChannel;

        // Update user count
        if (countEl) {
          countEl.textContent = users.length || '';
        }

        // Update users list
        if (usersEl) {
          if (users.length > 0) {
            usersEl.style.display = 'block';
            usersEl.innerHTML = users.map(user => `
              <div class="voice-user ${user === username ? 'current-user' : ''}" data-username="${user}">
                <span class="voice-user-avatar">${user.charAt(0).toUpperCase()}</span>
                <span class="voice-user-name">${user}</span>
                <i class="fas fa-microphone voice-user-status"></i>
                ${user === username && isConnected ? '<button class="voice-user-disconnect" title="Disconnect"><i class="fas fa-phone-slash"></i></button>' : ''}
              </div>
            `).join('');

            // Re-attach disconnect button handler
            if (isConnected) {
              const disconnectBtn = usersEl.querySelector('.voice-user-disconnect');
              if (disconnectBtn) {
                disconnectBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  leaveVoiceChannel();
                });
              }
            }
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
    });
  }

  function updateChannelActiveStates() {
    // Update the visual state of channels to show which are active
    log('Updating channel active states');

    // Force update text channels
    const textChannels = document.querySelectorAll('#textChannelsList .channel');
    textChannels.forEach(channelEl => {
      const nameEl = channelEl.querySelector('.channel-name');
      if (nameEl) {
        const channelName = nameEl.textContent.replace('#', '').trim();
        if (channelName === currentTextChannel) {
          nameEl.classList.add('active');
        } else {
          nameEl.classList.remove('active');
        }
      }
    });

    // Force update voice channels
    const voiceChannels = document.querySelectorAll('#voiceChannelsList .voice-channel-item');
    voiceChannels.forEach(channelEl => {
      const nameEl = channelEl.querySelector('.voice-channel-name');
      if (nameEl) {
        const channelName = nameEl.textContent.trim();
        if (channelName === currentVoiceChannel) {
          channelEl.classList.add('connected');
        } else {
          channelEl.classList.remove('connected');
        }
      }
    });
  }

  function refreshChannelLists() {
    // Re-render both channel lists to update user counts and active states
    if (window.wyvernSocket) {
      log('Refreshing channel lists with current state');

      // Get the current channel data and re-render
      const textChannelsContainer = document.getElementById('textChannelsList');
      const voiceChannelsContainer = document.getElementById('voiceChannelsList');

      // Trigger a re-render by requesting fresh data from server
      // This will cause the server to send channelUpdate and voiceChannelUpdate events
      window.wyvernSocket.emit('requestChannelUpdate');
    }
  }

  // Set up voice control event listeners
  function setupVoiceControls() {
    const voiceUIMuteBtn = document.getElementById('voiceUIMuteBtn');
    const voiceUIDisconnectBtn = document.getElementById('voiceUIDisconnectBtn');
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    const modalDisconnectBtn = document.getElementById('modalDisconnectBtn');

    // Voice UI controls
    voiceUIMuteBtn?.addEventListener('click', toggleMute);
    voiceUIDisconnectBtn?.addEventListener('click', leaveVoiceChannel);

    // Modal controls
    modalMuteBtn?.addEventListener('click', toggleMute);
    modalDisconnectBtn?.addEventListener('click', leaveVoiceChannel);
  }

  // Initialize voice controls and UI
  setupVoiceControls();

  // Make sure voice UI is initially hidden
  const voiceUI = document.getElementById('voiceUI');
  if (voiceUI) {
    voiceUI.style.display = 'none';
  }

  // Add basic styling for voice channels
  const style = document.createElement('style');
  style.textContent = `
    .voice-channel {
      margin-bottom: 4px;
    }
    .voice-channel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
    }
    .voice-channel-header:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    .voice-channel.connected .voice-channel-header {
      background-color: rgba(88, 101, 242, 0.3);
    }
    .voice-user-count {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 12px;
      min-width: 16px;
      text-align: center;
    }
    .voice-channel-users {
      padding-left: 16px;
      margin-top: 4px;
    }
    .voice-user {
      display: flex;
      align-items: center;
      padding: 2px 8px;
      font-size: 14px;
      opacity: 0.8;
    }
    .voice-user.current-user {
      opacity: 1;
      font-weight: bold;
    }
    .voice-user-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #5865f2;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      margin-right: 8px;
    }
    .voice-user-status {
      margin-left: auto;
      font-size: 12px;
    }
    .channel-name.active {
      background-color: rgba(88, 101, 242, 0.3);
      border-radius: 4px;
      padding: 4px 8px;
    }
  `;
  document.head.appendChild(style);

  // Add debug function to window for testing
  window.debugVoice = {
    getLocalStream: () => localStream,
    getCurrentVoiceChannel: () => currentVoiceChannel,
    getPeerConnections: () => peerConnections,
    getVoiceChannelUsers: () => voiceChannelUsers,
    forceUpdateDisplay: () => forceUpdateVoiceChannelDisplay(),
    testMicrophone: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        log('âœ… Microphone test successful');
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (err) {
        log(`âŒ Microphone test failed: ${err.message}`);
        return false;
      }
    },
    simulateUserJoin: (username, channel) => {
      // Simulate another user joining for testing
      log(`ðŸ§ª Simulating ${username} joining ${channel}`);
      const currentUsers = voiceChannelUsers.get(channel) || [];
      if (!currentUsers.includes(username)) {
        currentUsers.push(username);
        updateVoiceChannelUsers(channel, currentUsers);
      }
    }
  };

  // Setup voice control button handlers (must be after voice functions are defined)
  function setupVoiceButtonHandlers() {
    const userPanelMute = document.getElementById("userPanelMute");
    const userPanelDeafen = document.getElementById("userPanelDeafen");
    const voiceDisconnect = document.getElementById('voiceDisconnect');
    const voiceCamera = document.getElementById('voiceCamera');

    if (userPanelMute) {
      userPanelMute.addEventListener("click", () => {
        if (currentVoiceChannel) {
          toggleMute();
        } else {
          showNotification('Join a voice channel first', 'error');
        }
      });
    }

    if (userPanelDeafen) {
      userPanelDeafen.addEventListener("click", () => {
        if (currentVoiceChannel) {
          const isDeafened = userPanelDeafen.classList.toggle('deafened');
          
          if (isDeafened) {
            if (localStream) {
              localStream.getAudioTracks().forEach(track => {
                track.enabled = false;
              });
            }
            document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
              audio.muted = true;
            });
            showNotification('Deafened', 'success');
          } else {
            if (localStream && !isMuted) {
              localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
              });
            }
            document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
              audio.muted = false;
            });
            showNotification('Undeafened', 'success');
          }

          const state = userVoiceStates.get(username) || { muted: false, deafened: false };
          state.deafened = isDeafened;
          userVoiceStates.set(username, state);
          updateParticipantStatus(username);

          if (window.wyvernSocket) {
            window.wyvernSocket.emit('userDeafened', { deafened: isDeafened });
          }
        } else {
          showNotification('Join a voice channel first', 'error');
        }
      });
    }

    if (voiceDisconnect) {
      voiceDisconnect.addEventListener('click', () => {
        leaveVoiceChannel();
      });
    }

    if (voiceCamera) {
      voiceCamera.addEventListener('click', () => {
        toggleCamera();
      });
    }

    log('Voice button handlers set up');
  }

  // Call setup function
  setupVoiceButtonHandlers();

  // ==================== DIRECT MESSAGING FUNCTIONALITY ====================
  // NOTE: This must be inside the IIFE to access variables like username, currentView, etc.
  
  // View switching
  function switchToChannelsView() {
    currentView = 'channels';
    isDMMode = false;
    currentDMRecipient = null;
    
    // Remove DM mode styling
    document.body.removeAttribute('data-dm-mode');
    
    document.getElementById('channelsView').style.display = 'block';
    document.getElementById('dmView').style.display = 'none';
    
    document.getElementById('homeButton').classList.add('active');
    document.getElementById('dmButton').classList.remove('active');
    
    // Switch to general channel
    const socket = window.wyvernSocket;
    if (socket) {
      socket.emit('joinChannel', 'general');
      currentTextChannel = 'general';
    }
    
    // Update header
    const currentChannelEl = document.getElementById('currentChannel');
    if (currentChannelEl) {
      currentChannelEl.textContent = 'general';
    }
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.placeholder = 'Message #general';
    }
    
    // Update active channel
    updateChannelActiveStates();
    
    closeMobileMenus();
  }
  
  function switchToDMsView() {
    currentView = 'dms';
    
    document.getElementById('channelsView').style.display = 'none';
    document.getElementById('dmView').style.display = 'block';
    
    document.getElementById('homeButton').classList.remove('active');
    document.getElementById('dmButton').classList.add('active');
    
    // Update header
    const currentChannelEl = document.getElementById('currentChannel');
    if (currentChannelEl) {
      currentChannelEl.innerHTML = '<i class="fas fa-user"></i> Direct Messages';
    }
    
    // Clear chat if no DM is selected
    if (!currentDMRecipient) {
      const messagesContainer = document.getElementById("chat-messages");
      if (messagesContainer) {
        messagesContainer.innerHTML = '<div class="dm-welcome"><i class="fas fa-user-friends"></i><h3>Select a conversation or start a new one</h3><p>Choose from your existing conversations or click on a user to start chatting</p></div>';
      }
      
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.placeholder = 'Select a conversation to start messaging';
        chatInput.disabled = true;
      }
    }
    
    // Load conversations and online users
    updateDMList();
    updateDMOnlineUsers();
    
    closeMobileMenus();
  }
  
  // Setup view switching buttons
  const homeButton = document.getElementById('homeButton');
  const dmButton = document.getElementById('dmButton');
  
  if (homeButton) {
    homeButton.addEventListener('click', switchToChannelsView);
    homeButton.classList.add('active'); // Start with home active
  }
  
  if (dmButton) {
    dmButton.addEventListener('click', switchToDMsView);
  }
  
  // DM search functionality
  const dmSearch = document.getElementById('dmSearch');
  if (dmSearch) {
    dmSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      // Filter DM conversations
      document.querySelectorAll('.dm-item').forEach(item => {
        const username = item.dataset.username.toLowerCase();
        if (username.includes(query)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
      
      // Filter online users
      document.querySelectorAll('.dm-user-item').forEach(item => {
        const username = item.dataset.username.toLowerCase();
        if (username.includes(query)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
  
  // Display direct message in chat
  async function displayDirectMessage(data) {
    const messagesContainer = document.getElementById("chat-messages");
    if (!messagesContainer) return;

    const messageEl = document.createElement("div");
    messageEl.className = "message";
    messageEl.dataset.messageId = data._id || data.id || '';
    
    // Add self class if it's our message
    if (data.sender === username) {
      messageEl.classList.add('self');
    }

    // Get user profile for avatar
    const profile = await getUserProfile(data.sender);
    const avatarHTML = getAvatarHTML(data.sender, profile);
    const profileColor = getProfileColor(profile);

    // Format timestamp
    const timestamp = new Date(data.timestamp);
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Escape HTML in message
    let escapedMessage = escapeHtml(data.message);

    // Build attachments HTML
    let attachmentsHTML = '';
    if (data.attachments && data.attachments.length > 0) {
      attachmentsHTML = '<div class="message-attachments">';
      data.attachments.forEach(attachment => {
        const isImage = attachment.mimetype.startsWith('image/');
        const isVideo = attachment.mimetype.startsWith('video/');
        
        if (isImage) {
          attachmentsHTML += `
            <div class="message-attachment">
              <img src="${attachment.url}" alt="${attachment.originalName}" onclick="openLightbox('${attachment.url}')" />
            </div>
          `;
        } else if (isVideo) {
          attachmentsHTML += `
            <div class="message-attachment">
              <video controls>
                <source src="${attachment.url}" type="${attachment.mimetype}">
              </video>
            </div>
          `;
        } else {
          const fileSize = formatFileSize(attachment.size);
          attachmentsHTML += `
            <a href="${attachment.url}" download="${attachment.originalName}" class="message-file">
              <div class="message-file-icon">
                <i class="fas fa-file"></i>
              </div>
              <div class="message-file-info">
                <div class="message-file-name">${attachment.originalName}</div>
                <div class="message-file-size">${fileSize}</div>
              </div>
              <div class="message-file-download">
                <i class="fas fa-download"></i>
              </div>
            </a>
          `;
        }
      });
      attachmentsHTML += '</div>';
    }

    messageEl.innerHTML = `
      <div class="message-avatar" style="background: ${profileColor};">${avatarHTML}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-username">${escapeHtml(data.sender)}</span>
          <span class="message-timestamp">${timeStr}</span>
        </div>
        ${escapedMessage ? `<div class="message-text">${escapedMessage}</div>` : ''}
        ${attachmentsHTML}
      </div>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Open DM conversation with a user
  function openDMConversation(targetUsername) {
    if (targetUsername === username) {
      showToast("You can't DM yourself!", 'error');
      return;
    }

    log(`Opening DM with ${targetUsername}`);
    
    // Switch to DMs view if not already there
    if (currentView !== 'dms') {
      switchToDMsView();
    }
    
    // Switch to DM mode
    isDMMode = true;
    currentDMRecipient = targetUsername;
    currentTextChannel = null;
    
    // Set body data attribute for DM mode styling
    document.body.setAttribute('data-dm-mode', 'true');
    
    // Update UI
    const currentChannelEl = document.getElementById('currentChannel');
    if (currentChannelEl) {
      currentChannelEl.innerHTML = `<i class="fas fa-user"></i> @${targetUsername}`;
    }
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.placeholder = `Message @${targetUsername}`;
      chatInput.disabled = false;
    }
    
    // Update active states
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
    document.querySelectorAll('.dm-item').forEach(dm => {
      if (dm.dataset.username === targetUsername) {
        dm.classList.add('active');
      } else {
        dm.classList.remove('active');
      }
    });
    document.querySelectorAll('.dm-user-item').forEach(user => {
      if (user.dataset.username === targetUsername) {
        user.classList.add('active');
      } else {
        user.classList.remove('active');
      }
    });
    
    // Request DM history
    window.wyvernSocket.emit('getDirectMessages', { recipient: targetUsername });
    
    // Mark as read
    window.wyvernSocket.emit('markDMAsRead', { recipient: targetUsername });
    
    // Close mobile menus
    closeMobileMenus();
  }

  // Update DM list
  function updateDMList() {
    if (window.wyvernSocket && window.wyvernSocket.connected) {
      window.wyvernSocket.emit('getConversations');
    }
  }
  
  // Update online users in DM view
  async function updateDMOnlineUsers() {
    const dmOnlineUsers = document.getElementById('dmOnlineUsers');
    const onlineCount = document.getElementById('onlineCount');
    if (!dmOnlineUsers) return;
    
    // Get online users from the socket
    const socket = window.wyvernSocket;
    if (!socket) return;
    
    // We'll use the onlineUsers event data
    // For now, let's get it from the users panel
    const userItems = document.querySelectorAll('.user-item');
    const users = [];
    
    userItems.forEach(item => {
      const nameEl = item.querySelector('.user-item-name');
      if (nameEl) {
        const name = nameEl.textContent.trim().replace('ADMIN', '').trim();
        const isAdmin = nameEl.textContent.includes('ADMIN');
        if (name !== username) {
          users.push({ username: name, isAdmin });
        }
      }
    });
    
    if (onlineCount) {
      onlineCount.textContent = users.length;
    }
    
    dmOnlineUsers.innerHTML = '';
    
    for (const user of users) {
      const profile = await getUserProfile(user.username);
      const avatarHTML = getAvatarHTML(user.username, profile);
      const profileColor = getProfileColor(profile);
      
      const userItem = document.createElement('div');
      userItem.className = 'dm-user-item';
      userItem.dataset.username = user.username;
      
      userItem.innerHTML = `
        <div class="dm-user-avatar" style="background: ${profileColor};">
          ${avatarHTML}
          <div class="dm-user-status"></div>
        </div>
        <div class="dm-user-name">${escapeHtml(user.username)}</div>
        ${user.isAdmin ? '<span class="dm-user-badge">Admin</span>' : ''}
      `;
      
      userItem.addEventListener('click', () => {
        openDMConversation(user.username);
      });
      
      dmOnlineUsers.appendChild(userItem);
    }
  }

  // Display conversations list
  async function displayConversationsList(conversations) {
    const dmList = document.getElementById('dmList');
    if (!dmList) return;

    dmList.innerHTML = '';

    for (const conv of conversations) {
      const lastMsg = conv.lastMessage;
      const otherUser = lastMsg.sender === username ? lastMsg.recipient : lastMsg.sender;
      
      // Get user profile for avatar
      const profile = await getUserProfile(otherUser);
      const avatarHTML = getAvatarHTML(otherUser, profile);
      const profileColor = getProfileColor(profile);

      const dmItem = document.createElement('div');
      dmItem.className = 'dm-item';
      dmItem.dataset.username = otherUser;
      
      if (currentDMRecipient === otherUser) {
        dmItem.classList.add('active');
      }

      const unreadBadge = conv.unreadCount > 0 ? `<span class="dm-unread-badge">${conv.unreadCount}</span>` : '';
      const preview = lastMsg.message ? lastMsg.message.substring(0, 30) + (lastMsg.message.length > 30 ? '...' : '') : 'Attachment';

      dmItem.innerHTML = `
        <div class="dm-avatar" style="background: ${profileColor};">
          ${avatarHTML}
        </div>
        <div class="dm-info">
          <div class="dm-username">${escapeHtml(otherUser)}</div>
          <div class="dm-preview">${escapeHtml(preview)}</div>
        </div>
        ${unreadBadge}
      `;

      dmItem.addEventListener('click', () => {
        openDMConversation(otherUser);
      });

      dmList.appendChild(dmItem);
    }
  }

  // Hook into socket events to update DM list
  setTimeout(() => {
    if (window.wyvernSocket) {
      window.wyvernSocket.on('onlineUsers', (users) => {
        // Update DM online users if in DM view
        setTimeout(() => {
          if (currentView === 'dms') {
            updateDMOnlineUsers();
          }
        }, 100);
      });
      
      // Initial load of conversations
      setTimeout(() => {
        if (window.wyvernSocket && window.wyvernSocket.connected) {
          updateDMList();
        }
      }, 1000);
    }
  }, 500);

  // Debug info
  log('Chat.js loaded successfully');
  log(`Socket.IO available: ${typeof io !== 'undefined'}`);
  log(`WebRTC available: ${typeof RTCPeerConnection !== 'undefined'}`);
  log(`getUserMedia available: ${typeof navigator.mediaDevices?.getUserMedia !== 'undefined'}`);
  log(`Current URL: ${window.location.href}`);
  log('Voice chat functionality initialized');
  log('ðŸ’¡ Use window.debugVoice in console to debug voice chat');
})();

  // Image lightbox
  window.openLightbox = function(imageUrl) {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    
    if (lightbox && lightboxImage) {
      lightboxImage.src = imageUrl;
      lightbox.classList.add('show');
    }
  };

  const lightboxClose = document.getElementById('lightboxClose');
  const imageLightbox = document.getElementById('imageLightbox');
  
  if (lightboxClose) {
    lightboxClose.addEventListener('click', () => {
      imageLightbox.classList.remove('show');
    });
  }
  
  if (imageLightbox) {
    imageLightbox.addEventListener('click', (e) => {
      if (e.target === imageLightbox) {
        imageLightbox.classList.remove('show');
      }
    });
  }

  // Mobile menu functionality
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const toggleUsersBtn = document.getElementById('toggleUsersBtn');

  function closeMobileMenus() {
    document.body.classList.remove('sidebar-visible');
    document.body.classList.remove('users-panel-visible');
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isSidebarVisible = document.body.classList.contains('sidebar-visible');
      
      // Close users panel if open
      document.body.classList.remove('users-panel-visible');
      
      // Toggle sidebar
      if (isSidebarVisible) {
        document.body.classList.remove('sidebar-visible');
      } else {
        document.body.classList.add('sidebar-visible');
      }
    });
  }

  if (toggleUsersBtn) {
    toggleUsersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isUsersVisible = document.body.classList.contains('users-panel-visible');
      
      // Close sidebar if open
      document.body.classList.remove('sidebar-visible');
      
      // Toggle users panel
      if (isUsersVisible) {
        document.body.classList.remove('users-panel-visible');
        toggleUsersBtn.classList.remove('active');
      } else {
        document.body.classList.add('users-panel-visible');
        toggleUsersBtn.classList.add('active');
      }
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
      closeMobileMenus();
      if (toggleUsersBtn) {
        toggleUsersBtn.classList.remove('active');
      }
    });
  }

  // Close mobile menus when clicking on a channel
  document.addEventListener('click', (e) => {
    if (e.target.closest('.channel') || e.target.closest('.voice-channel-item')) {
      // Small delay to allow the channel switch to happen
      setTimeout(() => {
        closeMobileMenus();
      }, 100);
    }
  });

  // Prevent body scroll when mobile menu is open
  const observer = new MutationObserver(() => {
    if (document.body.classList.contains('sidebar-visible') || 
        document.body.classList.contains('users-panel-visible')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  // Handle orientation change
  window.addEventListener('orientationchange', () => {
    closeMobileMenus();
    if (toggleUsersBtn) {
      toggleUsersBtn.classList.remove('active');
    }
  });

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Close mobile menus when resizing to desktop
      if (window.innerWidth > 800) {
        closeMobileMenus();
        if (toggleUsersBtn) {
          toggleUsersBtn.classList.remove('active');
        }
        document.body.style.overflow = '';
      }
    }, 250);
  });

  // Touch gestures for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 100;
    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = Math.abs(touchEndY - touchStartY);
    
    // Only trigger if horizontal swipe is dominant
    if (swipeDistanceY < 100) {
      // Swipe right to open sidebar (from left edge)
      if (swipeDistanceX > swipeThreshold && touchStartX < 50) {
        document.body.classList.add('sidebar-visible');
        document.body.classList.remove('users-panel-visible');
      }
      
      // Swipe left to close sidebar
      if (swipeDistanceX < -swipeThreshold && document.body.classList.contains('sidebar-visible')) {
        document.body.classList.remove('sidebar-visible');
      }
      
      // Swipe left to open users panel (from right edge)
      if (swipeDistanceX < -swipeThreshold && touchStartX > window.innerWidth - 50) {
        document.body.classList.add('users-panel-visible');
        document.body.classList.remove('sidebar-visible');
        if (toggleUsersBtn) {
          toggleUsersBtn.classList.add('active');
        }
      }
      
      // Swipe right to close users panel
      if (swipeDistanceX > swipeThreshold && document.body.classList.contains('users-panel-visible')) {
        document.body.classList.remove('users-panel-visible');
        if (toggleUsersBtn) {
          toggleUsersBtn.classList.remove('active');
        }
      }
    }
  }

  // Improve mobile input focus behavior
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('focus', () => {
      // Scroll to input on mobile when focused
      if (window.innerWidth <= 800) {
        setTimeout(() => {
          chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    });
  }

  console.log('âœ… Mobile optimizations loaded');
