export class AdminManager {
  constructor(socket, toastManager) {
    this.socket = socket;
    this.toast = toastManager;
    this.isAdmin = false;
    this.channelModal = document.getElementById('channelModal');
    this.deleteModal = document.getElementById('deleteModal');
    this.channelToDelete = null;
    this.channelTypeToDelete = null;
    
    this.init();
  }

  init() {
    this.setupChannelModal();
    this.setupDeleteModal();
    this.setupSocketHandlers();
  }

  setAdmin(isAdmin) {
    this.isAdmin = isAdmin;
    this.updateAdminUI();
  }

  updateAdminUI() {
    // Show/hide add channel buttons
    const addTextBtn = document.getElementById('addTextChannelBtn');
    const addVoiceBtn = document.getElementById('addVoiceChannelBtn');
    
    if (addTextBtn) {
      addTextBtn.style.display = this.isAdmin ? 'flex' : 'none';
      if (this.isAdmin && !addTextBtn.hasAttribute('data-listener')) {
        addTextBtn.addEventListener('click', () => this.openChannelModal('text'));
        addTextBtn.setAttribute('data-listener', 'true');
      }
    }
    
    if (addVoiceBtn) {
      addVoiceBtn.style.display = this.isAdmin ? 'flex' : 'none';
      if (this.isAdmin && !addVoiceBtn.hasAttribute('data-listener')) {
        addVoiceBtn.addEventListener('click', () => this.openChannelModal('voice'));
        addVoiceBtn.setAttribute('data-listener', 'true');
      }
    }
  }

  setupChannelModal() {
    const cancelBtn = document.getElementById('cancelChannel');
    const createBtn = document.getElementById('createChannel');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeChannelModal());
    }
    
    if (createBtn) {
      createBtn.addEventListener('click', () => this.createChannel());
    }
    
    if (this.channelModal) {
      this.channelModal.addEventListener('click', (e) => {
        if (e.target === this.channelModal) {
          this.closeChannelModal();
        }
      });
    }
  }

  setupDeleteModal() {
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeDeleteModal());
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmDelete());
    }
    
    if (this.deleteModal) {
      this.deleteModal.addEventListener('click', (e) => {
        if (e.target === this.deleteModal) {
          this.closeDeleteModal();
        }
      });
    }
  }

  setupSocketHandlers() {
    this.socket.on('success', (message) => {
      this.toast.show(message, 'success');
    });
    
    this.socket.on('error', (message) => {
      this.toast.show(message, 'error');
    });
  }

  openChannelModal(type = 'text') {
    if (!this.isAdmin) return;
    
    const channelType = document.getElementById('channelType');
    const channelName = document.getElementById('channelName');
    const channelDescription = document.getElementById('channelDescription');
    
    if (channelType) channelType.value = type;
    if (channelName) channelName.value = '';
    if (channelDescription) channelDescription.value = '';
    
    if (this.channelModal) {
      this.channelModal.classList.add('show');
      if (channelName) channelName.focus();
    }
  }

  closeChannelModal() {
    if (this.channelModal) {
      this.channelModal.classList.remove('show');
    }
  }

  createChannel() {
    if (!this.isAdmin) return;
    
    const channelType = document.getElementById('channelType');
    const channelName = document.getElementById('channelName');
    const channelDescription = document.getElementById('channelDescription');
    
    const type = channelType?.value || 'text';
    const name = channelName?.value.trim();
    const description = channelDescription?.value.trim();
    
    if (!name) {
      this.toast.show('Channel name is required', 'error');
      return;
    }
    
    // Validate channel name (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      this.toast.show('Channel name can only contain letters, numbers, hyphens, and underscores', 'error');
      return;
    }
    
    this.socket.emit('createChannel', {
      type: type,
      name: name,
      description: description || 'No description'
    });
    
    this.closeChannelModal();
  }

  openDeleteModal(channelName, channelType) {
    if (!this.isAdmin) return;
    
    if (channelType === 'text' && channelName === 'general') {
      this.toast.show('Cannot delete the general channel', 'error');
      return;
    }
    
    this.channelToDelete = channelName;
    this.channelTypeToDelete = channelType;
    
    const deleteChannelName = document.getElementById('deleteChannelName');
    if (deleteChannelName) {
      deleteChannelName.textContent = `#${channelName}`;
    }
    
    if (this.deleteModal) {
      this.deleteModal.classList.add('show');
    }
  }

  closeDeleteModal() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove('show');
    }
    this.channelToDelete = null;
    this.channelTypeToDelete = null;
  }

  confirmDelete() {
    if (!this.isAdmin || !this.channelToDelete) return;
    
    this.socket.emit('deleteChannel', {
      name: this.channelToDelete,
      type: this.channelTypeToDelete
    });
    
    this.closeDeleteModal();
  }

  addDeleteButton(channelEl, channelName, channelType) {
    if (!this.isAdmin) return;
    if (channelType === 'text' && channelName === 'general') return;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-channel-btn';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.title = 'Delete Channel';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDeleteModal(channelName, channelType);
    });
    
    // Add to channel actions container or create one
    let actionsContainer = channelEl.querySelector('.channel-actions');
    if (!actionsContainer) {
      actionsContainer = document.createElement('div');
      actionsContainer.className = 'channel-actions';
      channelEl.appendChild(actionsContainer);
    }
    
    actionsContainer.appendChild(deleteBtn);
  }

  deleteMessage(messageId, messageEl) {
    if (!this.isAdmin || !messageId) return;
    
    if (confirm('Are you sure you want to delete this message?')) {
      this.socket.emit('deleteMessage', { messageId });
      
      if (messageEl) {
        messageEl.classList.add('removing');
        setTimeout(() => messageEl.remove(), 300);
      }
    }
  }

  kickFromVoice(targetUsername) {
    if (!this.isAdmin) return;
    
    if (confirm(`Kick ${targetUsername} from voice channel?`)) {
      this.socket.emit('kickFromVoice', { username: targetUsername });
    }
  }

  disconnectUser(targetUsername) {
    if (!this.isAdmin) return;
    
    if (confirm(`Disconnect ${targetUsername} from the server?`)) {
      this.socket.emit('disconnectUser', { username: targetUsername });
    }
  }

  showUserContextMenu(event, user, currentUsername) {
    if (!this.isAdmin || user.username === currentUsername) return;
    
    event.preventDefault();
    
    const menu = document.createElement('div');
    menu.className = 'admin-context-menu';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    menu.innerHTML = `
      <div class="context-menu-header">Admin Actions: ${this.escapeHtml(user.username)}</div>
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

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        if (action === 'kick-voice') {
          this.kickFromVoice(user.username);
        } else if (action === 'disconnect') {
          this.disconnectUser(user.username);
        }
        menu.remove();
      });
    });

    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 10);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
