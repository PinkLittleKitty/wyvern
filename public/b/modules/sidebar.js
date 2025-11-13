// Sidebar and Navigation Manager
export class SidebarManager {
  constructor(socket, profileManager, currentUsername) {
    this.socket = socket;
    this.profile = profileManager;
    this.currentUsername = currentUsername;
    this.currentView = 'channels';
    this.isDMMode = false;
    this.currentDMRecipient = null;
    this.init();
  }

  init() {
    // Home button - switch to channels view
    const homeBtn = document.getElementById('homeButton');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => this.switchToChannels());
    }

    // DM button - switch to DMs view
    const dmBtn = document.getElementById('dmButton');
    if (dmBtn) {
      dmBtn.addEventListener('click', () => this.switchToDMs());
    }

    // DM search
    const dmSearch = document.getElementById('dmSearch');
    if (dmSearch) {
      dmSearch.addEventListener('input', (e) => this.filterDMs(e.target.value));
    }

    // Start in channels view
    this.switchToChannels();
  }

  switchToChannels() {
    this.currentView = 'channels';
    this.isDMMode = false;
    this.currentDMRecipient = null;

    // Update UI
    document.body.removeAttribute('data-dm-mode');
    document.getElementById('channelsView').style.display = 'block';
    document.getElementById('dmView').style.display = 'none';
    document.getElementById('homeButton').classList.add('active');
    document.getElementById('dmButton').classList.remove('active');

    // Switch to general channel
    this.socket.emit('joinChannel', 'general');

    // Update header
    const header = document.getElementById('currentChannel');
    if (header) header.textContent = 'general';

    // Update input
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = 'Message #general';
      input.disabled = false;
    }

    // Close mobile menus
    this.closeMobileMenus();
  }

  switchToDMs() {
    this.currentView = 'dms';

    // Update UI
    document.getElementById('channelsView').style.display = 'none';
    document.getElementById('dmView').style.display = 'block';
    document.getElementById('homeButton').classList.remove('active');
    document.getElementById('dmButton').classList.add('active');

    // Update header
    const header = document.getElementById('currentChannel');
    if (header) {
      header.innerHTML = '<i class="fas fa-user"></i> Direct Messages';
    }

    // Show welcome message if no DM selected
    if (!this.currentDMRecipient) {
      this.showDMWelcome();
    }

    // Load DM data
    this.updateDMList();
    this.updateOnlineUsers();

    this.closeMobileMenus();
  }

  showDMWelcome() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="dm-welcome">
          <i class="fas fa-user-friends"></i>
          <h3>Select a conversation or start a new one</h3>
          <p>Choose from your existing conversations or click on a user to start chatting</p>
        </div>
      `;
    }

    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = 'Select a conversation to start messaging';
      input.disabled = true;
    }
  }

  async openDMConversation(targetUsername) {
    this.isDMMode = true;
    this.currentDMRecipient = targetUsername;
    document.body.setAttribute('data-dm-mode', 'true');

    // Update header
    const header = document.getElementById('currentChannel');
    if (header) {
      header.innerHTML = `<i class="fas fa-user"></i> @${targetUsername}`;
    }

    // Update input
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = `Message @${targetUsername}`;
      input.disabled = false;
      input.focus();
    }

    // Update active DM in list
    document.querySelectorAll('.dm-item').forEach(item => {
      item.classList.toggle('active', item.dataset.username === targetUsername);
    });

    // Request DM history
    this.socket.emit('getDirectMessages', { recipient: targetUsername });

    // Mark as read
    this.socket.emit('markDMRead', { sender: targetUsername });

    this.closeMobileMenus();
  }

  updateDMList() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('getConversations');
    }
  }

  async updateOnlineUsers() {
    const container = document.getElementById('dmOnlineUsers');
    const countEl = document.getElementById('onlineCount');
    if (!container) return;

    // Get online users from the main user list
    const onlineUsers = Array.from(document.querySelectorAll('#usersList .user-item'))
      .map(el => el.dataset.username)
      .filter(name => name && name !== this.currentUsername);

    if (countEl) {
      countEl.textContent = onlineUsers.length;
    }

    container.innerHTML = '';

    for (const user of onlineUsers) {
      const profile = await this.profile.get(user);
      const userEl = document.createElement('div');
      userEl.className = 'dm-user-item';
      userEl.dataset.username = user;

      const avatarHTML = this.profile.getAvatarHTML(user, profile);
      const profileColor = this.profile.getColor(profile);

      userEl.innerHTML = `
        <div class="dm-avatar" style="background: ${profileColor};">
          ${avatarHTML}
          <div class="dm-status online"></div>
        </div>
        <div class="dm-username">${this.escapeHtml(user)}</div>
      `;

      userEl.addEventListener('click', () => {
        this.openDMConversation(user);
      });

      container.appendChild(userEl);
    }
  }

  async displayConversationsList(conversations) {
    const dmList = document.getElementById('dmList');
    if (!dmList) return;

    dmList.innerHTML = '';

    for (const conv of conversations) {
      const lastMsg = conv.lastMessage;
      const otherUser = lastMsg.sender === this.currentUsername ? lastMsg.recipient : lastMsg.sender;

      const profile = await this.profile.get(otherUser);
      const avatarHTML = this.profile.getAvatarHTML(otherUser, profile);
      const profileColor = this.profile.getColor(profile);

      const dmItem = document.createElement('div');
      dmItem.className = 'dm-item';
      dmItem.dataset.username = otherUser;

      if (this.currentDMRecipient === otherUser) {
        dmItem.classList.add('active');
      }

      const unreadBadge = conv.unreadCount > 0 ? `<span class="dm-unread-badge">${conv.unreadCount}</span>` : '';
      const preview = lastMsg.message ? lastMsg.message.substring(0, 30) + (lastMsg.message.length > 30 ? '...' : '') : 'Attachment';

      dmItem.innerHTML = `
        <div class="dm-avatar" style="background: ${profileColor};">
          ${avatarHTML}
        </div>
        <div class="dm-info">
          <div class="dm-username">${this.escapeHtml(otherUser)}</div>
          <div class="dm-preview">${this.escapeHtml(preview)}</div>
        </div>
        ${unreadBadge}
      `;

      dmItem.addEventListener('click', () => {
        this.openDMConversation(otherUser);
      });

      dmList.appendChild(dmItem);
    }
  }

  async displayDirectMessage(data) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'message-container dm-message';
    messageEl.dataset.username = data.sender;
    messageEl.dataset.timestamp = data.timestamp;

    if (data.sender === this.currentUsername) {
      messageEl.classList.add('mine');
    }

    const timeStr = data.timestamp
      ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    const profile = await this.profile.get(data.sender);
    const avatarHTML = this.profile.getAvatarHTML(data.sender, profile);
    const profileColor = this.profile.getColor(profile);

    let escapedMessage = this.escapeHtml(data.message);
    escapedMessage = escapedMessage.replace(/\n/g, '<br>');

    let attachmentsHTML = '';
    if (data.attachments && data.attachments.length > 0) {
      attachmentsHTML = '<div class="message-attachments">';
      data.attachments.forEach(attachment => {
        const isImage = attachment.mimetype.startsWith('image/');
        if (isImage) {
          attachmentsHTML += `
            <div class="message-attachment">
              <img src="${attachment.url}" alt="${attachment.originalName}" onclick="openLightbox('${attachment.url}')" />
            </div>
          `;
        } else {
          attachmentsHTML += `
            <a href="${attachment.url}" download="${attachment.originalName}" class="message-file">
              <div class="message-file-icon"><i class="fas fa-file"></i></div>
              <div class="message-file-info">
                <div class="message-file-name">${attachment.originalName}</div>
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
          <span class="message-username">${this.escapeHtml(data.sender)}</span>
          <span class="message-timestamp">${timeStr}</span>
        </div>
        ${escapedMessage ? `<div class="message-text">${escapedMessage}</div>` : ''}
        ${attachmentsHTML}
      </div>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  filterDMs(query) {
    const dmItems = document.querySelectorAll('.dm-item, .dm-user-item');
    const lowerQuery = query.toLowerCase();

    dmItems.forEach(item => {
      const username = item.dataset.username.toLowerCase();
      const matches = username.includes(lowerQuery);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  closeMobileMenus() {
    document.body.classList.remove('sidebar-visible');
    document.body.classList.remove('users-panel-visible');
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Getters for other modules
  isDM() {
    return this.isDMMode;
  }

  getDMRecipient() {
    return this.currentDMRecipient;
  }
}
