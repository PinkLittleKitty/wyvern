// Fallback script if modules fail to load
// This ensures the page doesn't completely break

console.log('Chat fallback script loaded');

// Check if main script loaded
setTimeout(() => {
  if (!window.wyvernSocket && !window.location.pathname.includes('login')) {
    console.warn('Main chat script may have failed to load');
    
    // Check authentication
    const username = sessionStorage.getItem("wyvernUsername");
    const token = localStorage.getItem('wyvernToken') || sessionStorage.getItem('wyvernToken');
    
    if (!username || !token) {
      console.log('No auth found, redirecting to login');
      window.location.href = "/b/login.html";
    } else {
      console.log('Auth found but chat not initialized');
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1f;color:#fff;padding:32px;border-radius:12px;text-align:center;z-index:9999;box-shadow:0 0 20px rgba(0,0,0,0.5);max-width:400px;';
      errorDiv.innerHTML = `
        <h2 style="margin:0 0 16px 0;color:#8b5cf6;">Loading Error</h2>
        <p style="margin:0 0 16px 0;color:#aaa;">The chat application failed to load properly.</p>
        <button onclick="window.location.reload()" style="background:#8b5cf6;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:16px;">
          Reload Page
        </button>
        <br><br>
        <button onclick="window.location.href='/b/login.html'" style="background:#444;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;">
          Back to Login
        </button>
      `;
      document.body.appendChild(errorDiv);
      
      // Hide loading screen if it's still showing
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }
  }
}, 3000);
