// User List Manager
export class UserListManager {
  constructor(profileManager) {
    this.profile = profileManager;
    this.usersList = document.getElementById('usersList');
    this.usersCount = document.getElementById('usersCount');
  }

  async update(users) {
    if (!this.usersList) return;

    this.usersList.innerHTML = '';
    
    if (this.usersCount) {
      this.usersCount.textContent = users.length;
    }

    for (const user of users) {
      const profile = await this.profile.get(user.username);
      const userEl = document.createElement('div');
      userEl.className = 'user-item';
      userEl.dataset.username = user.username;

      const avatarHTML = this.profile.getAvatarHTML(user.username, profile);
      const profileColor = this.profile.getColor(profile);
      
      const statusClass = user.status || 'online';
      const adminBadge = user.isAdmin ? '<span class="user-admin-badge">ADMIN</span>' : '';

      userEl.innerHTML = `
        <div class="user-avatar" style="background: ${profileColor};">
          ${avatarHTML}
          <div class="user-status ${statusClass}"></div>
        </div>
        <div class="user-info">
          <div class="user-name">${this.escapeHtml(user.username)}</div>
          ${adminBadge}
        </div>
      `;

      userEl.addEventListener('click', () => {
        if (window.openProfileModal) {
          window.openProfileModal(user.username);
        }
      });

      this.usersList.appendChild(userEl);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
