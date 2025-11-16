// Mention Autocomplete Manager
export class MentionManager {
  constructor(inputElement) {
    this.input = inputElement;
    this.visible = false;
    this.index = 0;
    this.suggestions = [];
    this.autocompleteEl = null;
    
    this.init();
  }

  init() {
    if (!this.input) {
      console.error('MentionManager: Input element not found');
      return;
    }
    
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (this.visible && !this.autocompleteEl?.contains(e.target) && e.target !== this.input) {
        this.hide();
      }
    });
  }

  handleInput() {
    const text = this.input.value;
    const cursorPos = this.input.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      this.show(query);
    } else {
      this.hide();
    }
  }

  show(query) {
    // Get online users with their info
    const onlineUsers = Array.from(document.querySelectorAll('#usersList .user-item'))
      .map(el => {
        const name = el.querySelector('.user-item-name')?.textContent?.trim() || '';
        const avatar = el.querySelector('.user-item-avatar')?.textContent?.trim() || name.charAt(0).toUpperCase();
        const isAdmin = el.querySelector('.user-item-badge') !== null;
        return { name, avatar, isAdmin };
      })
      .filter(user => user.name && user.name !== this.input.dataset.username);
    
    // Add special mentions
    const specialMentions = [
      { name: 'everyone', avatar: '👥', isSpecial: true, description: 'Notify everyone' },
      { name: 'here', avatar: '📢', isSpecial: true, description: 'Notify online users' }
    ];
    
    const allOptions = [...specialMentions, ...onlineUsers];
    
    // Filter by query
    this.suggestions = allOptions.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (this.suggestions.length === 0) {
      this.hide();
      return;
    }
    
    // Limit to 8 suggestions
    this.suggestions = this.suggestions.slice(0, 8);
    
    this.index = 0;
    this.visible = true;
    
    if (!this.autocompleteEl) {
      this.autocompleteEl = document.createElement('div');
      this.autocompleteEl.id = 'mention-autocomplete';
      this.autocompleteEl.className = 'mention-autocomplete';
      const chatInput = document.querySelector('.chat-input');
      if (!chatInput) {
        console.error('MentionManager: .chat-input not found');
        return;
      }
      chatInput.appendChild(this.autocompleteEl);
    }
    
    this.autocompleteEl.innerHTML = this.suggestions.map((user, index) => {
      const isSpecial = user.isSpecial;
      const avatarClass = isSpecial ? 'mention-avatar-special' : 'mention-avatar';
      const adminBadge = user.isAdmin ? '<span class="mention-admin-badge">👑</span>' : '';
      const description = user.description ? `<span class="mention-description">${user.description}</span>` : '';
      
      return `
        <div class="mention-autocomplete-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
          <div class="${avatarClass}">${user.avatar}</div>
          <div class="mention-info">
            <div class="mention-name">
              ${user.name}
              ${adminBadge}
            </div>
            ${description}
          </div>
        </div>
      `;
    }).join('');
    
    this.autocompleteEl.style.display = 'block';
    
    // Add click handlers
    this.autocompleteEl.querySelectorAll('.mention-autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        this.select(parseInt(item.dataset.index));
      });
      
      // Hover effect
      item.addEventListener('mouseenter', () => {
        this.index = parseInt(item.dataset.index);
        this.updateSelection();
      });
    });
  }

  hide() {
    this.visible = false;
    if (this.autocompleteEl) {
      this.autocompleteEl.style.display = 'none';
    }
  }

  handleKeydown(e) {
    if (!this.visible) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.index = (this.index + 1) % this.suggestions.length;
      this.updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.index = (this.index - 1 + this.suggestions.length) % this.suggestions.length;
      this.updateSelection();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (this.visible) {
        e.preventDefault();
        this.select(this.index);
      }
    } else if (e.key === 'Escape') {
      this.hide();
    }
  }

  updateSelection() {
    const items = document.querySelectorAll('.mention-autocomplete-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.index);
    });
    
    // Scroll selected item into view
    const selectedItem = items[this.index];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  select(index) {
    const selectedUser = this.suggestions[index];
    if (!selectedUser) return;
    
    const text = this.input.value;
    const cursorPos = this.input.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);
    
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${selectedUser.name} `);
    this.input.value = newTextBefore + textAfterCursor;
    this.input.selectionStart = this.input.selectionEnd = newTextBefore.length;
    
    this.hide();
    this.input.focus();
    
    // Trigger input event to update any listeners
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  static extract(text) {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }
}
