/**
 * Crypto Trust Bank Blockchain Network Manager
 * 
 * This module provides P2P networking functionality for the blockchain node.
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Network configuration class
 */
class NetworkConfig {
  constructor() {
    this.listen_addr = '127.0.0.1:8333';
    this.bootstrap_peers = [];
    this.max_outbound = 8;
    this.max_inbound = 32;
    this.handshake_timeout = 5000; // 5 seconds
    this.ping_interval = 30000; // 30 seconds
    this.connection_retry_interval = 10000; // 10 seconds
    this.connection_retry_max = 5;
  }
}

/**
 * Message types for P2P communication
 */
const MessageType = {
  HANDSHAKE: 'handshake',
  PING: 'ping',
  PONG: 'pong',
  GET_PEERS: 'get_peers',
  PEERS: 'peers',
  GET_BLOCKS: 'get_blocks',
  BLOCKS: 'blocks',
  GET_TRANSACTIONS: 'get_transactions',
  TRANSACTION: 'transaction',
  BLOCK: 'block'
};

/**
 * Peer class representing a connection to another node
 */
class Peer {
  /**
   * Create a new peer
   * @param {string} id - Peer ID
   * @param {WebSocket} socket - WebSocket connection
   * @param {string} address - Peer address
   * @param {boolean} outbound - Whether this is an outbound connection
   */
  constructor(id, socket, address, outbound = false) {
    this.id = id;
    this.socket = socket;
    this.address = address;
    this.outbound = outbound;
    this.connected = true;
    this.handshakeCompleted = false;
    this.lastSeen = Date.now();
    this.version = null;
    this.height = 0;
  }
  
  /**
   * Send a message to the peer
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  send(type, data = {}) {
    if (!this.connected) return false;
    
    try {
      const message = JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      });
      
      this.socket.send(message);
      this.lastSeen = Date.now();
      return true;
    } catch (err) {
      console.error(`Failed to send message to peer ${this.id}: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Close the connection to the peer
   */
  disconnect() {
    if (!this.connected) return;
    
    try {
      this.socket.close();
    } catch (err) {
      console.error(`Error closing connection to peer ${this.id}: ${err.message}`);
    } finally {
      this.connected = false;
    }
  }
}

/**
 * Network manager for P2P communication
 */
class NetworkManager extends EventEmitter {
  /**
   * Create a new network manager
   * @param {NetworkConfig} config - Network configuration
   * @param {Object} node - Reference to the parent node
   */
  constructor(config, node) {
    super();
    this.config = config || new NetworkConfig();
    this.node = node;
    this.server = null;
    this.peers = new Map();
    this.knownAddresses = new Set();
    this.connectionAttempts = new Map();
    this.isRunning = false;
    this.pingInterval = null;
    
    // Parse listen address
    const [host, portStr] = this.config.listen_addr.split(':');
    this.listenHost = host;
    this.listenPort = parseInt(portStr, 10);
    
    // Bind methods to maintain 'this' context
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.connectToPeer = this.connectToPeer.bind(this);
    this.handleConnection = this.handleConnection.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }
  
  /**
   * Start the network manager
   */
  async start() {
    if (this.isRunning) {
      console.log('Network manager is already running');
      return;
    }
    
    try {
      // Start WebSocket server
      this.server = new WebSocket.Server({
        host: this.listenHost,
        port: this.listenPort
      });
      
      // Set up server event handlers
      this.server.on('connection', this.handleConnection);
      this.server.on('error', (err) => {
        console.error(`WebSocket server error: ${err.message}`);
        this.emit('error', err);
      });
      
      console.log(`P2P server listening on ${this.listenHost}:${this.listenPort}`);
      
      // Connect to bootstrap peers
      if (this.config.bootstrap_peers.length > 0) {
        console.log(`Connecting to ${this.config.bootstrap_peers.length} bootstrap peers...`);
        for (const peerAddr of this.config.bootstrap_peers) {
          this.connectToPeer(peerAddr);
        }
      }
      
      // Start ping interval
      this.pingInterval = setInterval(() => {
        this.pingPeers();
      }, this.config.ping_interval);
      
      this.isRunning = true;
      this.emit('network:started');
    } catch (err) {
      console.error(`Failed to start network manager: ${err.message}`);
      throw err;
    }
  }
  
  /**
   * Stop the network manager
   */
  async stop() {
    if (!this.isRunning) {
      console.log('Network manager is not running');
      return;
    }
    
    try {
      // Clear ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      // Disconnect all peers
      for (const peer of this.peers.values()) {
        peer.disconnect();
      }
      this.peers.clear();
      
      // Close server
      if (this.server) {
        this.server.close();
        this.server = null;
      }
      
      this.isRunning = false;
      this.emit('network:stopped');
      console.log('Network manager stopped');
    } catch (err) {
      console.error(`Failed to stop network manager: ${err.message}`);
      throw err;
    }
  }
  
