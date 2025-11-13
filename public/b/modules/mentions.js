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
    if (!this.input) return;
    
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleInput(e) {
    const text = this.input.value;
    const cursorPos = this.input.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      this.show(query);
    } else {
      this.hide();
    }
  }

  show(query) {
    const onlineUsers = Array.from(document.querySelectorAll('#usersList .user-item'))
      .map(el => el.querySelector('.user-name')?.textContent || '')
      .filter(name => name && name !== this.input.dataset.username);
    
    const allOptions = ['everyone', ...onlineUsers];
    this.suggestions = allOptions.filter(name => name.toLowerCase().startsWith(query));
    
    if (this.suggestions.length === 0) {
      this.hide();
      return;
    }
    
    this.index = 0;
    this.visible = true;
    
    if (!this.autocompleteEl) {
      this.autocompleteEl = document.createElement('div');
      this.autocompleteEl.id = 'mention-autocomplete';
      this.autocompleteEl.className = 'mention-autocomplete';
      document.querySelector('.chat-input').appendChild(this.autocompleteEl);
    }
    
    this.autocompleteEl.innerHTML = this.suggestions.map((name, index) => `
      <div class="mention-autocomplete-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
        <i class="fas ${name === 'everyone' ? 'fa-users' : 'fa-user'}"></i>
        <span>${name}</span>
      </div>
    `).join('');
    
    this.autocompleteEl.style.display = 'block';
    
    this.autocompleteEl.querySelectorAll('.mention-autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        this.select(parseInt(item.dataset.index));
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
  }

  select(index) {
    const selectedName = this.suggestions[index];
    if (!selectedName) return;
    
    const text = this.input.value;
    const cursorPos = this.input.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);
    
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${selectedName} `);
    this.input.value = newTextBefore + textAfterCursor;
    this.input.selectionStart = this.input.selectionEnd = newTextBefore.length;
    
    this.hide();
    this.input.focus();
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
