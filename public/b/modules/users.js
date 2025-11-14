// User List Manager
export class UserListManager {
  constructor(profileManager, adminManager = null, currentUsername = null) {
    this.profile = profileManager;
    this.admin = adminManager;
    this.currentUsername = currentUsername;
    this.usersList = document.getElementById('usersList');
    this.usersCount = document.getElementById('usersCount');
    
    console.log('👥 UserListManager initialized');
    console.log('  usersList:', this.usersList ? '✅ Found' : '❌ Not found');
    console.log('  usersCount:', this.usersCount ? '✅ Found' : '❌ Not found');
  }

  setAdminManager(adminManager) {
    this.admin = adminManager;
  }

  setCurrentUsername(username) {
    this.currentUsername = username;
  }

  update(users) {
    console.log('👥 UserListManager.update called with', users.length, 'users');
    
    if (!this.usersList) {
      console.error('❌ usersList element not found!');
      return;
    }

    console.log('✅ usersList element found, updating...');
    this.usersList.innerHTML = '';
    
    if (this.usersCount) {
      this.usersCount.textContent = users.length;
    }

    // Render users immediately without waiting for profiles
    users.forEach(user => {
      try {
        console.log('  📝 Adding user:', user.username);
        
        const userEl = document.createElement('div');
        userEl.className = 'user-item';
        userEl.dataset.username = user.username;

        // Use default values first, load profile async
        const statusClass = user.voiceChannel ? 'in-voice' : 'online';
        const statusText = user.voiceChannel ? `<i class="fas fa-volume-up"></i> ${user.voiceChannel}` : 'Online';
        const adminBadge = user.isAdmin ? '<span class="user-item-badge">ADMIN</span>' : '';
        const defaultColor = '#8b5cf6';
        const defaultAvatar = user.username.charAt(0).toUpperCase();

        userEl.innerHTML = `
          <div class="user-item-avatar" style="background: ${defaultColor};">
            ${defaultAvatar}
            <div class="user-item-status ${statusClass}"></div>
          </div>
          <div class="user-item-info">
            <div class="user-item-name">
              ${this.escapeHtml(user.username)}
              ${adminBadge}
            </div>
            <div class="user-item-status-text">${statusText}</div>
          </div>
        `;

        userEl.addEventListener('click', () => {
          if (window.openProfileModal) {
            window.openProfileModal(user.username);
          }
        });

        // Add admin context menu for other users
        if (this.admin && this.admin.isAdmin && user.username !== this.currentUsername) {
          userEl.addEventListener('contextmenu', (e) => {
            this.admin.showUserContextMenu(e, user, this.currentUsername);
          });
        }

        this.usersList.appendChild(userEl);
        console.log('  ✅ Added user to DOM:', user.username);
        
        // Load profile async and update avatar/color
        this.profile.get(user.username).then(profile => {
          if (profile) {
            const avatar = userEl.querySelector('.user-item-avatar');
            if (avatar) {
              avatar.style.background = this.profile.getColor(profile);
              avatar.innerHTML = this.profile.getAvatarHTML(user.username, profile) + 
                                `<div class="user-item-status ${statusClass}"></div>`;
            }
          }
        }).catch(err => console.error('Profile load error:', err));
        
      } catch (error) {
        console.error('  ❌ Error adding user:', user.username, error);
      }
    });
    
    console.log('✅ UserList update complete. Total users in DOM:', this.usersList.children.length);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
