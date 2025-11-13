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
    if (banner && profileData.banner) {
      banner.style.backgroundImage = `url(${profileData.banner})`;
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

    // Set about
    const about = document.getElementById('profileAbout');
    if (about) {
      about.textContent = profileData.bio || 'No bio set';
    }

    // Set custom status
    const customStatus = document.getElementById('profileCustomStatus');
    if (customStatus) {
      customStatus.textContent = profileData.customStatus || 'No status set';
    }

    // Set profile color preview
    const colorPreview = document.getElementById('profileColorPreview');
    if (colorPreview) {
      colorPreview.style.background = profileData.profileColor || '#8b5cf6';
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

    // Show/hide edit buttons
    const editButtons = document.querySelectorAll('.profile-edit-btn, .profile-avatar-edit, .profile-banner-edit');
    editButtons.forEach(btn => {
      btn.style.display = this.isOwnProfile ? 'flex' : 'none';
    });
  }
}
