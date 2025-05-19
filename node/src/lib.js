/**
 * Crypto Trust Bank Blockchain Node Library
 * 
 * This module provides the core Node class and configuration for the blockchain node.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { NetworkManager } = require('./network');

/**
 * Node configuration class
 */
class NodeConfig {
  constructor() {
    // Node identity
    this.node_id = null;
    this.data_dir = './data';
    
    // Network configuration
    this.network_config = null;
    
    // Validator settings
    this.is_validator = false;
    this.validator_key = null;
    
    // Blockchain settings
    this.genesis_file = null;
    this.max_peers = 50;
    this.sync_interval = 30000; // 30 seconds
    
    // API settings
    this.api_enabled = true;
    this.api_port = 8080;
    this.api_host = '127.0.0.1';
  }
  
  /**
   * Load configuration from a file
   * @param {string} configPath - Path to the configuration file
   */
  loadFromFile(configPath) {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(this, configData);
      return true;
    } catch (err) {
      console.error(`Failed to load configuration: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Save configuration to a file
   * @param {string} configPath - Path to save the configuration
   */
  saveToFile(configPath) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this, null, 2));
      return true;
    } catch (err) {
      console.error(`Failed to save configuration: ${err.message}`);
      return false;
    }
  }
}

/**
 * Main blockchain node class
 */
class Node extends EventEmitter {
  /**
   * Create a new blockchain node
   * @param {NodeConfig} config - Node configuration
   */
  constructor(config) {
    super();
    this.config = config || new NodeConfig();
    this.isRunning = false;
    this.blockchain = null; // Will hold the blockchain instance
    this.mempool = new Map(); // Transaction memory pool
    this.peers = new Map(); // Connected peers
    this.networkManager = null;
    this.apiServer = null;
    
    // Bind methods to maintain 'this' context
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.handleNewBlock = this.handleNewBlock.bind(this);
    this.handleNewTransaction = this.handleNewTransaction.bind(this);
  }
  
  /**
   * Initialize the node
   */
  async initialize() {
    console.log('Initializing blockchain node...');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.config.data_dir)) {
      fs.mkdirSync(this.config.data_dir, { recursive: true });
    }
    
    // Initialize blockchain (placeholder)
    // In a real implementation, this would load the blockchain from disk
    // or create a new one if it doesn't exist
    console.log('Loading blockchain...');
    // this.blockchain = new Blockchain(this.config);
    
    // Initialize network manager
    this.networkManager = new NetworkManager(this.config.network_config, this);
    
    // Set up event listeners
    this.networkManager.on('peer:connect', this.handlePeerConnect.bind(this));
    this.networkManager.on('peer:disconnect', this.handlePeerDisconnect.bind(this));
    this.networkManager.on('message:block', this.handleNewBlock);
    this.networkManager.on('message:transaction', this.handleNewTransaction);
    
    console.log('Node initialization complete');
  }
  
  /**
   * Start the node
   */
  async start() {
    if (this.isRunning) {
      console.log('Node is already running');
      return;
    }
    
    try {
      // Initialize the node
      await this.initialize();
      
      // Start the network manager
      await this.networkManager.start();
      
      // Start API server if enabled
      if (this.config.api_enabled) {
        // Placeholder for API server initialization
        console.log(`API server listening on ${this.config.api_host}:${this.config.api_port}`);
      }
      
      // Start blockchain synchronization
      this.syncInterval = setInterval(() => {
        this.synchronizeChain();
      }, this.config.sync_interval);
      
      this.isRunning = true;
      this.emit('node:started');
      console.log('Node started successfully');
    } catch (err) {
      console.error(`Failed to start node: ${err.message}`);
      throw err;
    }
  }
  
  /**
   * Stop the node
   */
  async stop() {
    if (!this.isRunning) {
      console.log('Node is not running');
      return;
    }
    
    try {
      // Stop synchronization
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
      
      // Stop API server
      if (this.apiServer) {
        // Placeholder for API server shutdown
        console.log('Stopping API server...');
      }
      
      // Stop network manager
      await this.networkManager.stop();
      
      // Save blockchain state
      console.log('Saving blockchain state...');
      // In a real implementation, this would save the blockchain to disk
      
      this.isRunning = false;
      this.emit('node:stopped');
      console.log('Node stopped successfully');
    } catch (err) {
      console.error(`Failed to stop node: ${err.message}`);
      throw err;
    }
  }
  
  /**
   * Synchronize the blockchain with peers
   */
  async synchronizeChain() {
    if (!this.isRunning || this.peers.size === 0) {
      return;
    }
    
    console.log('Synchronizing blockchain with peers...');
    // In a real implementation, this would request the latest blocks from peers
    // and update the local blockchain if needed
  }
  
  /**
   * Handle a new block received from the network
   * @param {Object} data - Block data
   * @param {string} peerId - ID of the peer that sent the block
   */
  handleNewBlock(data, peerId) {
    console.log(`Received new block from peer ${peerId}`);
    // In a real implementation, this would validate the block and add it to the blockchain
  }
  
  /**
   * Handle a new transaction received from the network
   * @param {Object} data - Transaction data
   * @param {string} peerId - ID of the peer that sent the transaction
   */
  handleNewTransaction(data, peerId) {
    console.log(`Received new transaction from peer ${peerId}`);
    // In a real implementation, this would validate the transaction and add it to the mempool
  }
  
  /**
   * Handle a new peer connection
   * @param {Object} peer - Peer information
   */
  handlePeerConnect(peer) {
    console.log(`Connected to peer: ${peer.id}`);
    this.peers.set(peer.id, peer);
    this.emit('peer:added', peer);
  }
  
  /**
   * Handle a peer disconnection
   * @param {string} peerId - ID of the disconnected peer
   */
  handlePeerDisconnect(peerId) {
    console.log(`Disconnected from peer: ${peerId}`);
    this.peers.delete(peerId);
    this.emit('peer:removed', peerId);
  }
}

module.exports = {
  Node,
  NodeConfig
};