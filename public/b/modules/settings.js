// Settings Modal Manager
export class SettingsManager {
  constructor(themeManager, soundManager) {
    this.theme = themeManager;
    this.sound = soundManager;
    this.modal = document.getElementById('settingsModal');
    this.voiceManager = null; // Will be set externally
    this.init();
  }

  setVoiceManager(voiceManager) {
    this.voiceManager = voiceManager;
    this.loadVoicePreferences();
  }

  loadVoicePreferences() {
    // Load saved volume preferences
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

    // Load saved local mutes
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

    // Save volume preferences
    const volumes = {};
    this.voiceManager.userVolumes.forEach((volume, username) => {
      volumes[username] = volume;
    });
    localStorage.setItem('wyvernUserVolumes', JSON.stringify(volumes));

    // Save local mutes
    const mutes = Array.from(this.voiceManager.localMutedUsers);
    localStorage.setItem('wyvernLocalMutes', JSON.stringify(mutes));
  }

  init() {
    // Close button
    const closeBtn = document.getElementById('closeSettingsBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Settings navigation
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Initialize all settings
    this.initThemeSettings();
    this.initNotificationSettings();
    this.initVoiceSettings();
    this.initPrivacySettings();
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
    // Update nav
    document.querySelectorAll('.settings-nav-item').forEach(nav => {
      nav.classList.toggle('active', nav.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.id === `${tabName}-tab`);
    });
  }

  initThemeSettings() {
    const themeOptions = document.querySelectorAll('.theme-option');
    const currentTheme = this.theme.getCurrent();

    themeOptions.forEach(option => {
      if (option.dataset.theme === currentTheme) {
        option.classList.add('selected');
      }

      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        themeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.theme.apply(theme);
      });
    });

    // Compact mode
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
}
