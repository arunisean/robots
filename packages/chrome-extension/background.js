// Chrome Extension Background Service Worker
class BackgroundService {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3001/api';
    this.isConnected = false;
    this.authToken = null;
    this.scheduledTasks = new Map();
    
    this.init();
  }

  init() {
    console.log('Background service worker initialized');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize periodic tasks
    this.initializePeriodicTasks();
    
    // Check connection on startup
    this.checkConnection();
  }

  setupEventListeners() {
    // Extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('Extension started');
      this.checkConnection();
    });

    // Message handling from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Alarm handling for scheduled tasks
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // Tab updates for content script injection
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  async handleInstallation(details) {
    console.log('Extension installed:', details);
    
    if (details.reason === 'install') {
      // First time installation
      await this.setupDefaultSettings();
      
      // Show welcome notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Multi-Agent Platform',
        message: 'Extension installed successfully! Click to get started.'
      });
      
      // Open options page
      chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Extension updated from version:', details.previousVersion);
    }
  }

  async setupDefaultSettings() {
    const defaultSettings = {
      apiBaseUrl: 'http://localhost:3001/api',
      notifications: {
        enabled: true,
        agentAlerts: true,
        executionResults: true,
        errors: true
      },
      scheduling: {
        enabled: true,
        checkInterval: 60000 // 1 minute
      },
      ui: {
        theme: 'light',
        compactMode: false
      }
    };

    await chrome.storage.sync.set({ settings: defaultSettings });
    console.log('Default settings configured');
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Received message:', message.type, 'from:', sender.tab?.url || 'popup');

    try {
      switch (message.type) {
        case 'GET_AUTH_STATUS':
          sendResponse(await this.getAuthStatus());
          break;

        case 'SCHEDULE_AGENT':
          sendResponse(await this.scheduleAgent(message.data));
          break;

        case 'UNSCHEDULE_AGENT':
          sendResponse(await this.unscheduleAgent(message.data));
          break;

        case 'GET_SCHEDULED_TASKS':
          sendResponse(await this.getScheduledTasks());
          break;

        case 'EXECUTE_AGENT':
          sendResponse(await this.executeAgent(message.data));
          break;

        case 'CHECK_CONNECTION':
          sendResponse(await this.checkConnection());
          break;

        case 'SYNC_DATA':
          sendResponse(await this.syncData());
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleAlarm(alarm) {
    console.log('Alarm triggered:', alarm.name);

    try {
      if (alarm.name === 'periodic_sync') {
        await this.performPeriodicSync();
      } else if (alarm.name.startsWith('agent_')) {
        await this.executeScheduledAgent(alarm.name);
      } else if (alarm.name === 'connection_check') {
        await this.checkConnection();
      }
    } catch (error) {
      console.error('Error handling alarm:', error);
    }
  }

  async handleTabUpdate(tabId, tab) {
    // Inject content script if needed
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
      } catch (error) {
        // Content script might already be injected or tab might not allow injection
        console.debug('Content script injection skipped for tab:', tab.url);
      }
    }
  }

  async handleStorageChange(changes, namespace) {
    console.log('Storage changed:', changes, 'in namespace:', namespace);

    if (changes.authToken) {
      this.authToken = changes.authToken.newValue;
      if (this.authToken) {
        await this.initializeAuthenticatedServices();
      } else {
        await this.cleanupAuthenticatedServices();
      }
    }

    if (changes.settings) {
      await this.updateSettings(changes.settings.newValue);
    }
  }

  initializePeriodicTasks() {
    // Set up periodic sync alarm
    chrome.alarms.create('periodic_sync', {
      delayInMinutes: 1,
      periodInMinutes: 5
    });

    // Set up connection check alarm
    chrome.alarms.create('connection_check', {
      delayInMinutes: 1,
      periodInMinutes: 2
    });

    console.log('Periodic tasks initialized');
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      this.isConnected = response.ok;
      
      if (this.isConnected) {
        console.log('Backend connection: OK');
        await this.loadAuthToken();
      } else {
        console.log('Backend connection: Failed');
      }
      
      return { success: true, connected: this.isConnected };
    } catch (error) {
      console.error('Connection check failed:', error);
      this.isConnected = false;
      return { success: false, connected: false, error: error.message };
    }
  }

  async loadAuthToken() {
    try {
      const result = await chrome.storage.local.get(['authToken']);
      this.authToken = result.authToken;
      
      if (this.authToken) {
        await this.initializeAuthenticatedServices();
      }
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  async initializeAuthenticatedServices() {
    console.log('Initializing authenticated services');
    
    // Load scheduled tasks
    await this.loadScheduledTasks();
    
    // Start monitoring services
    await this.startMonitoring();
  }

  async cleanupAuthenticatedServices() {
    console.log('Cleaning up authenticated services');
    
    // Clear scheduled tasks
    this.scheduledTasks.clear();
    
    // Clear alarms
    const alarms = await chrome.alarms.getAll();
    for (const alarm of alarms) {
      if (alarm.name.startsWith('agent_')) {
        chrome.alarms.clear(alarm.name);
      }
    }
  }

  async getAuthStatus() {
    return {
      success: true,
      isAuthenticated: !!this.authToken,
      isConnected: this.isConnected
    };
  }

  async scheduleAgent(data) {
    try {
      const { agentId, schedule, input } = data;
      
      if (!this.authToken) {
        throw new Error('Not authenticated');
      }

      // Create alarm for scheduled execution
      const alarmName = `agent_${agentId}_${Date.now()}`;
      
      if (schedule.type === 'once') {
        chrome.alarms.create(alarmName, {
          when: new Date(schedule.executeAt).getTime()
        });
      } else if (schedule.type === 'recurring') {
        chrome.alarms.create(alarmName, {
          delayInMinutes: schedule.intervalMinutes,
          periodInMinutes: schedule.intervalMinutes
        });
      }

      // Store task details
      this.scheduledTasks.set(alarmName, {
        agentId,
        schedule,
        input,
        createdAt: new Date()
      });

      // Save to storage
      await this.saveScheduledTasks();

      console.log('Agent scheduled:', alarmName);
      return { success: true, taskId: alarmName };
    } catch (error) {
      console.error('Error scheduling agent:', error);
      return { success: false, error: error.message };
    }
  }

  async unscheduleAgent(data) {
    try {
      const { taskId } = data;
      
      // Clear alarm
      await chrome.alarms.clear(taskId);
      
      // Remove from scheduled tasks
      this.scheduledTasks.delete(taskId);
      
      // Save to storage
      await this.saveScheduledTasks();

      console.log('Agent unscheduled:', taskId);
      return { success: true };
    } catch (error) {
      console.error('Error unscheduling agent:', error);
      return { success: false, error: error.message };
    }
  }

  async getScheduledTasks() {
    const tasks = Array.from(this.scheduledTasks.entries()).map(([id, task]) => ({
      id,
      ...task
    }));

    return { success: true, tasks };
  }

  async executeAgent(data) {
    try {
      const { agentId, input } = data;
      
      if (!this.authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiBaseUrl}/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Agent Execution',
          message: `Agent executed successfully`
        });

        return { success: true, result };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error executing agent:', error);
      
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Agent Execution Failed',
        message: error.message
      });

      return { success: false, error: error.message };
    }
  }

  async executeScheduledAgent(alarmName) {
    try {
      const task = this.scheduledTasks.get(alarmName);
      if (!task) {
        console.warn('Scheduled task not found:', alarmName);
        return;
      }

      console.log('Executing scheduled agent:', task.agentId);
      
      const result = await this.executeAgent({
        agentId: task.agentId,
        input: task.input
      });

      if (result.success) {
        console.log('Scheduled agent executed successfully');
      } else {
        console.error('Scheduled agent execution failed:', result.error);
      }
    } catch (error) {
      console.error('Error executing scheduled agent:', error);
    }
  }

  async performPeriodicSync() {
    if (!this.authToken || !this.isConnected) {
      return;
    }

    try {
      console.log('Performing periodic sync...');
      
      // Sync agent statuses
      await this.syncAgentStatuses();
      
      // Check for notifications
      await this.checkNotifications();
      
      console.log('Periodic sync completed');
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }

  async syncAgentStatuses() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/agents/status`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store agent statuses
        await chrome.storage.local.set({ agentStatuses: data.statuses });
        
        // Check for status changes that need notifications
        await this.checkStatusChangeNotifications(data.statuses);
      }
    } catch (error) {
      console.error('Error syncing agent statuses:', error);
    }
  }

  async checkNotifications() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        for (const notification of data.notifications) {
          await this.showNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  async checkStatusChangeNotifications(currentStatuses) {
    try {
      const result = await chrome.storage.local.get(['previousAgentStatuses']);
      const previousStatuses = result.previousAgentStatuses || {};

      for (const [agentId, currentStatus] of Object.entries(currentStatuses)) {
        const previousStatus = previousStatuses[agentId];
        
        if (previousStatus && previousStatus !== currentStatus) {
          // Status changed, show notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Agent Status Changed',
            message: `Agent ${agentId} is now ${currentStatus}`
          });
        }
      }

      // Save current statuses as previous for next check
      await chrome.storage.local.set({ previousAgentStatuses: currentStatuses });
    } catch (error) {
      console.error('Error checking status change notifications:', error);
    }
  }

  async showNotification(notification) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: notification.title || 'Multi-Agent Platform',
      message: notification.message
    });
  }

  async startMonitoring() {
    console.log('Starting monitoring services');
    // Additional monitoring logic can be added here
  }

  async syncData() {
    try {
      if (!this.authToken) {
        throw new Error('Not authenticated');
      }

      // Sync all relevant data
      await Promise.all([
        this.syncAgentStatuses(),
        this.checkNotifications()
      ]);

      return { success: true };
    } catch (error) {
      console.error('Data sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async loadScheduledTasks() {
    try {
      const result = await chrome.storage.local.get(['scheduledTasks']);
      const tasks = result.scheduledTasks || {};
      
      this.scheduledTasks.clear();
      Object.entries(tasks).forEach(([id, task]) => {
        this.scheduledTasks.set(id, task);
      });

      console.log(`Loaded ${this.scheduledTasks.size} scheduled tasks`);
    } catch (error) {
      console.error('Error loading scheduled tasks:', error);
    }
  }

  async saveScheduledTasks() {
    try {
      const tasks = Object.fromEntries(this.scheduledTasks);
      await chrome.storage.local.set({ scheduledTasks: tasks });
    } catch (error) {
      console.error('Error saving scheduled tasks:', error);
    }
  }

  async updateSettings(newSettings) {
    console.log('Settings updated:', newSettings);
    
    if (newSettings.apiBaseUrl) {
      this.apiBaseUrl = newSettings.apiBaseUrl;
      await this.checkConnection();
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();