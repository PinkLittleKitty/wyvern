// Channel Management
export class ChannelManager {
  constructor(socket) {
    this.socket = socket;
    this.currentChannel = 'general';
    this.textChannelsList = document.getElementById('textChannelsList');
    this.voiceChannelsList = document.getElementById('voiceChannelsList');
    this.currentChannelHeader = document.getElementById('currentChannel');
  }

  updateList(channels, type = 'text') {
    const list = type === 'text' ? this.textChannelsList : this.voiceChannelsList;
    if (!list) return;

    list.innerHTML = '';

    channels.forEach(channel => {
      const channelEl = document.createElement('div');
      channelEl.className = 'channel-item';
      channelEl.dataset.channel = channel.name;
      
      if (type === 'text' && channel.name === this.currentChannel) {
        channelEl.classList.add('active');
      }

      const icon = type === 'text' ? 'fa-hashtag' : 'fa-volume-up';
      
      channelEl.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="channel-name">${this.escapeHtml(channel.name)}</span>
      `;

      if (type === 'text') {
        channelEl.addEventListener('click', () => {
          this.switchChannel(channel.name);
        });
      } else {
        channelEl.addEventListener('click', () => {
          this.joinVoiceChannel(channel.name);
        });
      }

      list.appendChild(channelEl);
    });
  }

  switchChannel(channelName) {
    this.currentChannel = channelName;
    this.socket.emit('joinChannel', channelName);
    
    if (this.currentChannelHeader) {
      this.currentChannelHeader.textContent = channelName;
    }

    // Update active state
    document.querySelectorAll('.channel-item').forEach(el => {
      el.classList.toggle('active', el.dataset.channel === channelName);
    });

    // Update input placeholder
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = `Message #${channelName}`;
    }
  }

  joinVoiceChannel(channelName) {
    console.log('Joining voice channel:', channelName);
    // TODO: Implement voice channel joining
  }

  getCurrentChannel() {
    return this.currentChannel;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
