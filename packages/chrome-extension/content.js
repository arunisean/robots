// Chrome Extension Content Script
class ContentScript {
  constructor() {
    this.isInjected = false;
    this.walletProvider = null;
    
    this.init();
  }

  init() {
    console.log('Content script initialized on:', window.location.href);
    
    // Setup message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Detect wallet providers
    this.detectWalletProviders();
    
    // Setup page monitoring
    this.setupPageMonitoring();
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message.type);

    try {
      switch (message.type) {
        case 'CONNECT_WALLET':
          sendResponse(await this.connectWallet());
          break;

        case 'SIGN_MESSAGE':
          sendResponse(await this.signMessage(message.message));
          break;

        case 'GET_WALLET_STATUS':
          sendResponse(await this.getWalletStatus());
          break;

        case 'INJECT_AGENT_UI':
          sendResponse(await this.injectAgentUI(message.data));
          break;

        case 'EXTRACT_PAGE_DATA':
          sendResponse(await this.extractPageData(message.selectors));
          break;

        case 'MONITOR_PAGE_CHANGES':
          sendResponse(await this.monitorPageChanges(message.config));
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  detectWalletProviders() {
    // Check for MetaMask
    if (window.ethereum && window.ethereum.isMetaMask) {
      this.walletProvider = window.ethereum;
      console.log('MetaMask detected');
    }
    // Check for other wallet providers
    else if (window.ethereum) {
      this.walletProvider = window.ethereum;
      console.log('Ethereum provider detected');
    }
    // Check for Coinbase Wallet
    else if (window.coinbaseWalletExtension) {
      this.walletProvider = window.coinbaseWalletExtension;
      console.log('Coinbase Wallet detected');
    }
    
    // If no provider found, wait for injection
    if (!this.walletProvider) {
      this.waitForWalletProvider();
    }
  }

  waitForWalletProvider() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkProvider = () => {
      if (window.ethereum) {
        this.walletProvider = window.ethereum;
        console.log('Wallet provider detected after waiting');
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkProvider, 500);
      } else {
        console.log('No wallet provider found after waiting');
      }
    };
    
    setTimeout(checkProvider, 100);
  }

