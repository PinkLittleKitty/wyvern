// Sound Manager
export class SoundManager {
  constructor() {
    this.sounds = {
      notification: new Audio('/sounds/notification.mp3'),
      join: new Audio('/sounds/join.mp3'),
      leave: new Audio('/sounds/leave.mp3')
    };
    
    this.enabled = localStorage.getItem('wyvernSoundsEnabled') !== 'false';
    this.volume = parseFloat(localStorage.getItem('wyvernSoundsVolume') || '0.5');
    this.audioContext = null;
  }
  
  init() {
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
    this.createFallbackSounds();
  }
  
  createFallbackSounds() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    this.playBeep = (frequency = 440, duration = 100, volume = 0.3) => {
      if (!this.enabled) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume * this.volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    };
  }
  
  play(soundName) {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      const clone = sound.cloneNode();
      clone.volume = this.volume;
      clone.play().catch(() => this.playFallback(soundName));
    } else {
      this.playFallback(soundName);
    }
  }
  
  playFallback(soundName) {
    switch(soundName) {
      case 'message':
        this.playBeep(600, 80, 0.3);
        break;
      case 'notification':
        this.playBeep(700, 120, 0.35);
        break;
      case 'join':
        this.playBeep(500, 100, 0.25);
        setTimeout(() => this.playBeep(700, 100, 0.25), 80);
        break;
      case 'leave':
        this.playBeep(700, 100, 0.25);
        setTimeout(() => this.playBeep(500, 100, 0.25), 80);
        break;
    }
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('wyvernSoundsEnabled', enabled);
  }
  
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('wyvernSoundsVolume', this.volume);
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }
}
