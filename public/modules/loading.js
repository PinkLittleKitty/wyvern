// Loading Screen Manager
export class LoadingManager {
  constructor() {
    this.screen = document.getElementById('loadingScreen');
    this.tipsElement = document.getElementById('loadingTips');
    this.tipInterval = null;
    this.timeout = null;
    
    this.tips = [
      'Explode',
      'Read if cute',
      'Have a nice day!',
      'Starting Lightcord...',
      'Loading 0BDFDB.plugin.js...',
      'Installing BetterDiscord...',
      'h',
      'shhhhh did you know that you\'re my favourite user? But don\'t tell the others!!',
      'Today\'s video is sponsored by Raid Shadow Legends, one of the biggest mobile role-playing games of 2019 and it\'s totally free!',
      'Never gonna give you up, Never gonna let you down',
      '( ͡° ͜ʖ ͡°)',
      '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
      'You look so pretty today!',
      'Thinking of a funny quote...',
      '3.141592653589793',
      'meow',
      'Welcome, friend',
      'If you, or someone you love, has Ligma, please see the Ligma health line',
      'I\'d just like to interject for a moment. What you\'re refering to as Linux, is in fact, GNU/Linux',
      'You\'re doing good today!',
      'Don\'t worry, it\'s nothing 9 cups of coffee couldn\'t solve!',
      'a light amount of tomfoolery is okay',
      'do you love?',
      'horror',
      'so eepy',
      'So without further ado, let\'s just jump right into it!',
      'Dying is absolutely safe',
      'hey you! you\'re cute :))',
      'heya ~',
      'Time is gone, space is insane. Here it comes, here again.',
      'sometimes it\'s okay to just guhhhhhhhhhhhhhh',
      'Welcome to nginx!'
    ];
  }

  start() {
    this.showRandomTip();
    this.tipInterval = setInterval(() => this.showRandomTip(), 4000);
    
    this.timeout = setTimeout(() => {
      console.log('⚠️ Loading timeout - forcing hide');
      this.hide();
    }, 10000);
    
    if (this.screen) {
      this.screen.addEventListener('click', () => this.hide());
    }
  }

  showRandomTip() {
    if (this.tipsElement) {
      const randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];
      this.tipsElement.innerHTML = `<span class="loading-tip">${randomTip}</span>`;
    }
  }

  hide() {
    if (this.tipInterval) clearInterval(this.tipInterval);
    if (this.timeout) clearTimeout(this.timeout);
    if (this.screen) {
      setTimeout(() => {
        this.screen.classList.add('hidden');
      }, 300);
    }
  }
}
