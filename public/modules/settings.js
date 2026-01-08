export class SettingsManager {
  constructor(themeManager, soundManager) {
    this.theme = themeManager;
    this.sound = soundManager;
    this.modal = document.getElementById('settingsModal');
    this.voiceManager = null; 
    this.socket = null;
    this.isAdmin = false;
    this.init();
  }
  setSocket(socket) {
    this.socket = socket;
  }
  setAdmin(isAdmin) {
    this.isAdmin = isAdmin;
    const adminNavItem = document.getElementById('adminNavItem');
    if (adminNavItem) {
      adminNavItem.style.display = isAdmin ? 'flex' : 'none';
    }
  }
  setVoiceManager(voiceManager) {
    this.voiceManager = voiceManager;
    this.loadVoicePreferences();
  }
  loadVoicePreferences() {
    const savedVolumes = localStorage.getItem('wyvernUserVolumes');
    if (savedVolumes && this.voiceManager) {
      try {
        const volumes = JSON.parse(savedVolumes);
        Object.entries(volumes).forEach(([username, volume]) => {
          this.voiceManager.userVolumes.set(username, volume);
        });
        console.log('✅ Loaded saved volume preferences');
      } catch (e) {
        console.error('Failed to load volume preferences:', e);
      }
    }
    const savedMutes = localStorage.getItem('wyvernLocalMutes');
    if (savedMutes && this.voiceManager) {
      try {
        const mutes = JSON.parse(savedMutes);
        mutes.forEach(username => {
          this.voiceManager.localMutedUsers.add(username);
        });
        console.log('✅ Loaded saved local mutes');
      } catch (e) {
        console.error('Failed to load local mutes:', e);
      }
    }
  }
  saveVoicePreferences() {
    if (!this.voiceManager) return;
    const volumes = {};
    this.voiceManager.userVolumes.forEach((volume, username) => {
      volumes[username] = volume;
    });
    localStorage.setItem('wyvernUserVolumes', JSON.stringify(volumes));
    const mutes = Array.from(this.voiceManager.localMutedUsers);
    localStorage.setItem('wyvernLocalMutes', JSON.stringify(mutes));
  }
  init() {
    const closeBtn = document.getElementById('closeSettingsBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });
    this.initThemeSettings();
    this.initNotificationSettings();
    this.initVoiceSettings();
    this.initPrivacySettings();
    this.initAccountSettings();
    this.initAdminPanel();
  }
  open() {
    if (this.modal) {
      this.modal.classList.add('show');
    }
  }
  close() {
    if (this.modal) {
      this.modal.classList.remove('show');
    }
  }
  switchTab(tabName) {
    document.querySelectorAll('.settings-nav-item').forEach(nav => {
      nav.classList.toggle('active', nav.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.id === `${tabName}-tab`);
    });
  }
  initThemeSettings() {
    const themeOptions = document.querySelectorAll('.theme-option');
    const currentTheme = this.theme.getCurrent();
    const customThemeBuilder = document.getElementById('customThemeBuilder');
    themeOptions.forEach(option => {
      if (option.dataset.theme === currentTheme) {
        option.classList.add('selected');
      }
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        themeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.theme.apply(theme);
        if (customThemeBuilder) {
          customThemeBuilder.style.display = theme === 'custom' ? 'block' : 'none';
        }
      });
    });
    if (currentTheme === 'custom' && customThemeBuilder) {
      customThemeBuilder.style.display = 'block';
    }
    this.initCustomThemeBuilder();
    const layoutOptions = document.querySelectorAll('.layout-option');
    const currentLayout = localStorage.getItem('wyvernLayout') || 'discord';
    const customLayoutEditor = document.getElementById('customLayoutEditor');
    document.body.setAttribute('data-layout', currentLayout);
    const customSidebarWidth = localStorage.getItem('wyvernCustomSidebarWidth') || '330';
    const customUsersWidth = localStorage.getItem('wyvernCustomUsersWidth') || '250';
    const savedPanelOrder = JSON.parse(localStorage.getItem('wyvernCustomPanelOrder') || '["sidebar", "chat", "users"]');
    if (currentLayout === 'custom') {
      const widths = {
        sidebar: `${customSidebarWidth}px`,
        chat: '1fr',
        users: customUsersWidth === '0' ? '0' : `${customUsersWidth}px`
      };
      const gridTemplate = savedPanelOrder.map(id => widths[id]).join(' ');
      const gridAreas = savedPanelOrder.join(' ');
      document.body.style.gridTemplateColumns = gridTemplate;
      document.body.style.gridTemplateAreas = `"${gridAreas}"`;
      const sidebarEl = document.querySelector('.sidebar-container');
      const chatEl = document.querySelector('.chat-area');
      const usersEl = document.querySelector('.users-panel');
      if (sidebarEl) sidebarEl.style.gridArea = 'sidebar';
      if (chatEl) chatEl.style.gridArea = 'chat';
      if (usersEl) usersEl.style.gridArea = 'users';
      if (customUsersWidth === '0') {
        document.body.classList.add('users-panel-hidden');
      }
      if (customLayoutEditor) {
        customLayoutEditor.style.display = 'block';
      }
    }
    layoutOptions.forEach(option => {
      if (option.dataset.layout === currentLayout) {
        option.classList.add('selected');
      }
      option.addEventListener('click', () => {
        const layout = option.dataset.layout;
        layoutOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        document.body.setAttribute('data-layout', layout);
        localStorage.setItem('wyvernLayout', layout);
        if (customLayoutEditor) {
          customLayoutEditor.style.display = layout === 'custom' ? 'block' : 'none';
        }
        const layoutNames = {
          'discord': 'Discord',
          'teamspeak': 'TeamSpeak',
          'compact': 'Compact',
          'slack': 'Slack',
          'irc': 'IRC Classic',
          'custom': 'Custom (wip)'
        };
        if (window.toastManager) {
          window.toastManager.show(`Layout changed to ${layoutNames[layout]}`, 'success');
        }
      });
    });
    const customSidebarSlider = document.getElementById('customSidebarWidth');
    const customUsersSlider = document.getElementById('customUsersWidth');
    const customSidebarValue = document.getElementById('customSidebarValue');
    const customUsersValue = document.getElementById('customUsersValue');
    const previewSidebar = document.getElementById('previewSidebar');
    const previewChat = document.getElementById('previewChat');
    const previewUsers = document.getElementById('previewUsers');
    const livePreview = document.getElementById('livePreview');
    const panelArrangement = document.getElementById('panelArrangement');
    const applyCustomBtn = document.getElementById('applyCustomLayout');
    const resetCustomBtn = document.getElementById('resetCustomLayout');
    let panelOrder = JSON.parse(localStorage.getItem('wyvernCustomPanelOrder') || '["sidebar", "chat", "users"]');
    if (customSidebarSlider && customUsersSlider && panelArrangement) {
      customSidebarSlider.value = customSidebarWidth;
      customUsersSlider.value = customUsersWidth;
      customSidebarValue.textContent = `${customSidebarWidth}px`;
      customUsersValue.textContent = customUsersWidth === '0' ? 'Hidden' : `${customUsersWidth}px`;
      const updateArrangement = () => {
        const panels = Array.from(panelArrangement.children);
        panels.sort((a, b) => {
          return panelOrder.indexOf(a.dataset.panel) - panelOrder.indexOf(b.dataset.panel);
        });
        panels.forEach(panel => panelArrangement.appendChild(panel));
        panels.forEach((panel, index) => {
          const leftBtn = panel.querySelector('[data-direction="left"]');
          const rightBtn = panel.querySelector('[data-direction="right"]');
          leftBtn.disabled = index === 0;
          rightBtn.disabled = index === panels.length - 1;
        });
      };
      const updatePreview = () => {
        const sidebarW = parseInt(customSidebarSlider.value);
        const usersW = parseInt(customUsersSlider.value);
        customSidebarValue.textContent = `${sidebarW}px`;
        customUsersValue.textContent = usersW === 0 ? 'Hidden' : `${usersW}px`;
        const previewPanels = [previewSidebar, previewChat, previewUsers];
        const orderedPanels = panelOrder.map(id => {
          if (id === 'sidebar') return previewSidebar;
          if (id === 'chat') return previewChat;
          if (id === 'users') return previewUsers;
        });
        orderedPanels.forEach(panel => livePreview.appendChild(panel));
        const total = 1000;
        const sidebarPercent = (sidebarW / total) * 100;
        const usersPercent = (usersW / total) * 100;
        const chatPercent = 100 - sidebarPercent - usersPercent;
        previewSidebar.style.width = `${sidebarPercent}%`;
        previewChat.style.width = `${chatPercent}%`;
        previewUsers.style.width = usersW === 0 ? '0' : `${usersPercent}%`;
        previewUsers.style.display = usersW === 0 ? 'none' : 'flex';
      };
      panelArrangement.addEventListener('click', (e) => {
        const btn = e.target.closest('.panel-move-btn');
        if (!btn) return;
        const panelItem = btn.closest('.panel-item');
        const panelId = panelItem.dataset.panel;
        const direction = btn.dataset.direction;
        const currentIndex = panelOrder.indexOf(panelId);
        if (direction === 'left' && currentIndex > 0) {
          [panelOrder[currentIndex], panelOrder[currentIndex - 1]] =
            [panelOrder[currentIndex - 1], panelOrder[currentIndex]];
        } else if (direction === 'right' && currentIndex < panelOrder.length - 1) {
          [panelOrder[currentIndex], panelOrder[currentIndex + 1]] =
            [panelOrder[currentIndex + 1], panelOrder[currentIndex]];
        }
        updateArrangement();
        updatePreview();
      });
      customSidebarSlider.addEventListener('input', updatePreview);
      customUsersSlider.addEventListener('input', updatePreview);
      updateArrangement();
      updatePreview();
      if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', () => {
          const sidebarW = customSidebarSlider.value;
          const usersW = customUsersSlider.value;
          localStorage.setItem('wyvernCustomSidebarWidth', sidebarW);
          localStorage.setItem('wyvernCustomUsersWidth', usersW);
          localStorage.setItem('wyvernCustomPanelOrder', JSON.stringify(panelOrder));
          const widths = {
            sidebar: `${sidebarW}px`,
            chat: '1fr',
            users: usersW === '0' ? '0' : `${usersW}px`
          };
          const gridTemplate = panelOrder.map(id => widths[id]).join(' ');
          const gridAreas = panelOrder.join(' ');
          document.body.style.gridTemplateColumns = gridTemplate;
          document.body.style.gridTemplateAreas = `"${gridAreas}"`;
          const sidebarEl = document.querySelector('.sidebar-container');
          const chatEl = document.querySelector('.chat-area');
          const usersEl = document.querySelector('.users-panel');
          if (sidebarEl) sidebarEl.style.gridArea = 'sidebar';
          if (chatEl) chatEl.style.gridArea = 'chat';
          if (usersEl) usersEl.style.gridArea = 'users';
          if (usersW === '0') {
            document.body.classList.add('users-panel-hidden');
          } else {
            document.body.classList.remove('users-panel-hidden');
          }
          if (window.toastManager) {
            window.toastManager.show('Custom layout applied!', 'success');
          }
        });
      }
      if (resetCustomBtn) {
        resetCustomBtn.addEventListener('click', () => {
          customSidebarSlider.value = 330;
          customUsersSlider.value = 250;
          panelOrder = ['sidebar', 'chat', 'users'];
          updateArrangement();
          updatePreview();
          localStorage.setItem('wyvernCustomSidebarWidth', '330');
          localStorage.setItem('wyvernCustomUsersWidth', '250');
          localStorage.setItem('wyvernCustomPanelOrder', JSON.stringify(panelOrder));
          document.body.style.gridTemplateColumns = '330px 1fr 250px';
          document.body.style.gridTemplateAreas = '"sidebar chat users"';
          const sidebarEl = document.querySelector('.sidebar-container');
          const chatEl = document.querySelector('.chat-area');
          const usersEl = document.querySelector('.users-panel');
          if (sidebarEl) sidebarEl.style.gridArea = 'sidebar';
          if (chatEl) chatEl.style.gridArea = 'chat';
          if (usersEl) usersEl.style.gridArea = 'users';
          document.body.classList.remove('users-panel-hidden');
          if (window.toastManager) {
            window.toastManager.show('Custom layout reset to Discord defaults', 'info');
          }
        });
      }
    }
    const compactMode = document.getElementById('compactMode');
    if (compactMode) {
      const isCompact = localStorage.getItem('wyvernCompactMode') === 'true';
      compactMode.checked = isCompact;
      if (isCompact) document.body.classList.add('compact-mode');
      compactMode.addEventListener('change', () => {
        document.body.classList.toggle('compact-mode', compactMode.checked);
        localStorage.setItem('wyvernCompactMode', compactMode.checked);
      });
    }
  }
  initNotificationSettings() {
    const desktopNotif = document.getElementById('desktopNotifications');
    const soundNotif = document.getElementById('notificationSounds');
    const mentionNotif = document.getElementById('mentionNotifications');
    if (desktopNotif) {
      desktopNotif.checked = localStorage.getItem('wyvernDesktopNotifications') !== 'false';
      desktopNotif.addEventListener('change', () => {
        localStorage.setItem('wyvernDesktopNotifications', desktopNotif.checked);
        if (desktopNotif.checked) Notification.requestPermission();
      });
    }
    if (soundNotif) {
      soundNotif.checked = localStorage.getItem('wyvernNotificationSounds') !== 'false';
      soundNotif.addEventListener('change', () => {
        localStorage.setItem('wyvernNotificationSounds', soundNotif.checked);
      });
    }
    if (mentionNotif) {
      mentionNotif.checked = localStorage.getItem('wyvernMentionNotifications') !== 'false';
      mentionNotif.addEventListener('change', () => {
        localStorage.setItem('wyvernMentionNotifications', mentionNotif.checked);
      });
    }
  }
  initVoiceSettings() {
    const inputVolume = document.getElementById('inputVolume');
    const inputVolumeValue = document.getElementById('inputVolumeValue');
    const soundEffects = document.getElementById('soundEffects');
    const soundVolume = document.getElementById('soundVolume');
    const soundVolumeValue = document.getElementById('soundVolumeValue');
    const testSound = document.getElementById('testSound');
    if (inputVolume && inputVolumeValue) {
      inputVolume.addEventListener('input', () => {
        inputVolumeValue.textContent = `${inputVolume.value}%`;
      });
    }
    if (soundEffects) {
      soundEffects.checked = this.sound.enabled;
      soundEffects.addEventListener('change', () => {
        this.sound.setEnabled(soundEffects.checked);
        if (soundEffects.checked) this.sound.play('notification');
      });
    }
    if (soundVolume && soundVolumeValue) {
      soundVolume.value = this.sound.volume * 100;
      soundVolumeValue.textContent = `${Math.round(this.sound.volume * 100)}%`;
      soundVolume.addEventListener('input', () => {
        const volume = soundVolume.value / 100;
        this.sound.setVolume(volume);
        soundVolumeValue.textContent = `${soundVolume.value}%`;
      });
    }
    if (testSound) {
      testSound.addEventListener('click', () => {
        this.sound.play('notification');
      });
    }
  }
  initPrivacySettings() {
    const allowDMs = document.getElementById('allowDMs');
    const showActivity = document.getElementById('showActivity');
    if (allowDMs) {
      allowDMs.checked = localStorage.getItem('wyvernAllowDMs') !== 'false';
      allowDMs.addEventListener('change', () => {
        localStorage.setItem('wyvernAllowDMs', allowDMs.checked);
      });
    }
    if (showActivity) {
      showActivity.checked = localStorage.getItem('wyvernShowActivity') !== 'false';
      showActivity.addEventListener('change', () => {
        localStorage.setItem('wyvernShowActivity', showActivity.checked);
      });
    }
  }
  initAccountSettings() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const statusDiv = document.getElementById('passwordChangeStatus');
        statusDiv.innerHTML = '';
        if (!currentPassword || !newPassword || !confirmPassword) {
          statusDiv.innerHTML = '<div class="password-status error">❌ Please fill in all fields</div>';
          return;
        }
        if (newPassword !== confirmPassword) {
          statusDiv.innerHTML = '<div class="password-status error">❌ New passwords do not match</div>';
          return;
        }
        if (newPassword.length < 3) {
          statusDiv.innerHTML = '<div class="password-status error">❌ Password must be at least 3 characters long</div>';
          return;
        }
        changePasswordBtn.disabled = true;
        changePasswordBtn.textContent = 'Changing...';
        try {
          const token = localStorage.getItem('wyvernToken') || sessionStorage.getItem('wyvernToken');
          const response = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
          });
          const data = await response.json();
          if (response.ok) {
            statusDiv.innerHTML = '<div class="password-status success">✅ Password changed successfully!</div>';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            if (window.toastManager) {
              window.toastManager.show('Password changed successfully', 'success');
            }
          } else {
            statusDiv.innerHTML = `<div class="password-status error">❌ ${data.error || 'Failed to change password'}</div>`;
          }
        } catch (error) {
          console.error('Password change error:', error);
          statusDiv.innerHTML = '<div class="password-status error">❌ Network error. Please try again.</div>';
        }
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = 'Change Password';
      });
    }
  }
  initCustomThemeBuilder() {
    const accentPicker = document.getElementById('customAccent');
    const bgPicker = document.getElementById('customBg');
    const sidebarPicker = document.getElementById('customSidebar');
    const textPicker = document.getElementById('customText');
    const accentHex = document.getElementById('customAccentHex');
    const bgHex = document.getElementById('customBgHex');
    const sidebarHex = document.getElementById('customSidebarHex');
    const textHex = document.getElementById('customTextHex');
    const preview = document.getElementById('customThemePreview');
    const applyBtn = document.getElementById('applyCustomTheme');
    const resetBtn = document.getElementById('resetCustomTheme');
    const savedTheme = JSON.parse(localStorage.getItem('wyvernCustomTheme') || '{}');
    if (savedTheme.accent) accentPicker.value = accentHex.value = savedTheme.accent;
    if (savedTheme.bg) bgPicker.value = bgHex.value = savedTheme.bg;
    if (savedTheme.sidebar) sidebarPicker.value = sidebarHex.value = savedTheme.sidebar;
    if (savedTheme.text) textPicker.value = textHex.value = savedTheme.text;
    const syncPickers = (picker, hex) => {
      picker.addEventListener('input', () => {
        hex.value = picker.value;
        this.updatePreview();
      });
      hex.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(hex.value)) {
          picker.value = hex.value;
          this.updatePreview();
        }
      });
    };
    syncPickers(accentPicker, accentHex);
    syncPickers(bgPicker, bgHex);
    syncPickers(sidebarPicker, sidebarHex);
    syncPickers(textPicker, textHex);
    this.updatePreview = () => {
      if (preview) {
        preview.style.setProperty('--accent', accentPicker.value);
        preview.style.setProperty('--bg', bgPicker.value);
        preview.style.setProperty('--sidebar', sidebarPicker.value);
        preview.style.setProperty('--text', textPicker.value);
      }
    };
    this.updatePreview();
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const customTheme = {
          accent: accentPicker.value,
          bg: bgPicker.value,
          sidebar: sidebarPicker.value,
          text: textPicker.value
        };
        localStorage.setItem('wyvernCustomTheme', JSON.stringify(customTheme));
        this.theme.apply('custom');
        if (window.toastManager) {
          window.toastManager.show('Custom theme applied!', 'success');
        }
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        accentPicker.value = accentHex.value = '#8b5cf6';
        bgPicker.value = bgHex.value = '#0a0a0f';
        sidebarPicker.value = sidebarHex.value = '#13131a';
        textPicker.value = textHex.value = '#e4e4e7';
        this.updatePreview();
        if (window.toastManager) {
          window.toastManager.show('Theme reset to defaults', 'info');
        }
      });
    }
  }
  initAdminPanel() {
    const refreshBtn = document.getElementById('adminRefreshStats');
    const broadcastBtn = document.getElementById('adminBroadcastMessage');
    const resetPasswordBtn = document.getElementById('adminResetPasswordBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadAdminStats());
    }
    if (broadcastBtn) {
      broadcastBtn.addEventListener('click', () => this.broadcastMessage());
    }
    if (resetPasswordBtn) {
      resetPasswordBtn.addEventListener('click', () => this.resetUserPassword());
    }
  }
  async loadAdminStats() {
    if (!this.isAdmin || !this.socket) return;
    try {
      const token = localStorage.getItem('wyvernToken') || sessionStorage.getItem('wyvernToken');
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const stats = await response.json();
        document.getElementById('adminTotalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('adminOnlineUsers').textContent = stats.onlineUsers || 0;
        document.getElementById('adminTotalMessages').textContent = stats.totalMessages || 0;
        document.getElementById('adminTotalChannels').textContent = stats.totalChannels || 0;
      }
      const usersResponse = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const users = Array.isArray(data) ? data : (data.users || []);
        this.displayAdminUsers(users);
      }
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  }
  displayAdminUsers(users) {
    const userList = document.getElementById('adminUserList');
    if (!userList) return;
    if (!Array.isArray(users)) {
      console.error('displayAdminUsers: users is not an array', users);
      userList.innerHTML = '<div class="admin-loading">Error loading users</div>';
      return;
    }
    if (users.length === 0) {
      userList.innerHTML = '<div class="admin-loading">No users found</div>';
      return;
    }
    userList.innerHTML = users.map(user => `
      <div class="admin-user-item">
        <div class="admin-user-info">
          <div class="admin-user-avatar">${user.username.charAt(0).toUpperCase()}</div>
          <div class="admin-user-details">
            <div class="admin-user-name">
              ${this.escapeHtml(user.username)}
              ${user.isAdmin ? '<span style="color: #fbbf24; margin-left: 6px;">★</span>' : ''}
            </div>
            <div class="admin-user-status ${user.online ? 'online' : ''}">
              <i class="fas fa-circle"></i>
              ${user.online ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <div class="admin-user-actions">
          ${!user.isAdmin ? `
            <button class="admin-user-action-btn danger" onclick="window.adminKickUser('${this.escapeHtml(user.username)}')">
              <i class="fas fa-sign-out-alt"></i> Kick
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
  broadcastMessage() {
    const message = prompt('Enter broadcast message:');
    if (message && message.trim()) {
      if (this.socket) {
        this.socket.emit('broadcastMessage', { message: message.trim() });
        if (window.toastManager) {
          window.toastManager.show('Broadcast sent!', 'success');
        }
      }
    }
  }
  async resetUserPassword() {
    const usernameInput = document.getElementById('adminResetUsername');
    const passwordInput = document.getElementById('adminNewPassword');
    const statusDiv = document.getElementById('adminResetStatus');
    const targetUsername = usernameInput?.value.trim();
    const newPassword = passwordInput?.value;
    if (!targetUsername || !newPassword) {
      statusDiv.innerHTML = '<div class="password-status error">❌ Please fill in both fields</div>';
      return;
    }
    if (newPassword.length < 3) {
      statusDiv.innerHTML = '<div class="password-status error">❌ Password must be at least 3 characters</div>';
      return;
    }
    try {
      const token = localStorage.getItem('wyvernToken') || sessionStorage.getItem('wyvernToken');
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: targetUsername, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        statusDiv.innerHTML = '<div class="password-status success">✅ Password reset successfully!</div>';
        usernameInput.value = '';
        passwordInput.value = '';
        if (window.toastManager) {
          window.toastManager.show(`Password reset for ${targetUsername}`, 'success');
        }
      } else {
        statusDiv.innerHTML = `<div class="password-status error">❌ ${data.error || 'Failed to reset password'}</div>`;
      }
    } catch (error) {
      console.error('Password reset error:', error);
      statusDiv.innerHTML = '<div class="password-status error">❌ Network error</div>';
    }
  }
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
