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
      this.indicator.innerHTML = "";
      this.indicator.style.display = "none";
    } else {
      let text = "";
      if (this.typingUsers.size === 1) {
        text = `${Array.from(this.typingUsers)[0]} is typing...`;
      } else if (this.typingUsers.size === 2) {
        const users = Array.from(this.typingUsers);
        text = `${users[0]} and ${users[1]} are typing...`;
      } else {
        text = `Several people are typing...`;
      }

      this.indicator.innerHTML = `
        <div class="typing-bubble">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
        <span>${text}</span>
      `;
      this.indicator.style.display = "flex";
    }
  }
}
