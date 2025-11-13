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
    
    let isAdmin = false; // Will be set by userInfo event
    let messages = null; // Will be initialized after socket connects
    let users = null;
    let channels = null;

    // Make sound manager globally accessible
    window.soundManager = sound;

    // Start loading screen
    loading.start();
    sound.init();
    theme.apply(theme.getCurrent());

    // Initialize socket connection
    const socketManager = new SocketManager(token, {
      onConnect: () => {
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
      // Initialize managers that need socket
      messages = new MessageManager(profile, username, isAdmin);
      users = new UserListManager(profile);
      channels = new ChannelManager(socket);
      
      const typing = new TypingManager(socket);
      
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
          
          const extractedMentions = MentionManager.extract(text);
          
          socket.emit("chatMessage", { 
            username, 
            message: text || '',
            mentions: extractedMentions,
            attachments: attachments
          });
          
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
        if (messages) {
          messages.isAdmin = isAdmin;
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
      
      socket.on('onlineUsers', async (userList) => {
        console.log('Online users:', userList.length);
        if (users) {
          await users.update(userList);
        }
      });
      
      socket.on('channelUpdate', (channelList) => {
        console.log('Text channels:', channelList.length);
        if (channels) {
          channels.updateList(channelList, 'text');
        }
      });
      
      socket.on('voiceChannelUpdate', (channelList) => {
        console.log('Voice channels:', channelList.length);
        if (channels) {
          channels.updateList(channelList, 'voice');
        }
      });
      
      socket.on('joinedChannel', (channelName) => {
        console.log('Joined channel:', channelName);
        if (channels) {
          channels.currentChannel = channelName;
        }
      });
      
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
