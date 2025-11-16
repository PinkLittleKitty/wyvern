// Message Display and Management
export class MessageManager {
  constructor(profileManager, currentUsername, isAdmin = false, adminManager = null) {
    this.profile = profileManager;
    this.currentUsername = currentUsername;
    this.isAdmin = isAdmin;
    this.admin = adminManager;
    this.container = document.getElementById('chat-messages');
    this.socket = null;
    this.currentChannel = null;
    this.isLoadingOlder = false;
    this.hasMoreMessages = true;
    this.setupDeleteHandler();
    this.setupInfiniteScroll();
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setCurrentChannel(channel) {
    this.currentChannel = channel;
    this.hasMoreMessages = true;
  }

  setupInfiniteScroll() {
    if (!this.container) return;

    this.container.addEventListener('scroll', () => {
      // Check if scrolled to top (with 100px threshold)
      if (this.container.scrollTop < 100 && !this.isLoadingOlder && this.hasMoreMessages) {
        this.loadOlderMessages();
      }
    });
  }

  setAdminManager(adminManager) {
    this.admin = adminManager;
  }

  setupDeleteHandler() {
    if (this.container) {
      this.container.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.message-delete-btn');
        if (deleteBtn) {
          const messageId = deleteBtn.dataset.messageId;
          const messageEl = deleteBtn.closest('.message-container');
          if (this.admin) {
            this.admin.deleteMessage(messageId, messageEl);
          }
        }
      });
    }
  }

  async createMessageElement(data, checkGrouping = true) {
    const messageEl = document.createElement("div");
    messageEl.className = "message-container";
    messageEl.dataset.username = data.username;
    messageEl.dataset.timestamp = data.timestamp;
    messageEl.dataset.messageId = data._id || data.id || '';

    if (data.username === this.currentUsername) {
      messageEl.classList.add("mine");
    }

    const timeStr = data.timestamp
      ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    // Check if we should group with previous message (only when appending)
    if (checkGrouping) {
      const lastMessage = this.container.lastElementChild;
      const shouldGroup = lastMessage && 
                         lastMessage.dataset.username === data.username &&
                         data.timestamp && lastMessage.dataset.timestamp &&
                         (new Date(data.timestamp) - new Date(lastMessage.dataset.timestamp)) < 300000;

      if (shouldGroup) {
        messageEl.classList.add("grouped");
      }
    }

    // Get user profile
    const profile = await this.profile.get(data.username);
    const avatarHTML = this.profile.getAvatarHTML(data.username, profile);
    const profileColor = this.profile.getColor(profile);
    
    const isAdmin = data.isAdmin || false;
    const adminBadge = isAdmin ? '<span class="message-admin-badge">Admin</span>' : '';

    let escapedMessage = this.escapeHtml(data.message);
    escapedMessage = this.highlightMentions(escapedMessage, data.mentions);
    
    const isMentioned = data.mentions && (
      data.mentions.includes(this.currentUsername) || 
      data.mentions.includes('everyone')
    );
    
    if (isMentioned && data.username !== this.currentUsername) {
      messageEl.classList.add('mentioned');
    }

    const canDelete = this.isAdmin || data.username === this.currentUsername;
    const deleteButton = canDelete ? `
      <button class="message-action-btn message-delete-btn" title="Delete Message" data-message-id="${data._id || data.id || ''}">
        <i class="fas fa-trash"></i>
      </button>
    ` : '';

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
          const fileSize = this.formatFileSize(attachment.size);
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
          <span class="message-username">${this.escapeHtml(data.username)}</span>
          ${adminBadge}
          <span class="message-timestamp">${timeStr}</span>
        </div>
        ${escapedMessage ? `<div class="message-text">${escapedMessage}</div>` : ''}
        ${attachmentsHTML}
      </div>
      <div class="message-actions">
        ${deleteButton}
      </div>
    `;

    return messageEl;
  }

  async display(data, isHistoryLoad = false) {
    if (!this.container) return;

    const messageEl = await this.createMessageElement(data, true);
    this.container.appendChild(messageEl);
    
    if (!isHistoryLoad) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.hasMoreMessages = true;
  }

  scrollToBottom() {
    if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  async loadOlderMessages() {
    if (!this.socket || !this.currentChannel || this.isLoadingOlder || !this.hasMoreMessages) {
      return;
    }

    this.isLoadingOlder = true;

    // Show loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-older-messages';
    loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading older messages...';
    this.container.insertBefore(loadingEl, this.container.firstChild);

    // Get timestamp of oldest message
    const firstMessage = this.container.querySelector('.message-container[data-timestamp]');
    const beforeTimestamp = firstMessage ? firstMessage.dataset.timestamp : null;

    // Save scroll position
    const scrollHeight = this.container.scrollHeight;
    const scrollTop = this.container.scrollTop;

    // Request older messages
    this.socket.emit('loadOlderMessages', {
      channel: this.currentChannel,
      before: beforeTimestamp,
      limit: 50
    });

    // Listen for response (one-time listener)
    const handleOlderMessages = async (data) => {
      loadingEl.remove();
      
      if (data.messages && data.messages.length > 0) {
        // Prepend messages
        for (const msg of data.messages) {
          await this.displayPrepend(msg);
        }

        // Restore scroll position (maintain user's view)
        const newScrollHeight = this.container.scrollHeight;
        this.container.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
      }

      this.hasMoreMessages = data.hasMore;
      this.isLoadingOlder = false;

      // Remove listener
      this.socket.off('olderMessages', handleOlderMessages);
    };

    this.socket.on('olderMessages', handleOlderMessages);
  }

  async displayPrepend(data) {
    // Similar to display() but prepends instead of appends
    if (!this.container) return;

    const messageEl = await this.createMessageElement(data, false);
    
    // Find first message container (skip loading indicators)
    const firstMessage = this.container.querySelector('.message-container');
    if (firstMessage) {
      this.container.insertBefore(messageEl, firstMessage);
    } else {
      this.container.appendChild(messageEl);
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  highlightMentions(text, mentions) {
    if (!mentions || mentions.length === 0) return text;
    
    mentions.forEach(mention => {
      const regex = new RegExp(`@${mention}\\b`, 'gi');
      text = text.replace(regex, `<span class="mention">@${mention}</span>`);
    });
    
    return text;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
