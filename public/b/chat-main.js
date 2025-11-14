// Main Chat Application - Modular Version
import { LoadingManager } from './modules/loading.js';
import { SoundManager } from './modules/sound.js';
import { ThemeManager } from './modules/theme.js';
import { TypingManager } from './modules/typing.js';
import { MentionManager } from './modules/mentions.js';
import { ProfileManager } from './modules/profile.js';
import { SocketManager } from './modules/socket.js';
import { FileUploadManager } from './modules/file-upload.js';
import { ToastManager } from './modules/toast.js';
import { MessageManager } from './modules/messages.js';
import { UserListManager } from './modules/users.js';
import { ChannelManager } from './modules/channels.js';
import { SettingsManager } from './modules/settings.js';
import { ProfileModalManager } from './modules/profile-modal.js';
import { UIManager } from './modules/ui.js';
import { SidebarManager } from './modules/sidebar.js';
import { AdminManager } from './modules/admin.js';

(async function initChat() {
  try {
    // Check authentication
    let username = sessionStorage.getItem("wyvernUsername");
    if (!username) {
      console.warn('No username found, redirecting to login');
      window.location.href = "/b/login.html";
      return;
    }

    // Get token from localStorage (set by login) or sessionStorage
    const token = localStorage.getItem('wyvernToken') || sessionStorage.getItem('wyvernToken');
    if (!token) {
      console.error('No token found in localStorage or sessionStorage');
      window.location.href = "/b/login.html";
      return;
    }

    // Store in sessionStorage for consistency
    sessionStorage.setItem('wyvernToken', token);

    // Initialize managers
    const toast = new ToastManager();
    const loading = new LoadingManager();
    const sound = new SoundManager();
    const theme = new ThemeManager();
    const profile = new ProfileManager();
    const fileUpload = new FileUploadManager();
    const ui = new UIManager();
    
    let isAdmin = false; // Will be set by userInfo event
    let messages = null; // Will be initialized after socket connects
    let users = null;
    let channels = null;
    let settings = null;
    let profileModal = null;
    let sidebar = null;
    let admin = null;

    // Make managers globally accessible
    window.soundManager = sound;
    window.toastManager = toast;
    window.openProfileModal = null; // Will be set after initialization

    // Start loading screen
    loading.start();
    sound.init();
    theme.apply(theme.getCurrent());

    // Initialize socket connection
    const socketManager = new SocketManager(token, {
      onConnect: () => {
        console.log('✅ Socket connected, requesting initial data...');
        toast.show('Connected to Wyvern!', 'success');
        // Join default channel
        socketManager.emit('joinChannel', 'general');
        loading.hide();
      },
      onError: (error) => {
        toast.show(`Connection failed: ${error.message}`, 'error');
      },
      onDisconnect: (reason) => {
        toast.show('Disconnected from server', 'error');
      },
      onReconnect: (attemptNumber) => {
        toast.show('Reconnected!', 'success');
      }
    });

    // Connect to server
    socketManager.connect().then(socket => {
      // Initialize admin manager first
      admin = new AdminManager(socket, toast);
      
      // Initialize managers that need socket
      messages = new MessageManager(profile, username, isAdmin, admin);
      users = new UserListManager(profile, admin, username);
      channels = new ChannelManager(socket, admin);
      settings = new SettingsManager(theme, sound);
      profileModal = new ProfileModalManager(profile, username);
      sidebar = new SidebarManager(socket, profile, username);
      
      const typing = new TypingManager(socket);
      
      // Make profile modal globally accessible
      window.openProfileModal = (user) => profileModal.open(user);
      
      // Initialize mention manager
      const input = document.getElementById('chat-input');
      if (input) {
        input.dataset.username = username;
        const mentions = new MentionManager(input);
        
        // Setup message sending
        const sendButton = document.getElementById('send-button');
        
        const sendMessage = async () => {
          const text = input.value.trim();
          const hasFiles = fileUpload.hasFiles();
          
          if (!text && !hasFiles) return;
          
          let attachments = [];
          if (hasFiles) {
            try {
              attachments = await fileUpload.upload();
              fileUpload.clear();
            } catch (error) {
              toast.show('Failed to upload files', 'error');
              return;
            }
          }
          
          // Check if we're in DM mode
          if (sidebar && sidebar.isDM() && sidebar.getDMRecipient()) {
            socket.emit("sendDirectMessage", { 
              recipient: sidebar.getDMRecipient(),
              message: text || '',
              attachments: attachments
            });
          } else {
            // Regular channel message
            const extractedMentions = MentionManager.extract(text);
            
            socket.emit("chatMessage", { 
              username, 
              message: text || '',
              mentions: extractedMentions,
              attachments: attachments
            });
          }
          
          input.value = "";
          typing.stop(username);
        };
        
        if (sendButton) {
          sendButton.addEventListener('click', sendMessage);
        }
        
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          } else if (e.key.length === 1 || e.key === 'Backspace') {
            typing.start(username);
          }
        });
        
        input.addEventListener('blur', () => typing.stop(username));
      }
      
      // Setup socket event handlers
      socket.on('typing', (data) => typing.handleRemoteTyping(data, username));
      
      socket.on('userInfo', async (data) => {
        console.log('User info:', data);
        isAdmin = data.isAdmin || false;
        
        // Update admin status in all managers
        if (messages) {
          messages.isAdmin = isAdmin;
        }
        if (admin) {
          admin.setAdmin(isAdmin);
        }
        
        // Update user panel
        const userProfile = await profile.get(username);
        const userPanelAvatar = document.getElementById('userPanelAvatar');
        const userPanelName = document.getElementById('userPanelName');
        const userPanelAdminBadge = document.getElementById('userPanelAdminBadge');
        
        if (userPanelName) {
          userPanelName.textContent = username;
        }
        
        if (userPanelAvatar && userProfile) {
          const avatarHTML = profile.getAvatarHTML(username, userProfile);
          const profileColor = profile.getColor(userProfile);
          
          userPanelAvatar.style.background = profileColor;
          userPanelAvatar.innerHTML = `
            ${avatarHTML}
            <div class="user-panel-status" id="userPanelStatus"></div>
          `;
        }
        
        if (userPanelAdminBadge && isAdmin) {
          userPanelAdminBadge.style.display = 'inline-block';
        }
      });
      
      socket.on('chatMessage', async (data) => {
        console.log('Received message:', data);
        if (messages) {
          await messages.display(data);
          sound.play('message');
        }
      });
      
      socket.on('chatHistory', async (history) => {
        console.log('Received chat history:', history.length, 'messages');
        if (messages) {
          messages.clear();
          for (const msg of history) {
            await messages.display(msg, true);
          }
        }
      });
      
      socket.on('onlineUsers', (userList) => {
        console.log('👥 Online users received:', userList);
        if (users) {
          users.update(userList);
        } else {
          console.error('Users manager not initialized');
        }
      });
      
      socket.on('channelUpdate', (channelList) => {
        console.log('📝 Text channels received:', channelList);
        if (channels) {
          channels.updateList(channelList, 'text');
        } else {
          console.error('Channels manager not initialized');
        }
      });
      
      socket.on('voiceChannelUpdate', (channelList) => {
        console.log('🔊 Voice channels received:', channelList);
        if (channels) {
          channels.updateList(channelList, 'voice');
        } else {
          console.error('Channels manager not initialized');
        }
      });
      
      socket.on('joinedChannel', (channelName) => {
        console.log('Joined channel:', channelName);
        if (channels) {
          channels.currentChannel = channelName;
        }
      });
      
      // Channel deletion handlers
      socket.on('channelDeleted', (channelName) => {
        console.log('Channel deleted:', channelName);
        if (channels && channels.currentChannel === channelName) {
          // Switch to general if current channel was deleted
          socket.emit('joinChannel', 'general');
          channels.switchChannel('general');
        }
      });
      
      socket.on('voiceChannelDeleted', (channelName) => {
        console.log('Voice channel deleted:', channelName);
        // Voice disconnect will be handled by voice module when implemented
      });
      
      // Direct message handlers
      socket.on('directMessage', async (data) => {
        console.log('Received DM:', data);
        if (sidebar && (sidebar.getDMRecipient() === data.sender || sidebar.getDMRecipient() === data.recipient)) {
          await sidebar.displayDirectMessage(data);
        }
        sidebar.updateDMList();
        
        if (data.sender !== username) {
          sound.play('message');
          toast.show(`New message from ${data.sender}`, 'info', 'Direct Message');
        }
      });
      
      socket.on('directMessageHistory', async (data) => {
        console.log('Received DM history:', data.messages.length);
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }
        
        for (const msg of data.messages) {
          await sidebar.displayDirectMessage(msg);
        }
      });
      
      socket.on('conversationsList', (conversations) => {
        console.log('Received conversations:', conversations.length);
        if (sidebar) {
          sidebar.displayConversationsList(conversations);
        }
      });
      
      socket.on('dmRead', (data) => {
        console.log(`${data.username} read your messages`);
      });
      
      // Settings button handler
      const settingsBtn = document.getElementById('userPanelSettings');
      if (settingsBtn && settings) {
        settingsBtn.addEventListener('click', () => settings.open());
      }
      
      // Logout handler
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await fetch("/auth/logout", { method: "POST" });
          sessionStorage.clear();
          localStorage.removeItem("wyvernToken");
          window.location.href = "/b/login.html";
        });
      }
      
    }).catch(error => {
      console.error('Failed to connect:', error);
      toast.show('Failed to connect to server', 'error');
      loading.hide();
    });

  } catch (error) {
    console.error('Chat initialization error:', error);
    // Show error but don't break the page
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ff4444;color:white;padding:16px 24px;border-radius:8px;z-index:9999;';
    errorDiv.textContent = 'Failed to initialize chat: ' + error.message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }
})();
