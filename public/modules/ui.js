// UI Utilities and Helpers
export class UIManager {
  constructor() {
    this.initMobileMenu();
    this.initUsersPanelToggle();
    this.initImageLightbox();
    this.initUserPanelClick();
  }

  initUserPanelClick() {
    const userPanelInfo = document.querySelector('.user-panel-info');
    if (userPanelInfo) {
      userPanelInfo.addEventListener('click', () => {
        const username = sessionStorage.getItem('wyvernUsername');
        if (window.openProfileModal && username) {
          window.openProfileModal(username);
        }
      });
    }
  }

  initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('mobileOverlay');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-visible');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeMobileMenus();
      });
    }
  }

  closeMobileMenus() {
    document.body.classList.remove('sidebar-visible');
    document.body.classList.remove('users-panel-visible');
    
    const toggleUsersBtn = document.getElementById('toggleUsersBtn');
    if (toggleUsersBtn && window.innerWidth <= 800) {
      toggleUsersBtn.classList.remove('active');
    }
  }

  initUsersPanelToggle() {
    const toggleBtn = document.getElementById('toggleUsersBtn');

    if (toggleBtn) {
      // Check localStorage for saved state
      const usersPanelHidden = localStorage.getItem('usersPanelHidden') === 'true';
      if (usersPanelHidden) {
        document.body.classList.add('users-panel-hidden');
      } else {
        toggleBtn.classList.add('active');
      }

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Check if mobile or desktop
        const isMobile = window.innerWidth <= 800;
        
        if (isMobile) {
          // Mobile: toggle users-panel-visible
          const isVisible = document.body.classList.contains('users-panel-visible');
          if (isVisible) {
            document.body.classList.remove('users-panel-visible');
            toggleBtn.classList.remove('active');
          } else {
            document.body.classList.add('users-panel-visible');
            document.body.classList.remove('sidebar-visible');
            toggleBtn.classList.add('active');
          }
        } else {
          // Desktop: toggle users-panel-hidden
          document.body.classList.toggle('users-panel-hidden');
          toggleBtn.classList.toggle('active');
          
          // Save state to localStorage
          const isHidden = document.body.classList.contains('users-panel-hidden');
          localStorage.setItem('usersPanelHidden', isHidden);
        }
      });
    }
  }

  initImageLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeBtn = document.getElementById('lightboxClose');

    window.openLightbox = (imageUrl) => {
      if (lightbox && lightboxImage) {
        lightboxImage.src = imageUrl;
        lightbox.classList.add('show');
      }
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (lightbox) lightbox.classList.remove('show');
      });
    }

    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
          lightbox.classList.remove('show');
        }
      });
    }
  }

  showContextMenu(x, y, username, isAdmin) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    // Position menu
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('show');

    // Update header
    const header = document.getElementById('contextMenuHeader');
    if (header) {
      header.textContent = `${username}`;
    }

    // Show/hide admin options
    const adminOptions = [
      'contextServerMute',
      'contextServerDeafen',
      'contextKickVoice',
      'contextBanUser',
      'contextAdminSeparator'
    ];

    adminOptions.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = isAdmin ? 'flex' : 'none';
      }
    });

    // Close on click outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('show');
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 10);
  }

  hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
      menu.classList.remove('show');
    }
  }

  updateChannelPlaceholder(channelName) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = `Message #${channelName}`;
    }
  }

  scrollToBottom(containerId = 'chat-messages') {
    const container = document.getElementById(containerId);
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notifEnabled = localStorage.getItem('wyvernDesktopNotifications') !== 'false';
      if (notifEnabled) {
        new Notification(title, {
          body: body,
          icon: '/wyvernLogo.png'
        });
      }
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}
