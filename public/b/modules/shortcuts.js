// Keyboard Shortcuts Manager
export class ShortcutsManager {
  constructor() {
    this.shortcuts = new Map();
    this.modal = null;
    this.init();
  }

  init() {
    this.registerShortcuts();
    this.attachListeners();
    this.populateKeybindsTab();
  }

  registerShortcuts() {
    // Navigation
    this.shortcuts.set('Ctrl+K', {
      description: 'Quick Switcher',
      action: () => this.showQuickSwitcher(),
      category: 'Navigation'
    });

    // Voice
    this.shortcuts.set('Ctrl+Shift+M', {
      description: 'Toggle Mute',
      action: () => this.toggleMute(),
      category: 'Voice'
    });

    this.shortcuts.set('Ctrl+Shift+D', {
      description: 'Toggle Deafen',
      action: () => this.toggleDeafen(),
      category: 'Voice'
    });

    // UI
    this.shortcuts.set('Ctrl+/', {
      description: 'Open Settings (Keybinds)',
      action: () => this.openKeybindsSettings(),
      category: 'UI'
    });

    this.shortcuts.set('Escape', {
      description: 'Close Modal / Mark as Read',
      action: () => this.handleEscape(),
      category: 'UI'
    });

    this.shortcuts.set('Ctrl+,', {
      description: 'Open Settings',
      action: () => this.openSettings(),
      category: 'UI'
    });

    // Channel Navigation
    this.shortcuts.set('Alt+ArrowUp', {
      description: 'Previous Channel',
      action: () => this.navigateChannel(-1),
      category: 'Navigation'
    });

    this.shortcuts.set('Alt+ArrowDown', {
      description: 'Next Channel',
      action: () => this.navigateChannel(1),
      category: 'Navigation'
    });

    // Text Formatting (when input is focused)
    this.shortcuts.set('Ctrl+B', {
      description: 'Bold Text',
      action: (e) => this.formatText(e, '**'),
      category: 'Text Formatting',
      inputOnly: true
    });

    this.shortcuts.set('Ctrl+I', {
      description: 'Italic Text',
      action: (e) => this.formatText(e, '*'),
      category: 'Text Formatting',
      inputOnly: true
    });

    this.shortcuts.set('Ctrl+U', {
      description: 'Underline Text',
      action: (e) => this.formatText(e, '__'),
      category: 'Text Formatting',
      inputOnly: true
    });
  }