  async connectWallet() {
    try {
      if (!this.walletProvider) {
        throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
      }

      console.log('Requesting wallet connection...');
      
      // Request account access
      const accounts = await this.walletProvider.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      console.log('Wallet connected:', address);

      // Get network info
      const chainId = await this.walletProvider.request({
        method: 'eth_chainId'
      });

      return {
        success: true,
        address: address,
        chainId: chainId,
        provider: this.getProviderName()
      };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect wallet'
      };
    }
  }

  async signMessage(message) {
    try {
      if (!this.walletProvider) {
        throw new Error('No wallet provider found');
      }

      console.log('Requesting message signature...');

      // Get current account
      const accounts = await this.walletProvider.request({
        method: 'eth_accounts'
      });

      if (accounts.length === 0) {
        throw new Error('No connected accounts');
      }

      const address = accounts[0];

      // Sign message
      const signature = await this.walletProvider.request({
        method: 'personal_sign',
        params: [message, address]
      });

      console.log('Message signed successfully');

      return {
        success: true,
        signature: signature,
        address: address
      };
    } catch (error) {
      console.error('Message signing failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign message'
      };
    }
  }

  async getWalletStatus() {
    try {
      if (!this.walletProvider) {
        return {
          success: true,
          connected: false,
          provider: null
        };
      }

      const accounts = await this.walletProvider.request({
        method: 'eth_accounts'
      });

      const chainId = await this.walletProvider.request({
        method: 'eth_chainId'
      });

      return {
        success: true,
        connected: accounts.length > 0,
        address: accounts[0] || null,
        chainId: chainId,
        provider: this.getProviderName()
      };
    } catch (error) {
      console.error('Error getting wallet status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async injectAgentUI(data) {
    try {
      const { position = 'bottom-right', agents = [] } = data;
      
      // Remove existing UI if present
      this.removeAgentUI();
      
      // Create floating UI
      const ui = this.createAgentUI(position, agents);
      document.body.appendChild(ui);
      
      console.log('Agent UI injected');
      
      return { success: true };
    } catch (error) {
      console.error('Error injecting agent UI:', error);
      return { success: false, error: error.message };
    }
  }

  createAgentUI(position, agents) {
    const container = document.createElement('div');
    container.id = 'multi-agent-ui';
    container.className = `multi-agent-ui ${position}`;
    
    container.innerHTML = `
      <div class="agent-ui-toggle">
        <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Multi-Agent">
        <span class="agent-count">${agents.length}</span>
      </div>
      <div class="agent-ui-panel">
        <div class="agent-ui-header">
          <h3>Multi-Agent Platform</h3>
          <button class="agent-ui-close">×</button>
        </div>
        <div class="agent-ui-content">
          <div class="agent-list">
            ${agents.map(agent => `
              <div class="agent-item" data-agent-id="${agent.id}">
                <div class="agent-info">
                  <span class="agent-name">${agent.name}</span>
                  <span class="agent-status ${agent.status}">${agent.status}</span>
                </div>
                <div class="agent-actions">
                  <button class="agent-execute" data-agent-id="${agent.id}">Execute</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="agent-ui-actions">
            <button class="open-dashboard">Open Dashboard</button>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    this.injectAgentUIStyles();
    
    // Setup event listeners
    this.setupAgentUIEvents(container);
    
    return container;
  }

  injectAgentUIStyles() {
    if (document.getElementById('multi-agent-ui-styles')) {
      return;
    }
    
    const styles = document.createElement('style');
    styles.id = 'multi-agent-ui-styles';
    styles.textContent = `
      .multi-agent-ui {
        position: fixed;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }
      
      .multi-agent-ui.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .multi-agent-ui.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .agent-ui-toggle {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s;
        position: relative;
      }
      
      .agent-ui-toggle:hover {
        transform: scale(1.05);
      }
      
      .agent-ui-toggle img {
        width: 32px;
        height: 32px;
      }
      
      .agent-count {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
      }
      
      .agent-ui-panel {
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        display: none;
        max-height: 400px;
        overflow: hidden;
      }
      
      .agent-ui-panel.visible {
        display: block;
      }
      
      .agent-ui-header {
        padding: 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
      }
      
      .agent-ui-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .agent-ui-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .agent-ui-content {
        padding: 16px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .agent-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f1f3f4;
      }
      
      .agent-item:last-child {
        border-bottom: none;
      }
      
      .agent-info {
        flex: 1;
      }
      
      .agent-name {
        display: block;
        font-weight: 500;
        margin-bottom: 2px;
      }
      
      .agent-status {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .agent-status.running {
        color: #28a745;
      }
      
      .agent-status.stopped {
        color: #dc3545;
      }
      
      .agent-execute {
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
      }
      
      .agent-execute:hover {
        background: #0056b3;
      }
      
      .agent-ui-actions {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e9ecef;
      }
      
      .open-dashboard {
        width: 100%;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 14px;
        cursor: pointer;
      }
      
      .open-dashboard:hover {
        background: #545b62;
      }
    `;
    
    document.head.appendChild(styles);
  }

  setupAgentUIEvents(container) {
    const toggle = container.querySelector('.agent-ui-toggle');
    const panel = container.querySelector('.agent-ui-panel');
    const closeBtn = container.querySelector('.agent-ui-close');
    const executeButtons = container.querySelectorAll('.agent-execute');
    const dashboardBtn = container.querySelector('.open-dashboard');
    
    // Toggle panel
    toggle.addEventListener('click', () => {
      panel.classList.toggle('visible');
    });
    
    // Close panel
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('visible');
    });
    
    // Execute agent
    executeButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const agentId = e.target.dataset.agentId;
        await this.executeAgent(agentId);
      });
    });
    
    // Open dashboard
    dashboardBtn.addEventListener('click', () => {
      window.open('http://localhost:3000', '_blank');
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        panel.classList.remove('visible');
      }
    });
  }

  removeAgentUI() {
    const existing = document.getElementById('multi-agent-ui');
    if (existing) {
      existing.remove();
    }
  }

  async executeAgent(agentId) {
    try {
      // Send message to background script to execute agent
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_AGENT',
        data: {
          agentId: agentId,
          input: {
            data: [],
            metadata: { source: 'content_script', url: window.location.href }
          }
        }
      });
      
      if (response.success) {
        this.showNotification('Agent executed successfully', 'success');
      } else {
        this.showNotification('Agent execution failed', 'error');
      }
    } catch (error) {
      console.error('Error executing agent:', error);
      this.showNotification('Agent execution failed', 'error');
    }
  }

  async extractPageData(selectors) {
    try {
      const data = {};
      
      for (const [key, selector] of Object.entries(selectors)) {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length === 1) {
          data[key] = elements[0].textContent?.trim() || elements[0].value || '';
        } else if (elements.length > 1) {
          data[key] = Array.from(elements).map(el => 
            el.textContent?.trim() || el.value || ''
          );
        } else {
          data[key] = null;
        }
      }
      
      // Add page metadata
      data._metadata = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        domain: window.location.hostname
      };
      
      console.log('Extracted page data:', data);
      
      return { success: true, data };
    } catch (error) {
      console.error('Error extracting page data:', error);
      return { success: false, error: error.message };
    }
  }

  async monitorPageChanges(config) {
    try {
      const { selectors, interval = 5000 } = config;
      
      let previousData = await this.extractPageData(selectors);
      
      const monitor = setInterval(async () => {
        const currentData = await this.extractPageData(selectors);
        
        if (JSON.stringify(currentData.data) !== JSON.stringify(previousData.data)) {
          console.log('Page changes detected');
          
          // Send changes to background script
          chrome.runtime.sendMessage({
            type: 'PAGE_CHANGED',
            data: {
              previous: previousData.data,
              current: currentData.data,
              url: window.location.href
            }
          });
          
          previousData = currentData;
        }
      }, interval);
      
      // Store monitor ID for cleanup
      this.pageMonitor = monitor;
      
      return { success: true };
    } catch (error) {
      console.error('Error setting up page monitoring:', error);
      return { success: false, error: error.message };
    }
  }

  setupPageMonitoring() {
    // Monitor for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      // Debounce to avoid too many notifications
      clearTimeout(this.mutationTimeout);
      this.mutationTimeout = setTimeout(() => {
        this.handlePageMutation(mutations);
      }, 1000);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
    
    this.mutationObserver = observer;
  }

  handlePageMutation(mutations) {
    // Check if any significant changes occurred
    const significantChanges = mutations.some(mutation => 
      mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
    );
    
    if (significantChanges) {
      console.log('Significant page changes detected');
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'PAGE_MUTATION',
        data: {
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  showNotification(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `multi-agent-toast ${type}`;
    toast.textContent = message;
    
    // Add toast styles if not already added
    if (!document.getElementById('multi-agent-toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'multi-agent-toast-styles';
      styles.textContent = `
        .multi-agent-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #333;
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          z-index: 10001;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease-out;
        }
        
        .multi-agent-toast.success {
          background: #28a745;
        }
        
        .multi-agent-toast.error {
          background: #dc3545;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  getProviderName() {
    if (this.walletProvider?.isMetaMask) {
      return 'MetaMask';
    } else if (this.walletProvider?.isCoinbaseWallet) {
      return 'Coinbase Wallet';
    } else if (this.walletProvider) {
      return 'Web3 Wallet';
    }
    return 'Unknown';
  }

  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    if (this.pageMonitor) {
      clearInterval(this.pageMonitor);
    }
    
    this.removeAgentUI();
  }
}

// Initialize content script
const contentScript = new ContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  contentScript.cleanup();
});