window.debugWyvern = {
  testConnection: async () => {
    try {
      const response = await fetch('/api/server-info');
      const data = await response.json();
      console.log('Server info:', data);
      return data;
    } catch (error) {
      console.error('Connection test failed:', error);
      return null;
    }
  },
  
  testSocket: () => {
    const testSocket = io({
      transports: ["websocket"],
      timeout: 5000
    });
    
    testSocket.on('connect', () => {
      console.log('WebSocket test: SUCCESS');
      testSocket.disconnect();
    });
    
    testSocket.on('connect_error', (error) => {
      console.log('WebSocket test: FAILED', error.message);
      
      // Try polling
      const pollSocket = io({
        transports: ["polling"],
        timeout: 5000
      });
      
      pollSocket.on('connect', () => {
        console.log('Polling test: SUCCESS');
        pollSocket.disconnect();
      });
      
      pollSocket.on('connect_error', (error) => {
        console.log('Polling test: FAILED', error.message);
      });
    });
  }
};

// Auto-run debug on page load
if (window.location.search.includes('debug=true')) {
  window.debugWyvern.testConnection();
  window.debugWyvern.testSocket();
}