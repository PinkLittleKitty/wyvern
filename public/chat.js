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

  // Check if user is logged in
  let username = sessionStorage.getItem("wyvernUsername");
  if (!username) {
    log('No username found, redirecting to login');
    window.location.href = "/login.html";
    return;
  }

  log(`Username: ${username}`);

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
      log("✅ Fallback connection successful!");
      showNotification('Connected via polling fallback!', 'success');
      window.wyvernSocket = fallbackSocket;
      setupSocketHandlers(fallbackSocket);
    });

    fallbackSocket.on("connect_error", (error) => {
      log(`❌ Fallback connection also failed: ${error.message}`);
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
      log(`❌ Connection error: ${error.message}`);
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
      log("✅ Connected to server successfully!");
      showNotification('Connected to Wyvern!', 'success');

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
      document.getElementById("username").textContent = data.username;
      if (data.isAdmin) {
        document.getElementById("adminBadge").style.display = 'inline';
      }

      // Update user panel
      const userPanelName = document.getElementById("userPanelName");
      const userPanelAvatar = document.getElementById("userPanelAvatar");
      if (userPanelName) {
        userPanelName.textContent = data.username;
      }
      if (userPanelAvatar) {
        userPanelAvatar.textContent = data.username.charAt(0).toUpperCase();
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

    socket.on("chatHistory", (history) => {
      log(`Received ${history.length} messages`);
      const messagesContainer = document.getElementById("chat-messages");
      messagesContainer.innerHTML = "";
      history.forEach(displayMessage);
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

      // Clean up peer connection
      if (peerConnections.has(data.socketId)) {
        peerConnections.get(data.socketId).close();
        peerConnections.delete(data.socketId);
      }
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
      // Handle mute indicator
      const participants = document.querySelectorAll('.voice-participant');
      participants.forEach(participant => {
        const nameEl = participant.querySelector('.voice-participant-name');
        const statusEl = participant.querySelector('.voice-participant-status');
        if (nameEl && nameEl.textContent === data.username) {
          statusEl.innerHTML = data.muted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
        }
      });
    });

    // WebRTC signaling events
    socket.on("webrtc-offer", async (data) => {
      log(`📞 Received WebRTC offer from ${data.username} (${data.from})`);

      if (!localStream) {
        log(`❌ Cannot handle offer - no local stream`);
        return;
      }

      // If we already have a connection and we're the initiator, ignore this offer
      if (peerConnections.has(data.from)) {
        const existingPc = peerConnections.get(data.from);
        if (existingPc.signalingState !== 'stable') {
          log(`⚠️ Already have an active connection to ${data.username}, ignoring offer`);
          return;
        }
        // If connection is stable but we got an offer, close and recreate
        log(`⚠️ Existing connection is stable, closing and handling new offer`);
        existingPc.close();
        peerConnections.delete(data.from);
      }

      const pc = createPeerConnection(data.from, data.username, false);

      try {
        await pc.setRemoteDescription(data.offer);
        log(`✅ Set remote description for ${data.username}`);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        log(`✅ Created and set local answer for ${data.username}`);

        socket.emit("webrtc-answer", {
          answer: answer,
          to: data.from
        });
        log(`📤 Sent WebRTC answer to ${data.username}`);
      } catch (err) {
        log(`❌ Error handling WebRTC offer from ${data.username}: ${err.message}`);
      }
    });

    socket.on("webrtc-answer", async (data) => {
      log(`📞 Received WebRTC answer from ${data.username} (${data.from})`);
      const pc = peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(data.answer);
          log(`✅ Set remote description from answer for ${data.username}`);
        } catch (err) {
          log(`❌ Error handling WebRTC answer from ${data.username}: ${err.message}`);
        }
      } else {
        log(`❌ No peer connection found for ${data.username} (${data.from})`);
      }
    });

    socket.on("webrtc-ice-candidate", async (data) => {
      log(`🧊 Received ICE candidate from ${data.from}`);
      const pc = peerConnections.get(data.from);
      if (pc) {
        try {
          await pc.addIceCandidate(data.candidate);
          log(`✅ Added ICE candidate from ${data.from}`);
        } catch (err) {
          log(`❌ Error adding ICE candidate from ${data.from}: ${err.message}`);
        }
      } else {
        log(`❌ No peer connection found for ICE candidate from ${data.from}`);
      }
    });

    // Basic message sending
    const input = document.getElementById("chat-input");
    const button = document.getElementById("send-button");
    let typingTimeout;
    let isTyping = false;

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      log(`Sending message: ${text}`);
      socket.emit("chatMessage", { username, message: text });
      input.value = "";
      
      // Stop typing indicator when message is sent
      stopTyping();
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
    const userPanelMute = document.getElementById("userPanelMute");
    const userPanelDeafen = document.getElementById("userPanelDeafen");
    const userPanelSettings = document.getElementById("userPanelSettings");

    if (userPanelMute) {
      userPanelMute.addEventListener("click", () => {
        if (currentVoiceChannel) {
          toggleMute();
          // toggleMute already handles the muted class
        } else {
          showNotification('Join a voice channel first', 'error');
        }
      });
    }

    if (userPanelDeafen) {
      userPanelDeafen.addEventListener("click", () => {
        if (currentVoiceChannel) {
          // Toggle deafen state
          const isDeafened = userPanelDeafen.classList.toggle('deafened');
          
          if (isDeafened) {
            // Mute microphone and disable all audio outputs
            if (localStream) {
              localStream.getAudioTracks().forEach(track => {
                track.enabled = false;
              });
            }
            // Mute all remote audio elements
            document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
              audio.muted = true;
            });
            showNotification('Deafened', 'success');
          } else {
            // Unmute microphone if it wasn't muted before
            if (localStream && !isMuted) {
              localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
              });
            }
            // Unmute all remote audio elements
            document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
              audio.muted = false;
            });
            showNotification('Undeafened', 'success');
          }
        } else {
          showNotification('Join a voice channel first', 'error');
        }
      });
    }

    if (userPanelSettings) {
      userPanelSettings.addEventListener("click", () => {
        showNotification('Settings coming soon!', 'success');
      });
    }

    // User panel info click - show profile or settings
    const userPanelInfo = document.querySelector('.user-panel-info');
    if (userPanelInfo) {
      userPanelInfo.addEventListener("click", () => {
        showNotification(`Logged in as ${username}`, 'success');
      });
    }
  }

  function displayMessage(data) {
    const messagesContainer = document.getElementById("chat-messages");
    const messageEl = document.createElement("div");
    messageEl.className = "message-container";
    messageEl.dataset.username = data.username;
    messageEl.dataset.timestamp = data.timestamp;

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

    // Get first letter for avatar
    const avatarLetter = data.username.charAt(0).toUpperCase();
    
    // Check if user is admin (you can enhance this with actual admin data)
    const isAdmin = data.isAdmin || false;
    const adminBadge = isAdmin ? '<span class="message-admin-badge">Admin</span>' : '';

    // Escape HTML in message but preserve line breaks
    const escapedMessage = escapeHtml(data.message);

    messageEl.innerHTML = `
      <div class="message-avatar">${avatarLetter}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-username">${escapeHtml(data.username)}</span>
          ${adminBadge}
          <span class="message-timestamp">${timeStr}</span>
        </div>
        <div class="message-text">${escapedMessage}</div>
      </div>
      <div class="message-actions">
        <button class="message-action-btn" title="Add Reaction">
          <i class="far fa-smile"></i>
        </button>
        <button class="message-action-btn" title="Reply">
          <i class="fas fa-reply"></i>
        </button>
        <button class="message-action-btn" title="More">
          <i class="fas fa-ellipsis-h"></i>
        </button>
      </div>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Online users list functionality
  function updateOnlineUsersList(users) {
    const usersList = document.getElementById('usersList');
    const usersCount = document.getElementById('usersCount');
    
    if (!usersList || !usersCount) return;

    usersCount.textContent = users.length;
    usersList.innerHTML = '';

    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      if (user.username === username) {
        userItem.classList.add('self');
      }

      const statusText = user.voiceChannel ? `<i class="fas fa-volume-up"></i> ${user.voiceChannel}` : 'Online';
      const statusClass = user.voiceChannel ? 'in-voice' : '';

      userItem.innerHTML = `
        <div class="user-item-avatar">
          ${user.username.charAt(0).toUpperCase()}
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

      usersList.appendChild(userItem);
    });
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

  // Store voice channel users for each channel
  const voiceChannelUsers = new Map();

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
            ${users.map(user => `
              <div class="voice-user ${user === username ? 'current-user' : ''}" data-username="${user}">
                <span class="voice-user-avatar">${user.charAt(0).toUpperCase()}</span>
                <span class="voice-user-name">${user}</span>
                <i class="fas fa-microphone voice-user-status"></i>
                ${user === username && isConnected ? '<button class="voice-user-disconnect" title="Disconnect"><i class="fas fa-phone-slash"></i></button>' : ''}
              </div>
            `).join('')}
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
  let currentVoiceChannel = null;
  let localStream = null;
  let peerConnections = new Map();
  let isMuted = false;
  let currentTextChannel = 'general';

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  function createPeerConnection(socketId, username, isInitiator) {
    log(`🔗 Creating peer connection for ${username} (${socketId}) - initiator: ${isInitiator}`);

    if (peerConnections.has(socketId)) {
      const existingPc = peerConnections.get(socketId);
      log(`⚠️ Peer connection already exists for ${username} in state: ${existingPc.signalingState}`);
      
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

    // Add local stream to peer connection
    if (localStream) {
      log(`🎤 Adding ${localStream.getTracks().length} tracks to peer connection for ${username}`);
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        log(`✅ Added ${track.kind} track to ${username}`);
      });
    } else {
      log(`❌ No local stream to add to peer connection for ${username}`);
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      log(`Received remote stream from ${username}`);
      const remoteStream = event.streams[0];
      playRemoteAudio(remoteStream, username);
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
        log(`✅ Joined voice channel: ${channelName}`);
      })
      .catch(err => {
        log(`❌ Microphone access denied: ${err.message}`);
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

    // Clean up all peer connections and remote audio
    peerConnections.forEach((pc, socketId) => {
      pc.close();
    });
    peerConnections.clear();

    // Remove all remote audio elements
    document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
      audio.remove();
    });

    if (window.wyvernSocket) {
      window.wyvernSocket.emit('leaveVoiceChannel');
    }

    hideVoiceIndicators();
    currentVoiceChannel = null;
    log(`✅ Left voice channel`);
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

    if (window.wyvernSocket) {
      window.wyvernSocket.emit('userMuted', { muted: isMuted });
    }

    log(`${isMuted ? 'Muted' : 'Unmuted'} microphone`);
  }

  function showVoiceIndicators(channelName) {
    // Update UI elements when joining voice
    const voiceUITitle = document.getElementById('voiceUITitle');
    const voiceUsername = document.getElementById('voiceUsername');
    const userPanelStatusText = document.getElementById('userPanelStatusText');

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

    // Reset user panel status
    if (userPanelStatusText) {
      userPanelStatusText.textContent = 'Online';
      userPanelStatusText.style.color = '';
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
      return `
        <div class="voice-participant ${isCurrentUser ? 'current-user' : ''}">
          <div class="voice-participant-avatar">${user.charAt(0).toUpperCase()}</div>
          <div class="voice-participant-name">${user}${isCurrentUser ? ' (You)' : ''}</div>
          <div class="voice-participant-status">🎤</div>
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

    // Update the channel list to show user counts and refresh the display
    updateChannelActiveStates();

    // Force re-render of voice channels to show updated user counts
    forceUpdateVoiceChannelDisplay();
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
        log('✅ Microphone test successful');
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (err) {
        log(`❌ Microphone test failed: ${err.message}`);
        return false;
      }
    },
    simulateUserJoin: (username, channel) => {
      // Simulate another user joining for testing
      log(`🧪 Simulating ${username} joining ${channel}`);
      const currentUsers = voiceChannelUsers.get(channel) || [];
      if (!currentUsers.includes(username)) {
        currentUsers.push(username);
        updateVoiceChannelUsers(channel, currentUsers);
      }
    }
  };

  // Debug info
  log('Chat.js loaded successfully');
  log(`Socket.IO available: ${typeof io !== 'undefined'}`);
  log(`WebRTC available: ${typeof RTCPeerConnection !== 'undefined'}`);
  log(`getUserMedia available: ${typeof navigator.mediaDevices?.getUserMedia !== 'undefined'}`);
  log(`Current URL: ${window.location.href}`);
  log('Voice chat functionality initialized');
  log('💡 Use window.debugVoice in console to debug voice chat');
})();