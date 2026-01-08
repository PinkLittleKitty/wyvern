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
    console.log('🔧 SidebarManager initializing...');
    const homeBtn = document.getElementById('homeButton');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => this.switchToChannels());
      console.log('  ✅ Home button found');
    } else {
      console.warn('  ❌ Home button not found');
    }
    const dmBtn = document.getElementById('dmButton');
    if (dmBtn) {
      dmBtn.addEventListener('click', () => this.switchToDMs());
      console.log('  ✅ DM button found');
    } else {
      console.warn('  ❌ DM button not found');
    }
    const dmSearch = document.getElementById('dmSearch');
    if (dmSearch) {
      dmSearch.addEventListener('input', (e) => this.filterDMs(e.target.value));
    }
    console.log('🔧 Switching to channels view...');
    this.switchToChannels();
  }
  switchToChannels() {
    console.log('🏠 Switching to channels view');
    this.currentView = 'channels';
    this.isDMMode = false;
    this.currentDMRecipient = null;
    document.body.removeAttribute('data-dm-mode');
    const channelsView = document.getElementById('channelsView');
    const dmView = document.getElementById('dmView');
    const homeBtn = document.getElementById('homeButton');
    const dmBtn = document.getElementById('dmButton');
    if (channelsView) {
      channelsView.style.display = 'block';
      console.log('  ✅ channelsView shown');
    } else {
      console.error('  ❌ channelsView not found!');
    }
    if (dmView) {
      dmView.style.display = 'none';
    }
    if (homeBtn) {
      homeBtn.classList.add('active');
    }
    if (dmBtn) {
      dmBtn.classList.remove('active');
    }
    this.socket.emit('joinChannel', 'general');
    const header = document.getElementById('currentChannel');
    if (header) header.textContent = 'general';
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = 'Message #general';
      input.disabled = false;
    }
    this.closeMobileMenus();
  }
  switchToDMs() {
    this.currentView = 'dms';
    document.getElementById('channelsView').style.display = 'none';
    document.getElementById('dmView').style.display = 'block';
    document.getElementById('homeButton').classList.remove('active');
    document.getElementById('dmButton').classList.add('active');
    const header = document.getElementById('currentChannel');
    if (header) {
      header.innerHTML = '<i class="fas fa-user"></i> Direct Messages';
    }
    if (!this.currentDMRecipient) {
      this.showDMWelcome();
    }
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
    const header = document.getElementById('currentChannel');
    if (header) {
      header.innerHTML = `<i class="fas fa-user"></i> @${targetUsername}`;
    }
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = `Message @${targetUsername}`;
      input.disabled = false;
      input.focus();
    }
    document.querySelectorAll('.dm-item').forEach(item => {
      item.classList.toggle('active', item.dataset.username === targetUsername);
    });
    this.socket.emit('getDirectMessages', { recipient: targetUsername });
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
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      dmItems.forEach(item => {
        item.style.display = 'flex';
      });
      return;
    }
    let visibleCount = 0;
    dmItems.forEach(item => {
      const username = item.dataset.username?.toLowerCase() || '';
      let messagePreview = '';
      if (item.classList.contains('dm-item')) {
        const previewEl = item.querySelector('.dm-preview');
        messagePreview = previewEl?.textContent?.toLowerCase() || '';
      }
      const matches = username.includes(lowerQuery) || messagePreview.includes(lowerQuery);
      if (matches) {
        item.style.display = 'flex';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    this.updateDMSearchResults(visibleCount, lowerQuery);
  }
  updateDMSearchResults(count, query) {
    const dmList = document.getElementById('dmList');
    const dmOnlineUsers = document.getElementById('dmOnlineUsers');
    const existingMsg = document.querySelector('.dm-no-results');
    if (existingMsg) existingMsg.remove();
    if (count === 0 && query) {
      const noResults = document.createElement('div');
      noResults.className = 'dm-no-results';
      noResults.innerHTML = `
        <div class="dm-no-results-icon">🔍</div>
        <div class="dm-no-results-text">No matches found for "${this.escapeHtml(query)}"</div>
        <div class="dm-no-results-hint">Try a different search term</div>
      `;
      if (dmList && dmList.children.length > 0) {
        dmList.appendChild(noResults);
      } else if (dmOnlineUsers) {
        dmOnlineUsers.appendChild(noResults);
      }
    }
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
  isDM() {
    return this.isDMMode;
  }
  getDMRecipient() {
    return this.currentDMRecipient;
  }
}
