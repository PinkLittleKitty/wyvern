window.addEventListener("DOMContentLoaded", () => {
  const messages = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const button = document.getElementById("send-button");
  const typingStatus = document.createElement("div");
  typingStatus.classList.add("typing-indicator");
  messages.parentElement.appendChild(typingStatus);

  let socket;
  let username = sessionStorage.getItem("wyvernUsername") || null;

  async function showAuthPrompt() {
    // Basic auth choice prompt
    while (true) {
      const choice = prompt("Type 'login' to log in, 'register' to create an account:");
      if (!choice) continue;

      if (choice.toLowerCase() === "login") {
        const user = prompt("Username:");
        const pass = prompt("Password:");
        if (!user || !pass) continue;

        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user, password: pass }),
        });
        const data = await res.json();
        if (data.success) {
          username = user;
          sessionStorage.setItem("wyvernUsername", username);
          alert("Login successful!");
          break;
        } else {
          alert("Login failed: " + (data.error || "Unknown error"));
        }
      } else if (choice.toLowerCase() === "register") {
        const user = prompt("Choose a username:");
        const pass = prompt("Choose a password:");
        if (!user || !pass) continue;

        const res = await fetch("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user, password: pass }),
        });
        const data = await res.json();
        if (data.success) {
          username = user;
          sessionStorage.setItem("wyvernUsername", username);
          alert("Registration successful! Logged in.");
          break;
        } else {
          alert("Registration failed: " + (data.error || "Unknown error"));
        }
      } else {
        alert("Please type 'login' or 'register'");
      }
    }
  }

  function asciiToEmoji(text) {
    const map = {
      ":)": "😊", ":(": "☹️", ":D": "😄", ";)": "😉",
      ":P": "😛", ":O": "😮", ":/": "😕", ":'(": "😢", ":|": "😐", "XD": "😂", "<3": "❤️"
    };
    return text.replace(/:\)|:\(|:D|;\)|:P|:O|:\/|:'\(|:\|/g, match => map[match] || match);
  }

  function displayMessage(data) {
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message-container");
    if (data.username === username) messageContainer.classList.add("mine");

    const timeStr = data.timestamp
      ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    const parsedMessage = asciiToEmoji(data.message);
    const content = marked.parse(parsedMessage);

    const p = document.createElement("p");
    p.innerHTML = `<strong>${data.username}</strong> <span class="timestamp">${timeStr}</span><br>${content}`;

    messageContainer.appendChild(p);
    messages.appendChild(messageContainer);
    messages.scrollTop = messages.scrollHeight;
  }

  let typingTimeout;

  function sendTyping() {
    if (!socket) return;
    socket.emit("typing", username);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", null);
    }, 2000);
  }

  function setupSocket() {
    socket = io("http://193.149.164.240:4196", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("connected to server");
      socket.emit("getHistory");
    });

    socket.on("chatHistory", (history) => {
      messages.innerHTML = "";
      history.forEach(displayMessage);
    });

    socket.on("chatMessage", displayMessage);

    socket.on("typing", (name) => {
      if (name && name !== username) {
        typingStatus.textContent = `${name} is typing...`;
      } else {
        typingStatus.textContent = "";
      }
    });

    button.addEventListener("click", sendMessage);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      } else {
        sendTyping();
      }
    });
  }

  function sendMessage() {
    let text = input.value.trim();
    if (!text) return;

    if (text.toLowerCase() === "/clear") {
      messages.innerHTML = "";
      input.value = "";
      return;
    }

    if (text.length > 2000) {
      text = text.slice(0, 2000) + "...";
    }

    socket.emit("chatMessage", { username, message: text });
    input.value = "";
    socket.emit("typing", null);
  }

  async function main() {
    if (!username) {
      await showAuthPrompt();
    }

    setupSocket();

    // Optionally add a logout button somewhere
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Logout";
    logoutBtn.style.position = "fixed";
    logoutBtn.style.top = "10px";
    logoutBtn.style.right = "10px";
    logoutBtn.style.zIndex = 1000;
    document.body.appendChild(logoutBtn);

    logoutBtn.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" });
      sessionStorage.removeItem("wyvernUsername");
      location.reload();
    });
  }

  main();
});