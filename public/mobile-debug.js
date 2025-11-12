// Mobile Debug Script
// Add this to your page temporarily to debug mobile issues

(function() {
  console.log('🔍 Mobile Debug Script Loaded');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDebug);
  } else {
    runDebug();
  }
  
  function runDebug() {
    console.log('=== MOBILE DEBUG INFO ===');
    
    // Check viewport
    console.log('📱 Viewport Width:', window.innerWidth);
    console.log('📱 Viewport Height:', window.innerHeight);
    console.log('📱 Device Pixel Ratio:', window.devicePixelRatio);
    console.log('📱 Is Mobile Size:', window.innerWidth <= 800);
    
    // Check if elements exist
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const toggleUsersBtn = document.getElementById('toggleUsersBtn');
    
    console.log('🔘 Mobile Menu Toggle exists:', !!mobileMenuToggle);
    console.log('🔘 Mobile Overlay exists:', !!mobileOverlay);
    console.log('🔘 Toggle Users Button exists:', !!toggleUsersBtn);
    
    // Check computed styles
    if (mobileMenuToggle) {
      const styles = window.getComputedStyle(mobileMenuToggle);
      console.log('🎨 Menu Toggle Styles:');
      console.log('  - display:', styles.display);
      console.log('  - position:', styles.position);
      console.log('  - z-index:', styles.zIndex);
      console.log('  - background:', styles.backgroundColor);
      console.log('  - width:', styles.width);
      console.log('  - height:', styles.height);
      console.log('  - top:', styles.top);
      console.log('  - left:', styles.left);
      
      // Check if it's visible
      const rect = mobileMenuToggle.getBoundingClientRect();
      console.log('📐 Menu Toggle Position:');
      console.log('  - top:', rect.top);
      console.log('  - left:', rect.left);
      console.log('  - width:', rect.width);
      console.log('  - height:', rect.height);
      console.log('  - visible:', rect.width > 0 && rect.height > 0);
    }
    
    // Check CSS file loading
    const stylesheets = Array.from(document.styleSheets);
    const chatStyles = stylesheets.find(sheet => 
      sheet.href && sheet.href.includes('chat-styles.css')
    );
    console.log('📄 chat-styles.css loaded:', !!chatStyles);
    
    if (chatStyles) {
      try {
        const rules = Array.from(chatStyles.cssRules || chatStyles.rules);
        const mobileMenuRule = rules.find(rule => 
          rule.selectorText && rule.selectorText.includes('mobile-menu-toggle')
        );
        console.log('📝 .mobile-menu-toggle CSS rule found:', !!mobileMenuRule);
        
        const mediaQuery = rules.find(rule => 
          rule.media && rule.media.mediaText.includes('max-width')
        );
        console.log('📝 @media (max-width) rule found:', !!mediaQuery);
      } catch (e) {
        console.log('⚠️ Cannot read CSS rules (CORS):', e.message);
      }
    }
    
    // Check body classes
    console.log('🏷️ Body Classes:', document.body.className);
    
    // Test function
    window.testMobileMenu = function() {
      console.log('🧪 Testing mobile menu...');
      document.body.classList.toggle('sidebar-visible');
      console.log('✅ Toggled sidebar-visible class');
      console.log('🏷️ Body Classes:', document.body.className);
    };
    
    console.log('💡 Run window.testMobileMenu() to test menu toggle');
    console.log('=== END DEBUG INFO ===');
    
    // Visual indicator
    if (window.innerWidth <= 800 && mobileMenuToggle) {
      setTimeout(() => {
        const styles = window.getComputedStyle(mobileMenuToggle);
        if (styles.display === 'none') {
          console.error('❌ PROBLEM: Mobile menu toggle is display:none at mobile width!');
          console.log('💡 Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
        } else {
          console.log('✅ Mobile menu toggle is visible!');
        }
      }, 1000);
    }
  }
  
  // Monitor resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log('📱 Window resized to:', window.innerWidth, 'x', window.innerHeight);
      console.log('📱 Is mobile size:', window.innerWidth <= 800);
      
      const toggle = document.getElementById('mobileMenuToggle');
      if (toggle) {
        const styles = window.getComputedStyle(toggle);
        console.log('🔘 Menu toggle display:', styles.display);
      }
    }, 500);
  });
})();
