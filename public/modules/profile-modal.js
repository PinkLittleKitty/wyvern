// Profile Modal Manager
export class ProfileModalManager {
  constructor(profileManager, currentUsername) {
    this.profile = profileManager;
    this.currentUsername = currentUsername;
    this.modal = document.getElementById('profileModal');
    this.currentUser = null;
    this.isOwnProfile = false;
    this.init();
  }

  init() {
    const closeBtn = document.getElementById('closeProfileBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    this.setupEditHandlers();
  }

  setupEditHandlers() {
    // Edit About
    const editAboutBtn = document.getElementById('editAboutBtn');
    const saveAboutBtn = document.getElementById('saveAboutBtn');
    const cancelAboutBtn = document.getElementById('cancelAboutBtn');
    
    if (editAboutBtn) {
      editAboutBtn.addEventListener('click', () => {
        document.getElementById('profileAbout').style.display = 'none';
        document.getElementById('profileAboutEdit').style.display = 'block';
        document.getElementById('aboutEditActions').style.display = 'flex';
      });
    }
    
    if (saveAboutBtn) {
      saveAboutBtn.addEventListener('click', async () => {
        const bio = document.getElementById('profileAboutEdit').value;
        await this.updateProfile('bio', bio);
        document.getElementById('profileAbout').textContent = bio || 'No bio set';
        document.getElementById('profileAbout').style.display = 'block';
        document.getElementById('profileAboutEdit').style.display = 'none';
        document.getElementById('aboutEditActions').style.display = 'none';
      });
    }
    
    if (cancelAboutBtn) {
      cancelAboutBtn.addEventListener('click', () => {
        document.getElementById('profileAbout').style.display = 'block';
        document.getElementById('profileAboutEdit').style.display = 'none';
        document.getElementById('aboutEditActions').style.display = 'none';
      });
    }

    // Edit Status
    const editStatusBtn = document.getElementById('editStatusBtn');
    const saveStatusBtn = document.getElementById('saveStatusBtn');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    
    if (editStatusBtn) {
      editStatusBtn.addEventListener('click', () => {
        document.getElementById('profileCustomStatus').style.display = 'none';
        document.getElementById('profileCustomStatusEdit').style.display = 'block';
        document.getElementById('statusEditActions').style.display = 'flex';
      });
    }
    
    if (saveStatusBtn) {
      saveStatusBtn.addEventListener('click', async () => {
        const customStatus = document.getElementById('profileCustomStatusEdit').value;
        await this.updateProfile('customStatus', customStatus);
        document.getElementById('profileCustomStatus').textContent = customStatus || 'No status set';
        document.getElementById('profileCustomStatus').style.display = 'block';
        document.getElementById('profileCustomStatusEdit').style.display = 'none';
        document.getElementById('statusEditActions').style.display = 'none';
      });
    }
    
    if (cancelStatusBtn) {
      cancelStatusBtn.addEventListener('click', () => {
        document.getElementById('profileCustomStatus').style.display = 'block';
        document.getElementById('profileCustomStatusEdit').style.display = 'none';
        document.getElementById('statusEditActions').style.display = 'none';
      });
    }

    // Edit Color
    const editColorBtn = document.getElementById('editColorBtn');
    const saveColorBtn = document.getElementById('saveColorBtn');
    const cancelColorBtn = document.getElementById('cancelColorBtn');
    
    if (editColorBtn) {
      editColorBtn.addEventListener('click', () => {
        document.getElementById('profileColorPreview').style.display = 'none';
        document.getElementById('profileColorEdit').style.display = 'block';
      });
    }
    
    if (saveColorBtn) {
      saveColorBtn.addEventListener('click', async () => {
        const profileColor = document.getElementById('profileColorPicker').value;
        await this.updateProfile('profileColor', profileColor);
        document.getElementById('profileColorPreview').style.background = profileColor;
        document.getElementById('profileColorPreview').style.display = 'block';
        document.getElementById('profileColorEdit').style.display = 'none';
      });
    }
    
    if (cancelColorBtn) {
      cancelColorBtn.addEventListener('click', () => {
        document.getElementById('profileColorPreview').style.display = 'block';
        document.getElementById('profileColorEdit').style.display = 'none';
      });
    }

    // Avatar upload
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    
    if (editAvatarBtn && avatarInput) {
      editAvatarBtn.addEventListener('click', () => {
        avatarInput.click();
      });
      
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('files', file);
        
        try {
          const token = sessionStorage.getItem('wyvernToken');
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const data = await response.json();
          const avatarUrl = data.files[0].url;
          
          await this.updateProfile('avatar', avatarUrl);
          
          // Update display
          const avatarImage = document.getElementById('profileAvatarImage');
          const avatarLetter = document.getElementById('profileAvatarLetter');
          if (avatarImage) {
            avatarImage.src = avatarUrl;
            avatarImage.style.display = 'block';
          }
          if (avatarLetter) {
            avatarLetter.style.display = 'none';
          }
        } catch (error) {
          console.error('Avatar upload error:', error);
          this.showToast('Failed to upload avatar', 'error');
        }
        
        avatarInput.value = '';
      });
    }

    // Banner upload
    const editBannerBtn = document.getElementById('editBannerBtn');
    const bannerInput = document.getElementById('bannerInput');
    
