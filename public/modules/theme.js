// Theme Manager
export class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('wyvernTheme') || 'wyvern';
  }

  apply(theme) {
    if (theme === 'custom') {
      this.applyCustom();
    } else {
      document.body.setAttribute('data-theme', theme);
      const customStyle = document.getElementById('custom-theme-style');
      if (customStyle) customStyle.remove();
    }
    this.currentTheme = theme;
    localStorage.setItem('wyvernTheme', theme);
  }

  applyCustom() {
    const customTheme = JSON.parse(localStorage.getItem('wyvernCustomTheme') || '{}');
    const base = customTheme.base || 'dark';
    
    const baseTheme = base === 'dark' ? 'wyvern' : base === 'light' ? 'wyvern-light' : 'wyvern-amoled';
    document.body.setAttribute('data-theme', baseTheme);
    
    if (Object.keys(customTheme).length > 0) {
      let customStyle = document.getElementById('custom-theme-style');
      if (!customStyle) {
        customStyle = document.createElement('style');
        customStyle.id = 'custom-theme-style';
        document.head.appendChild(customStyle);
      }
      
      const accent = customTheme.accent || '#8b5cf6';
      const bg = customTheme.bg || '#0a0a0f';
      const sidebar = customTheme.sidebar || '#13131a';
      const text = customTheme.text || '#e4e4e7';
      
      customStyle.textContent = `
        body {
          --accent: ${accent} !important;
          --accent-soft: ${this.adjustColor(accent, -20)} !important;
          --accent-dark: ${this.adjustColor(accent, -40)} !important;
          --bg: ${bg} !important;
          --chat-bg: ${this.adjustColor(bg, 10)} !important;
          --sidebar: ${sidebar} !important;
          --sidebar-dark: ${this.adjustColor(sidebar, -10)} !important;
          --text: ${text} !important;
          --text-bright: ${this.adjustColor(text, 20)} !important;
          --text-muted: ${this.adjustColor(text, -30)} !important;
        }
      `;
    }
  }

  adjustColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  getCurrent() {
    return this.currentTheme;
  }
}
