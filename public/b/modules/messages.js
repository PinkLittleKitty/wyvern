// Message Display and Management
export class MessageManager {
  constructor(profileManager, currentUsername, isAdmin = false) {
    this.profile = profileManager;
    this.currentUsername = currentUsername;
    this.isAdmin = isAdmin;
    this.container = document.getElementById('chat-messages');
  }

  async display(data, isHistoryLoad = false) {
    if (!this.container) return;

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

    // Check if we should group with previous message
    const lastMessage = this.container.lastElementChild;
    const shouldGroup = lastMessage && 
                       lastMessage.dataset.username === data.username &&
                       data.timestamp && lastMessage.dataset.timestamp &&
                       (new Date(data.timestamp) - new Date(lastMessage.dataset.timestamp)) < 300000;

    if (shouldGroup) {
      messageEl.classList.add("grouped");
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

    this.container.appendChild(messageEl);
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
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
