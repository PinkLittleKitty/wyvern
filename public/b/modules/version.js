// Simple Version Indicator
export class VersionManager {
  constructor(toast) {
    this.toast = toast;
    this.currentBuild = null;
    this.indicator = null;
    this.init();
  }

  async init() {
    await this.fetchVersion();
    this.createIndicator();
    this.startChecking();
  }

  async fetchVersion() {
    try {
      const response = await fetch('/api/version');
      const data = await response.json();
      
      if (!this.currentBuild) {
        // First load
        this.currentBuild = data.build;
        console.log('📦 Build:', data.build);
        this.updateIndicatorDisplay();
      } else if (data.build !== this.currentBuild) {
        // New version detected!
        this.notifyUpdate(data);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch version:', error);
      return null;
    }
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.className = 'version-indicator';
    this.indicator.title = 'Build number';
    
    // Show build number if we have it, otherwise show loading
    const buildText = this.currentBuild ? `#${this.currentBuild}` : 'Loading...';
    this.indicator.innerHTML = `<i class="fas fa-code-branch"></i> <span>${buildText}</span>`;
    
    this.indicator.addEventListener('click', () => {
      if (this.indicator.classList.contains('update-available')) {
        window.location.reload();
      }
    });
    document.body.appendChild(this.indicator);
  }

  updateIndicatorDisplay() {
    if (this.indicator && this.currentBuild) {
      const span = this.indicator.querySelector('span');
      if (span) {
        span.textContent = `#${this.currentBuild}`;
      }
    }
  }

  notifyUpdate(newVersion) {
    console.log('🎉 New version available!');
    
    this.toast.show(
      'A new version is available!<br><strong>Click the version indicator to refresh.</strong>',
      'warning',
      '🎉 Update Available',
      0
    );

    if (this.indicator) {
      this.indicator.classList.add('update-available');
      this.indicator.title = 'Update available! Click to refresh';
    }

    this.currentBuild = newVersion.build;
  }

  startChecking() {
    // Check every 10 seconds
    setInterval(() => {
      this.fetchVersion();
    }, 10000);
  }
}
