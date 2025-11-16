// Socket.IO Connection Manager
export class SocketManager {
  constructor(token, handlers = {}) {
    this.token = token;
    this.handlers = handlers;
    this.socket = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      if (typeof io === 'undefined') {
        reject(new Error('Socket.IO not loaded'));
        return;
      }

      this.socket = io('https://193.149.164.240:4196', {
        transports: ["websocket", "polling"],
        auth: { token: this.token },
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        forceNew: false,
        upgrade: true,
        rememberUpgrade: false,
        secure: true
      });

      window.wyvernSocket = this.socket;

      this.socket.on("connect", () => {
        console.log("✅ Connected to server");
        if (this.handlers.onConnect) this.handlers.onConnect();
        resolve(this.socket);
      });

      this.socket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
        if (this.handlers.onError) this.handlers.onError(error);
        reject(error);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Disconnected:", reason);
        if (this.handlers.onDisconnect) this.handlers.onDisconnect(reason);
      });

      this.socket.on("reconnect", (attemptNumber) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
        if (this.handlers.onReconnect) this.handlers.onReconnect(attemptNumber);
      });
    });
  }

  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
