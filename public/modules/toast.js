// Toast Notification System
export class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
    this.toastId = 0;
  }

  show(message, type = 'info', title = null, duration = 4000) {
    const id = this.toastId++;
    
    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>',
      debug: '<i class="fas fa-bug"></i>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.id = id;
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
      ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return id;
  }

  remove(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }
}
