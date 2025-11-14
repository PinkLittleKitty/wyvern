// Channel Management
export class ChannelManager {
  constructor(socket) {
    this.socket = socket;
    this.currentChannel = 'general';
    this.textChannelsList = document.getElementById('textChannelsList');
    this.voiceChannelsList = document.getElementById('voiceChannelsList');
    this.currentChannelHeader = document.getElementById('currentChannel');
    
    console.log('📝 ChannelManager initialized');
    console.log('  textChannelsList:', this.textChannelsList ? '✅ Found' : '❌ Not found');
    console.log('  voiceChannelsList:', this.voiceChannelsList ? '✅ Found' : '❌ Not found');
  }

  updateList(channels, type = 'text') {
    console.log(`📝 ChannelManager.updateList called: ${type}, ${channels.length} channels`);
    
    const list = type === 'text' ? this.textChannelsList : this.voiceChannelsList;
    if (!list) {
      console.error(`❌ ${type} channel list element not found!`);
      console.log('textChannelsList:', this.textChannelsList);
      console.log('voiceChannelsList:', this.voiceChannelsList);
      return;
    }

    console.log(`✅ ${type} channel list found, updating...`);
    list.innerHTML = '';

    if (type === 'text') {
      // Text channels
      channels.forEach(channel => {
        const channelEl = document.createElement('div');
        channelEl.className = 'channel';
        channelEl.dataset.channel = channel.name;
        
        const isActive = channel.name === this.currentChannel;
        
        channelEl.innerHTML = `
          <div class="channel-name ${isActive ? 'active' : ''}"># ${this.escapeHtml(channel.name)}</div>
        `;

        channelEl.addEventListener('click', () => {
          this.switchChannel(channel.name);
        });

        list.appendChild(channelEl);
      });
    } else {
      // Voice channels
      channels.forEach(channel => {
        const channelEl = document.createElement('div');
        channelEl.className = 'voice-channel-item';
        channelEl.dataset.channel = channel.name;
        
        const users = channel.users || [];
        const isConnected = false; // Will be updated by voice module
        
        if (isConnected) {
          channelEl.classList.add('connected');
        }

        channelEl.innerHTML = `
          <div class="voice-channel-header">
            <div class="voice-channel-info">
              <i class="fas fa-volume-up voice-channel-icon"></i>
              <span class="voice-channel-name">${this.escapeHtml(channel.name)}</span>
            </div>
            <span class="voice-user-count">${users.length || ''}</span>
          </div>
          <div class="voice-channel-users" style="display: ${users.length > 0 ? 'block' : 'none'}">
            ${users.map(user => `
              <div class="voice-user" data-username="${user}">
                <i class="fas fa-user"></i>
                <span class="voice-user-name">${this.escapeHtml(user)}</span>
              </div>
            `).join('')}
          </div>
        `;

        const headerEl = channelEl.querySelector('.voice-channel-header');
        headerEl.addEventListener('click', () => {
          this.joinVoiceChannel(channel.name);
        });

        list.appendChild(channelEl);
        console.log(`  ✅ Added ${type} channel:`, channel.name);
      });
    }
    
    console.log(`✅ ${type} channel list update complete. Total in DOM:`, list.children.length);
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
