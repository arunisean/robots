// Chrome Extension Popup Script
class PopupController {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3001/api';
    this.isConnected = false;
    this.walletAddress = null;
    this.authToken = null;
    this.agents = [];
    this.activities = [];
    
    this.init();
  }

  async init() {
    console.log('Initializing popup controller');
    
    // Load saved state
    await this.loadSavedState();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.initializeUI();
    
    // Check connection and load data
    await this.checkConnection();
  }

  async loadSavedState() {
    try {
      const result = await chrome.storage.local.get(['walletAddress', 'authToken']);
      this.walletAddress = result.walletAddress;
      this.authToken = result.authToken;
      
      console.log('Loaded saved state:', { 
        hasWallet: !!this.walletAddress, 
        hasToken: !!this.authToken 
      });
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }

  setupEventListeners() {
    // Wallet connection
    document.getElementById('connectWalletBtn').addEventListener('click', () => {
      this.connectWallet();
    });
    
    document.getElementById('disconnectBtn').addEventListener('click', () => {
      this.disconnectWallet();
    });

    // Quick actions
    document.getElementById('collectDataBtn').addEventListener('click', () => {
      this.triggerQuickAction('collect');
    });
    
    document.getElementById('processContentBtn').addEventListener('click', () => {
      this.triggerQuickAction('process');
    });
    
    document.getElementById('publishContentBtn').addEventListener('click', () => {
      this.triggerQuickAction('publish');
    });

    // Refresh and navigation
    document.getElementById('refreshAgentsBtn').addEventListener('click', () => {
      this.loadAgents();
    });
    
    document.getElementById('retryBtn').addEventListener('click', () => {
      this.checkConnection();
    });

    // Footer buttons
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('helpBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://docs.multi-agent-platform.com' });
    });
    
    document.getElementById('dashboardBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000' });
    });
  }

  initializeUI() {
    this.showSection('loadingSection');
    this.updateConnectionStatus('connecting', 'Connecting...');
    
    if (this.walletAddress) {
      this.showWalletConnected();
    } else {
      this.showWalletDisconnected();
    }
  }

  async checkConnection() {
    try {
      console.log('Checking connection to backend...');
      
      const response = await fetch(`${this.apiBaseUrl}/health`);
      
      if (response.ok) {
        this.isConnected = true;
        this.updateConnectionStatus('connected', 'Connected');
        
        if (this.authToken) {
          await this.verifyAuth();
        } else if (this.walletAddress) {
          this.showSection('walletSection');
        } else {
          this.showSection('walletSection');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected', 'Disconnected');
      this.showError('Unable to connect to the platform. Please check if the backend is running.');
    }
  }

  async verifyAuth() {
    try {
      console.log('Verifying authentication...');
      
      const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Authentication verified');
          await this.loadDashboard();
        } else {
          throw new Error('Invalid token');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      // Clear invalid token
      this.authToken = null;
      await chrome.storage.local.remove(['authToken']);
      this.showSection('walletSection');
    }
  }

  async connectWallet() {
    try {
      console.log('Connecting wallet...');
      
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        // Inject MetaMask detection script
        await this.injectWalletScript();
      }

      // Request wallet connection through content script
      const response = await this.sendMessageToContentScript({
        type: 'CONNECT_WALLET'
      });

      if (response.success) {
        this.walletAddress = response.address;
        await chrome.storage.local.set({ walletAddress: this.walletAddress });
        
        console.log('Wallet connected:', this.walletAddress);
        this.showWalletConnected();
        
        // Authenticate with backend
        await this.authenticateWithBackend();
      } else {
        throw new Error(response.error || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      this.showError(`Wallet connection failed: ${error.message}`);
    }
  }

  async authenticateWithBackend() {
    try {
      console.log('Authenticating with backend...');
      
      // Get nonce from backend
      const nonceResponse = await fetch(`${this.apiBaseUrl}/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: this.walletAddress })
      });

      if (!nonceResponse.ok) {
        throw new Error(`Failed to get nonce: HTTP ${nonceResponse.status}`);
      }

      const { nonce, message } = await nonceResponse.json();

      // Sign message through content script
      const signResponse = await this.sendMessageToContentScript({
        type: 'SIGN_MESSAGE',
        message: message
      });

      if (!signResponse.success) {
        throw new Error(signResponse.error || 'Failed to sign message');
      }

      // Login with signature
      const loginResponse = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.walletAddress,
          signature: signResponse.signature,
          message: message
        })
      });

      if (!loginResponse.ok) {
        throw new Error(`Login failed: HTTP ${loginResponse.status}`);
      }

      const loginData = await loginResponse.json();
      
      if (loginData.success) {
        this.authToken = loginData.token;
        await chrome.storage.local.set({ authToken: this.authToken });
        
        console.log('Authentication successful');
        await this.loadDashboard();
      } else {
        throw new Error(loginData.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Backend authentication failed:', error);
      this.showError(`Authentication failed: ${error.message}`);
    }
  }

  async disconnectWallet() {
    try {
      console.log('Disconnecting wallet...');
      
      // Logout from backend if authenticated
      if (this.authToken) {
        await fetch(`${this.apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // Clear stored data
      this.walletAddress = null;
      this.authToken = null;
      this.agents = [];
      this.activities = [];
      
      await chrome.storage.local.clear();
      
      this.showWalletDisconnected();
      this.showSection('walletSection');
      
      console.log('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  async loadDashboard() {
    try {
      console.log('Loading dashboard...');
      
      this.showSection('agentSection');
      
      // Load agents and activities in parallel
      await Promise.all([
        this.loadAgents(),
        this.loadActivities(),
        this.loadStats()
      ]);
      
      console.log('Dashboard loaded successfully');
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  async loadAgents() {
    try {
      console.log('Loading agents...');
      
      const response = await fetch(`${this.apiBaseUrl}/agents`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.agents = data.agents || [];
        this.renderAgents();
        console.log(`Loaded ${this.agents.length} agents`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  async loadActivities() {
    try {
      console.log('Loading activities...');
      
      const response = await fetch(`${this.apiBaseUrl}/activities?limit=10`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.activities = data.activities || [];
        this.renderActivities();
        console.log(`Loaded ${this.activities.length} activities`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }

  async loadStats() {
    try {
      console.log('Loading stats...');
      
      const response = await fetch(`${this.apiBaseUrl}/stats`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.updateStats(data);
        console.log('Stats loaded:', data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats
      this.updateStats({
        totalAgents: this.agents.length,
        runningAgents: this.agents.filter(a => a.status === 'running').length,
        totalExecutions: 0
      });
    }
  }

  async triggerQuickAction(action) {
    try {
      console.log(`Triggering quick action: ${action}`);
      
      const actionMap = {
        collect: 'work',
        process: 'process',
        publish: 'publish'
      };

      const agentType = actionMap[action];
      const availableAgents = this.agents.filter(a => a.category === agentType && a.status === 'active');

      if (availableAgents.length === 0) {
        this.showNotification(`No ${agentType} agents available`, 'warning');
        return;
      }

      // Use the first available agent
      const agent = availableAgents[0];
      
      const response = await fetch(`${this.apiBaseUrl}/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            data: [],
            metadata: { source: 'quick_action' }
          }
        })
      });

      if (response.ok) {
        this.showNotification(`${action} action triggered successfully`, 'success');
        await this.loadActivities(); // Refresh activities
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Quick action ${action} failed:`, error);
      this.showNotification(`Failed to trigger ${action} action`, 'error');
    }
  }

  // UI Helper Methods
  showSection(sectionId) {
    const sections = ['walletSection', 'agentSection', 'loadingSection', 'errorSection'];
    sections.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle('hidden', id !== sectionId);
      }
    });
  }

  updateConnectionStatus(status, text) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (indicator && statusText) {
      indicator.className = `status-indicator ${status}`;
      statusText.textContent = text;
    }
  }

  showWalletConnected() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const walletAddress = document.getElementById('walletAddress');
    
    if (connectBtn && walletInfo && walletAddress) {
      connectBtn.classList.add('hidden');
      walletInfo.classList.remove('hidden');
      walletAddress.textContent = this.formatAddress(this.walletAddress);
    }
  }

  showWalletDisconnected() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    
    if (connectBtn && walletInfo) {
      connectBtn.classList.remove('hidden');
      walletInfo.classList.add('hidden');
    }
  }

  showError(message) {
    this.showSection('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  updateStats(stats) {
    const elements = {
      totalAgents: document.getElementById('totalAgents'),
      runningAgents: document.getElementById('runningAgents'),
      totalExecutions: document.getElementById('totalExecutions')
    };

    Object.entries(elements).forEach(([key, element]) => {
      if (element && stats[key] !== undefined) {
        element.textContent = stats[key];
      }
    });
  }

  renderAgents() {
    const container = document.getElementById('agentsList');
    const template = document.getElementById('agentItemTemplate');
    
    if (!container || !template) return;

    container.innerHTML = '';

    if (this.agents.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No agents found</p>';
      return;
    }

    this.agents.forEach(agent => {
      const item = template.content.cloneNode(true);
      
      item.querySelector('.agent-item').dataset.agentId = agent.id;
      item.querySelector('.agent-name').textContent = agent.name;
      item.querySelector('.agent-status').textContent = agent.status;
      item.querySelector('.agent-status').className = `agent-status ${agent.status}`;
      item.querySelector('.agent-type').textContent = agent.category;
      
      // Setup action buttons
      const startBtn = item.querySelector('.agent-start-btn');
      const stopBtn = item.querySelector('.agent-stop-btn');
      
      if (agent.status === 'running') {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
      } else {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
      }

      startBtn.addEventListener('click', () => this.startAgent(agent.id));
      stopBtn.addEventListener('click', () => this.stopAgent(agent.id));
      
      container.appendChild(item);
    });
  }

  renderActivities() {
    const container = document.getElementById('activityList');
    const template = document.getElementById('activityItemTemplate');
    
    if (!container || !template) return;

    container.innerHTML = '';

    if (this.activities.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No recent activity</p>';
      return;
    }

    this.activities.forEach(activity => {
      const item = template.content.cloneNode(true);
      
      item.querySelector('.activity-icon').textContent = this.getActivityIcon(activity.type);
      item.querySelector('.activity-title').textContent = activity.description;
      item.querySelector('.activity-time').textContent = this.formatTime(activity.timestamp);
      item.querySelector('.activity-status').textContent = activity.status;
      item.querySelector('.activity-status').className = `activity-status ${activity.status}`;
      
      container.appendChild(item);
    });
  }

  async startAgent(agentId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/agents/${agentId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.showNotification('Agent started successfully', 'success');
        await this.loadAgents();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to start agent:', error);
      this.showNotification('Failed to start agent', 'error');
    }
  }

  async stopAgent(agentId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/agents/${agentId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.showNotification('Agent stopped successfully', 'success');
        await this.loadAgents();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to stop agent:', error);
      this.showNotification('Failed to stop agent', 'error');
    }
  }

  // Utility Methods
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  getActivityIcon(type) {
    const icons = {
      'agent_created': '🤖',
      'agent_started': '▶️',
      'agent_stopped': '⏹️',
      'data_collected': '📊',
      'content_processed': '⚙️',
      'content_published': '📤',
      'error': '❌',
      'success': '✅'
    };
    return icons[type] || '📋';
  }

  async showNotification(message, type = 'info') {
    // Create browser notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Multi-Agent Platform',
        message: message
      });
    }
    
    console.log(`Notification (${type}): ${message}`);
  }

  async injectWalletScript() {
    // Inject wallet detection script into the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['injected.js']
      });
    }
  }

  async sendMessageToContentScript(message) {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            resolve(response || { success: false, error: 'No response' });
          });
        } else {
          resolve({ success: false, error: 'No active tab' });
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});