    if (editBannerBtn && bannerInput) {
      editBannerBtn.addEventListener('click', () => {
        bannerInput.click();
      });
      
      bannerInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('files', file);
        
        try {
          const token = sessionStorage.getItem('wyvernToken');
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const data = await response.json();
          const bannerUrl = data.files[0].url;
          
          await this.updateProfile('banner', bannerUrl);
          
          // Update display
          const banner = document.getElementById('profileBanner');
          if (banner) {
            banner.style.backgroundImage = `url(${bannerUrl})`;
          }
        } catch (error) {
          console.error('Banner upload error:', error);
          this.showToast('Failed to upload banner', 'error');
        }
        
        bannerInput.value = '';
      });
    }
  }

  async updateProfile(field, value) {
    try {
      const token = sessionStorage.getItem('wyvernToken');
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Clear cache for this user
      this.profile.clear(this.currentUsername);
      
      this.showToast('Profile updated!', 'success');
      
      // Reload profile to get fresh data
      await this.load(this.currentUsername);
    } catch (error) {
      console.error('Profile update error:', error);
      this.showToast('Failed to update profile', 'error');
    }
  }

  showToast(message, type) {
    // Use global toast if available
    if (window.toastManager) {
      window.toastManager.show(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  async open(targetUsername) {
    this.currentUser = targetUsername;
    this.isOwnProfile = targetUsername === this.currentUsername;

    if (this.modal) {
      this.modal.classList.add('show');
      await this.load(targetUsername);
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('show');
    }
  }

  async load(targetUsername) {
    try {
      const token = sessionStorage.getItem('wyvernToken');
      const response = await fetch(`/api/profile/${targetUsername}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load profile');

      const profileData = await response.json();
      this.display(profileData);
    } catch (error) {
      console.error('Profile load error:', error);
    }
  }

  display(profileData) {
    // Set title
    const title = document.getElementById('profileModalTitle');
    if (title) {
      title.textContent = `${profileData.username}'s Profile`;
    }

    // Set banner
    const banner = document.getElementById('profileBanner');
    if (banner) {
      if (profileData.banner) {
        banner.style.backgroundImage = `url(${profileData.banner})`;
      } else {
        banner.style.backgroundImage = '';
      }
    }

    // Set avatar
    const avatar = document.getElementById('profileAvatar');
    const avatarLetter = document.getElementById('profileAvatarLetter');
    const avatarImage = document.getElementById('profileAvatarImage');
    
    if (profileData.avatar) {
      if (avatarImage) {
        avatarImage.src = profileData.avatar;
        avatarImage.style.display = 'block';
      }
      if (avatarLetter) avatarLetter.style.display = 'none';
    } else {
      if (avatarLetter) {
        avatarLetter.textContent = profileData.username.charAt(0).toUpperCase();
        avatarLetter.style.display = 'flex';
      }
      if (avatarImage) avatarImage.style.display = 'none';
    }

    // Set profile color
    if (avatar && profileData.profileColor) {
      avatar.style.background = profileData.profileColor;
    }

    // Set username
    const username = document.getElementById('profileUsername');
    if (username) {
      username.textContent = profileData.username;
    }

    // Set status
    const status = document.getElementById('profileStatus');
    if (status) {
      status.textContent = profileData.status || 'Online';
    }

    // Set about (both display and edit field)
    const about = document.getElementById('profileAbout');
    const aboutEdit = document.getElementById('profileAboutEdit');
    if (about) {
      about.textContent = profileData.bio || 'No bio set';
    }
    if (aboutEdit) {
      aboutEdit.value = profileData.bio || '';
    }

    // Set custom status (both display and edit field)
    const customStatus = document.getElementById('profileCustomStatus');
    const customStatusEdit = document.getElementById('profileCustomStatusEdit');
    if (customStatus) {
      customStatus.textContent = profileData.customStatus || 'No status set';
    }
    if (customStatusEdit) {
      customStatusEdit.value = profileData.customStatus || '';
    }

    // Set profile color preview and picker
    const colorPreview = document.getElementById('profileColorPreview');
    const colorPicker = document.getElementById('profileColorPicker');
    const profileColor = profileData.profileColor || '#8b5cf6';
    if (colorPreview) {
      colorPreview.style.background = profileColor;
    }
    if (colorPicker) {
      colorPicker.value = profileColor;
    }

    // Set member since
    const memberSince = document.getElementById('profileMemberSince');
    if (memberSince && profileData.createdAt) {
      const date = new Date(profileData.createdAt);
      memberSince.textContent = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Reset edit states (hide all edit fields)
    document.getElementById('profileAbout').style.display = 'block';
    document.getElementById('profileAboutEdit').style.display = 'none';
    document.getElementById('aboutEditActions').style.display = 'none';
    
    document.getElementById('profileCustomStatus').style.display = 'block';
    document.getElementById('profileCustomStatusEdit').style.display = 'none';
    document.getElementById('statusEditActions').style.display = 'none';
    
    document.getElementById('profileColorPreview').style.display = 'block';
    document.getElementById('profileColorEdit').style.display = 'none';

    // Show/hide edit buttons
    const editButtons = document.querySelectorAll('.profile-edit-btn, .profile-avatar-edit, .profile-banner-edit');
    editButtons.forEach(btn => {
      btn.style.display = this.isOwnProfile ? 'flex' : 'none';
    });
  }
}
