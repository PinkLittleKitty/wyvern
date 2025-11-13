// Typing Indicator Manager
export class TypingManager {
  constructor(socket) {
    this.socket = socket;
    this.typingUsers = new Set();
    this.indicator = document.getElementById('typingIndicator');
    this.isTyping = false;
    this.timeout = null;
  }

  start(username) {
    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.emit("typing", { username, isTyping: true });
    }
    
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.stop(username), 3000);
  }

  stop(username) {
    if (this.isTyping) {
      this.isTyping = false;
      this.socket.emit("typing", { username, isTyping: false });
    }
    clearTimeout(this.timeout);
  }

  handleRemoteTyping(data, currentUsername) {
    if (data.isTyping && data.username !== currentUsername) {
      this.typingUsers.add(data.username);
    } else {
      this.typingUsers.delete(data.username);
    }
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.indicator) return;

    if (this.typingUsers.size === 0) {
      this.indicator.textContent = "";
      this.indicator.style.display = "none";
    } else if (this.typingUsers.size === 1) {
      const user = Array.from(this.typingUsers)[0];
      this.indicator.textContent = `${user} is typing...`;
      this.indicator.style.display = "flex";
    } else if (this.typingUsers.size === 2) {
      const users = Array.from(this.typingUsers);
      this.indicator.textContent = `${users[0]} and ${users[1]} are typing...`;
      this.indicator.style.display = "flex";
    } else {
      this.indicator.textContent = `Several people are typing...`;
      this.indicator.style.display = "flex";
    }
  }
}