  attachListeners() {
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyCombo(e);
      const shortcut = this.shortcuts.get(key);

      if (shortcut) {
        // Check if it's input-only and we're not in an input
        const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
        
        if (shortcut.inputOnly && !isInput) {
          return;
        }

        if (!shortcut.inputOnly && isInput && !['Escape', 'Ctrl+/', 'Ctrl+K'].includes(key)) {
          return; // Don't trigger non-input shortcuts when typing
        }

        e.preventDefault();
        shortcut.action(e);
      }
    });
  }

  getKeyCombo(e) {
    const parts = [];
    
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    let key = e.key;
    
    // Normalize key names
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    else if (key === 'ArrowUp') key = 'ArrowUp';
    else if (key === 'ArrowDown') key = 'ArrowDown';
    else if (key === 'ArrowLeft') key = 'ArrowLeft';
    else if (key === 'ArrowRight') key = 'ArrowRight';
    
    parts.push(key);
    
    return parts.join('+');
  }

  // Actions
  showQuickSwitcher() {
    // Create quick switcher modal
    let switcher = document.getElementById('quickSwitcher');
    if (!switcher) {
      switcher = this.createQuickSwitcher();
    }
    switcher.classList.add('show');
    switcher.querySelector('input').focus();
  }

  createQuickSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'quickSwitcher';
    switcher.className = 'modal';
    switcher.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h3 style="margin-bottom: 16px;">Quick Switcher</h3>
        <input type="text" id="quickSwitcherInput" placeholder="Search channels..." 
          style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--sidebar-dark); color: var(--text); margin-bottom: 12px;" />
        <div id="quickSwitcherResults" style="max-height: 300px; overflow-y: auto;"></div>
      </div>
    `;
    document.body.appendChild(switcher);

    const input = switcher.querySelector('#quickSwitcherInput');
    const results = switcher.querySelector('#quickSwitcherResults');

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase();
      const channels = Array.from(document.querySelectorAll('.channel'));
      
      results.innerHTML = '';
      
      channels
        .filter(ch => ch.textContent.toLowerCase().includes(query))
        .slice(0, 10)
        .forEach(ch => {
          const result = document.createElement('div');
          result.className = 'quick-switcher-result';
          result.textContent = ch.textContent;
          result.style.cssText = 'padding: 10px; cursor: pointer; border-radius: 6px; margin-bottom: 4px;';
          result.addEventListener('mouseenter', () => result.style.background = 'var(--hover-bg)');
          result.addEventListener('mouseleave', () => result.style.background = 'transparent');
          result.addEventListener('click', () => {
            ch.click();
            switcher.classList.remove('show');
          });
          results.appendChild(result);
        });
    });

    switcher.addEventListener('click', (e) => {
      if (e.target === switcher) {
        switcher.classList.remove('show');
      }
    });

    return switcher;
  }

  toggleMute() {
    const muteBtn = document.getElementById('userPanelMute');
    if (muteBtn) {
      muteBtn.click();
      this.showToast('Mute toggled');
    }
  }

  toggleDeafen() {
    const deafenBtn = document.getElementById('userPanelDeafen');
    if (deafenBtn) {
      deafenBtn.click();
      this.showToast('Deafen toggled');
    }
  }

  handleEscape() {
    // Close any open modals
    const modals = document.querySelectorAll('.modal.show');
    if (modals.length > 0) {
      modals.forEach(modal => modal.classList.remove('show'));
    }
  }

  openSettings() {
    const settingsBtn = document.getElementById('userPanelSettings');
    if (settingsBtn) {
      settingsBtn.click();
    }
  }

  navigateChannel(direction) {
    const channels = Array.from(document.querySelectorAll('.channel'));
    const activeChannel = document.querySelector('.channel.active');
    
    if (!activeChannel) {
      if (channels.length > 0) channels[0].click();
      return;
    }

    const currentIndex = channels.indexOf(activeChannel);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < channels.length) {
      channels[nextIndex].click();
    }
  }

  formatText(e, wrapper) {
    const input = e.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selectedText = text.substring(start, end);

    if (selectedText) {
      const newText = text.substring(0, start) + wrapper + selectedText + wrapper + text.substring(end);
      input.value = newText;
      input.setSelectionRange(start + wrapper.length, end + wrapper.length);
    }
  }

  openKeybindsSettings() {
    // Open settings modal
    const settingsBtn = document.getElementById('userPanelSettings');
    if (settingsBtn) {
      settingsBtn.click();
      
      // Switch to keybinds tab after a short delay
      setTimeout(() => {
        const keybindsTab = document.querySelector('[data-tab="keybinds"]');
        if (keybindsTab) {
          keybindsTab.click();
        }
      }, 100);
    }
  }

  populateKeybindsTab() {
    const container = document.getElementById('keybindsContent');
    if (!container) return;
    
    // Load custom keybinds from localStorage
    this.loadCustomKeybinds();
    
    const categories = {};
    this.shortcuts.forEach((shortcut, key) => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = [];
      }
      categories[shortcut.category].push({ key, ...shortcut });
    });

    let content = '<p class="settings-hint" style="margin-bottom: 20px;">Click on any keybind to change it. Press Escape to cancel.</p>';
    
    Object.entries(categories).forEach(([category, shortcuts]) => {
      content += `<div class="settings-section">`;
      content += `<label class="settings-label">${category}</label>`;
      
      shortcuts.forEach(({ key, description }) => {
        const displayKey = key.replace('Ctrl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
        const shortcutId = this.getShortcutId(key);
        content += `
          <div class="keybind-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
            <span style="color: var(--text); font-size: 14px;">${description}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="keybind-button" data-shortcut-id="${shortcutId}" data-original-key="${key}" style="background: var(--sidebar-dark); padding: 6px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; color: var(--accent); border: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s;">
                ${displayKey}
              </button>
              <button class="keybind-reset" data-shortcut-id="${shortcutId}" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px; font-size: 12px; opacity: 0; transition: opacity 0.2s;" title="Reset to default">
                <i class="fas fa-undo"></i>
              </button>
            </div>
          </div>
        `;
      });
      
      content += '</div>';
    });

    content += `
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
        <button class="settings-button secondary" id="resetAllKeybinds">Reset All to Defaults</button>
      </div>
    `;

    container.innerHTML = content;
    this.attachKeybindListeners();
  }

  getShortcutId(key) {
    return key.replace(/\+/g, '-').toLowerCase();
  }

  attachKeybindListeners() {
    // Keybind edit buttons
    document.querySelectorAll('.keybind-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.startRecording(e.target);
      });
    });

    // Reset individual keybind
    document.querySelectorAll('.keybind-reset').forEach(button => {
      button.addEventListener('click', (e) => {
        const shortcutId = e.currentTarget.dataset.shortcutId;
        this.resetKeybind(shortcutId);
      });
    });

    // Show reset button on hover
    document.querySelectorAll('.keybind-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        const resetBtn = row.querySelector('.keybind-reset');
        if (resetBtn) resetBtn.style.opacity = '1';
      });
      row.addEventListener('mouseleave', () => {
        const resetBtn = row.querySelector('.keybind-reset');
        if (resetBtn) resetBtn.style.opacity = '0';
      });
    });

    // Reset all button
    const resetAllBtn = document.getElementById('resetAllKeybinds');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        if (confirm('Reset all keybinds to defaults?')) {
          localStorage.removeItem('wyvernCustomKeybinds');
          this.populateKeybindsTab();
          this.showToast('All keybinds reset to defaults');
        }
      });
    }
  }

  startRecording(button) {
    const originalText = button.textContent;
    button.textContent = 'Press any key...';
    button.style.background = 'var(--accent)';
    button.style.color = 'white';
    button.style.animation = 'pulse 1s infinite';

    const recordKey = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        // Cancel recording
        button.textContent = originalText;
        button.style.background = 'var(--sidebar-dark)';
        button.style.color = 'var(--accent)';
        button.style.animation = '';
        document.removeEventListener('keydown', recordKey, true);
        return;
      }

      const newKey = this.getKeyCombo(e);
      const shortcutId = button.dataset.shortcutId;
      const originalKey = button.dataset.originalKey;

      // Check if key is already in use
      const existingShortcut = Array.from(this.shortcuts.entries()).find(
        ([key, shortcut]) => key === newKey && this.getShortcutId(key) !== shortcutId
      );

      if (existingShortcut) {
        button.textContent = 'Already in use!';
        button.style.background = 'var(--voice-red)';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = 'var(--sidebar-dark)';
          button.style.color = 'var(--accent)';
          button.style.animation = '';
        }, 1500);
        document.removeEventListener('keydown', recordKey, true);
        return;
      }

      // Save new keybind
      this.saveCustomKeybind(originalKey, newKey);
      
      // Update display
      const displayKey = newKey.replace('Ctrl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
      button.textContent = displayKey;
      button.style.background = 'var(--sidebar-dark)';
      button.style.color = 'var(--accent)';
      button.style.animation = '';

      // Update the shortcuts map
      const shortcut = this.shortcuts.get(originalKey);
      this.shortcuts.delete(originalKey);
      this.shortcuts.set(newKey, shortcut);

      document.removeEventListener('keydown', recordKey, true);
      this.showToast('Keybind updated');
    };

    document.addEventListener('keydown', recordKey, true);
  }

  loadCustomKeybinds() {
    const saved = localStorage.getItem('wyvernCustomKeybinds');
    if (!saved) return;

    try {
      const custom = JSON.parse(saved);
      Object.entries(custom).forEach(([oldKey, newKey]) => {
        const shortcut = this.shortcuts.get(oldKey);
        if (shortcut) {
          this.shortcuts.delete(oldKey);
          this.shortcuts.set(newKey, shortcut);
        }
      });
    } catch (e) {
      console.error('Failed to load custom keybinds:', e);
    }
  }

  saveCustomKeybind(oldKey, newKey) {
    const saved = localStorage.getItem('wyvernCustomKeybinds');
    const custom = saved ? JSON.parse(saved) : {};
    custom[oldKey] = newKey;
    localStorage.setItem('wyvernCustomKeybinds', JSON.stringify(custom));
  }

  resetKeybind(shortcutId) {
    const saved = localStorage.getItem('wyvernCustomKeybinds');
    if (!saved) return;

    const custom = JSON.parse(saved);
    const entry = Object.entries(custom).find(([oldKey]) => 
      this.getShortcutId(oldKey) === shortcutId
    );

    if (entry) {
      const [oldKey, newKey] = entry;
      delete custom[oldKey];
      localStorage.setItem('wyvernCustomKeybinds', JSON.stringify(custom));
      
      // Restore original keybind
      const shortcut = this.shortcuts.get(newKey);
      if (shortcut) {
        this.shortcuts.delete(newKey);
        this.shortcuts.set(oldKey, shortcut);
      }

      this.populateKeybindsTab();
      this.showToast('Keybind reset to default');
    }
  }

  showToast(message) {
    if (window.toastManager) {
      window.toastManager.show(message, 'info');
    }
  }
}