  /**
   * Connect to a peer
   * @param {string} address - Peer address (host:port)
   */
  async connectToPeer(address) {
    if (!this.isRunning) return false;
    if (this.knownAddresses.has(address)) return false;
    
    // Check if we've reached the maximum number of outbound connections
    const outboundCount = Array.from(this.peers.values()).filter(p => p.outbound).length;
    if (outboundCount >= this.config.max_outbound) {
      console.log('Maximum outbound connections reached');
      return false;
    }
    
    // Check if we've exceeded the maximum number of connection attempts
    const attempts = this.connectionAttempts.get(address) || 0;
    if (attempts >= this.config.connection_retry_max) {
      console.log(`Maximum connection attempts reached for ${address}`);
      return false;
    }
    
    try {
      console.log(`Connecting to peer: ${address}`);
      
      // Update connection attempts
      this.connectionAttempts.set(address, attempts + 1);
      
      // Connect to the peer
      const socket = new WebSocket(`ws://${address}`);
      
      // Set up socket event handlers
      socket.on('open', () => {
        const peerId = uuidv4();
        const peer = new Peer(peerId, socket, address, true);
        this.peers.set(peerId, peer);
        this.knownAddresses.add(address);
        
        // Send handshake
        this.sendHandshake(peer);
        
        console.log(`Connected to peer: ${address} (${peerId})`);
        this.emit('peer:connect', peer);
      });
      
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          const peerId = Array.from(this.peers.values())
            .find(p => p.socket === socket)?.id;
          
          if (peerId) {
            this.handleMessage(message, peerId);
          }
        } catch (err) {
          console.error(`Failed to parse message: ${err.message}`);
        }
      });
      
      socket.on('close', () => {
        const peerId = Array.from(this.peers.values())
          .find(p => p.socket === socket)?.id;
        
        if (peerId) {
          this.peers.delete(peerId);
          console.log(`Disconnected from peer: ${address} (${peerId})`);
          this.emit('peer:disconnect', peerId);
        }
      });
      
      socket.on('error', (err) => {
        console.error(`Socket error for peer ${address}: ${err.message}`);
        
        // Schedule retry
        setTimeout(() => {
          this.connectToPeer(address);
        }, this.config.connection_retry_interval);
      });
      
      return true;
    } catch (err) {
      console.error(`Failed to connect to peer ${address}: ${err.message}`);
      
      // Schedule retry
      setTimeout(() => {
        this.connectToPeer(address);
      }, this.config.connection_retry_interval);
      
      return false;
    }
  }
  
  /**
   * Handle a new WebSocket connection
   * @param {WebSocket} socket - WebSocket connection
   * @param {Object} request - HTTP request
   */
  handleConnection(socket, request) {
    // Check if we've reached the maximum number of inbound connections
    const inboundCount = Array.from(this.peers.values()).filter(p => !p.outbound).length;
    if (inboundCount >= this.config.max_inbound) {
      console.log('Maximum inbound connections reached');
      socket.close();
      return;
    }
    
    // Get peer address
    const address = request.socket.remoteAddress;
    const peerId = uuidv4();
    
    console.log(`Incoming connection from: ${address} (${peerId})`);
    
    // Create peer
    const peer = new Peer(peerId, socket, address, false);
    this.peers.set(peerId, peer);
    
    // Set up socket event handlers
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message, peerId);
      } catch (err) {
        console.error(`Failed to parse message from ${peerId}: ${err.message}`);
      }
    });
    
    socket.on('close', () => {
      this.peers.delete(peerId);
      console.log(`Disconnected from peer: ${address} (${peerId})`);
      this.emit('peer:disconnect', peerId);
    });
    
    socket.on('error', (err) => {
      console.error(`Socket error for peer ${peerId}: ${err.message}`);
    });
    
    // Set handshake timeout
    setTimeout(() => {
      const peer = this.peers.get(peerId);
      if (peer && !peer.handshakeCompleted) {
        console.log(`Handshake timeout for peer ${peerId}`);
        peer.disconnect();
        this.peers.delete(peerId);
      }
    }, this.config.handshake_timeout);
  }
  
  /**
   * Handle a message from a peer
   * @param {Object} message - Message object
   * @param {string} peerId - ID of the peer that sent the message
   */
  handleMessage(message, peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    
    // Update last seen timestamp
    peer.lastSeen = Date.now();
    
    // Handle message based on type
    switch (message.type) {
      case MessageType.HANDSHAKE:
        this.handleHandshake(message.data, peer);
        break;
        
      case MessageType.PING:
        peer.send(MessageType.PONG);
        break;
        
      case MessageType.PONG:
        // Nothing to do, peer is alive
        break;
        
      case MessageType.GET_PEERS:
        this.handleGetPeers(peer);
        break;
        
      case MessageType.PEERS:
        this.handlePeers(message.data, peer);
        break;
        
      case MessageType.BLOCK:
        this.emit('message:block', message.data, peerId);
        break;
        
      case MessageType.TRANSACTION:
        this.emit('message:transaction', message.data, peerId);
        break;
        
      case MessageType.GET_BLOCKS:
        this.emit('message:get_blocks', message.data, peerId);
        break;
        
      case MessageType.BLOCKS:
        this.emit('message:blocks', message.data, peerId);
        break;
        
      case MessageType.GET_TRANSACTIONS:
        this.emit('message:get_transactions', message.data, peerId);
        break;
        
      default:
        console.log(`Unknown message type from peer ${peerId}: ${message.type}`);
    }
  }
  
  /**
   * Send a handshake message to a peer
   * @param {Peer} peer - Peer to send handshake to
   */
  sendHandshake(peer) {
    const handshakeData = {
      version: '1.0.0',
      node_id: this.node.config.node_id,
      listen_addr: this.config.listen_addr,
      height: 0 // Current blockchain height (placeholder)
    };
    
    peer.send(MessageType.HANDSHAKE, handshakeData);
  }
  
  /**
   * Handle a handshake message from a peer
   * @param {Object} data - Handshake data
   * @param {Peer} peer - Peer that sent the handshake
   */
  handleHandshake(data, peer) {
    // Validate handshake data
    if (!data.version || !data.node_id) {
      console.log(`Invalid handshake from peer ${peer.id}`);
      peer.disconnect();
      return;
    }
    
    // Update peer information
    peer.version = data.version;
    peer.height = data.height || 0;
    peer.handshakeCompleted = true;
    
    console.log(`Handshake completed with peer ${peer.id} (version: ${peer.version}, height: ${peer.height})`);
    
    // If this is an inbound connection, send our handshake
    if (!peer.outbound) {
      this.sendHandshake(peer);
    }
    
    // Request peers
    peer.send(MessageType.GET_PEERS);
  }
  
  /**
   * Handle a get_peers message from a peer
   * @param {Peer} peer - Peer that sent the message
   */
  handleGetPeers(peer) {
    // Collect peer addresses to share
    const peerAddresses = Array.from(this.knownAddresses);
    
    // Send peers message
    peer.send(MessageType.PEERS, { peers: peerAddresses });
  }
  
  /**
   * Handle a peers message from a peer
   * @param {Object} data - Peers data
   * @param {Peer} peer - Peer that sent the message
   */
  handlePeers(data, peer) {
    if (!data.peers || !Array.isArray(data.peers)) {
      console.log(`Invalid peers message from peer ${peer.id}`);
      return;
    }
    
    console.log(`Received ${data.peers.length} peer addresses from ${peer.id}`);
    
    // Add new addresses to known addresses and try to connect
    for (const address of data.peers) {
      if (!this.knownAddresses.has(address)) {
        this.connectToPeer(address);
      }
    }
  }
  
  /**
   * Ping all connected peers
   */
  pingPeers() {
    const now = Date.now();
    const timeout = this.config.ping_interval * 2;
    
    for (const [peerId, peer] of this.peers.entries()) {
      // Check if peer has timed out
      if (now - peer.lastSeen > timeout) {
        console.log(`Peer ${peerId} timed out`);
        peer.disconnect();
        this.peers.delete(peerId);
        this.emit('peer:disconnect', peerId);
        continue;
      }
      
      // Send ping
      peer.send(MessageType.PING);
    }
  }
  
  /**
   * Broadcast a message to all connected peers
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @param {string} excludePeerId - ID of peer to exclude from broadcast
   */
  broadcast(type, data, excludePeerId = null) {
    let count = 0;
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (peerId !== excludePeerId && peer.handshakeCompleted) {
        if (peer.send(type, data)) {
          count++;
        }
      }
    }
    
    return count;
  }
  
  /**
   * Broadcast a transaction to all connected peers
   * @param {Object} transaction - Transaction data
   * @param {string} excludePeerId - ID of peer to exclude from broadcast
   */
  broadcastTransaction(transaction, excludePeerId = null) {
    return this.broadcast(MessageType.TRANSACTION, transaction, excludePeerId);
  }
  
  /**
   * Broadcast a block to all connected peers
   * @param {Object} block - Block data
   * @param {string} excludePeerId - ID of peer to exclude from broadcast
   */
  broadcastBlock(block, excludePeerId = null) {
    return this.broadcast(MessageType.BLOCK, block, excludePeerId);
  }
}

module.exports = {
  NetworkManager,
  NetworkConfig,
  MessageType,
  Peer
};