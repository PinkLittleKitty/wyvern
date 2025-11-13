// UI Utilities and Helpers
export class UIManager {
  constructor() {
    this.initMobileMenu();
    this.initUsersPanelToggle();
    this.initImageLightbox();
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
        document.body.classList.remove('sidebar-visible');
      });
    }
  }

  initUsersPanelToggle() {
    const toggleBtn = document.getElementById('toggleUsersBtn');
    const usersPanel = document.getElementById('usersPanel');

    if (toggleBtn && usersPanel) {
      toggleBtn.addEventListener('click', () => {
        usersPanel.classList.toggle('hidden');
        toggleBtn.classList.toggle('active');
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
