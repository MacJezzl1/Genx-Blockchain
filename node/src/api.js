/**
 * Crypto Trust Bank Blockchain API Server
 * 
 * This module provides a RESTful API for interacting with the blockchain node.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

/**
 * API server for blockchain node
 */
class ApiServer {
  /**
   * Create a new API server
   * @param {Object} node - Reference to the blockchain node
   * @param {Object} config - API configuration
   */
  constructor(node, config = {}) {
    this.node = node;
    this.config = {
      host: config.host || '127.0.0.1',
      port: config.port || 8080,
      cors: config.cors || true
    };
    this.app = express();
    this.server = null;
    
    // Configure middleware
    this.app.use(bodyParser.json());
    if (this.config.cors) {
      this.app.use(cors());
    }
    
    // Serve static files for the Explorer UI
    const explorerPath = path.join(__dirname, 'explorer');
    this.app.use('/explorer', express.static(explorerPath));
    
    // Set up routes
    this.setupRoutes();
  }
  
  /**
   * Set up API routes
   */
  setupRoutes() {
    // Root endpoint - Redirect to Explorer UI
    this.app.get('/', (req, res) => {
      res.redirect('/explorer');
    });
    
    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Crypto Trust Bank Blockchain API',
        version: '1.0.0',
        node_id: this.node.config.node_id,
        explorer_url: `/explorer`,
        endpoints: [
          '/api',
          '/info',
          '/blocks',
          '/blocks/:hash',
          '/transactions',
          '/transactions/:hash',
          '/wallet',
          '/peers',
          '/contracts'
        ]
      });
    });
    
    // Node info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        node_id: this.node.config.node_id,
        version: '1.0.0',
        peers: this.node.peers.size,
        is_validator: this.node.config.is_validator,
        blockchain: {
          // Placeholder for actual blockchain info
          height: 0,
          latest_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          difficulty: 1,
          mempool_size: this.node.mempool.size
        }
      });
    });
    
    // Blocks endpoints
    this.app.get('/blocks', (req, res) => {
      // Placeholder for actual block list
      // In a real implementation, this would return a list of recent blocks
      res.json({
        blocks: []
      });
    });
    
    this.app.get('/blocks/:hash', (req, res) => {
      const { hash } = req.params;
      
      // Placeholder for actual block retrieval
      // In a real implementation, this would look up the block by hash
      res.status(404).json({
        error: 'Block not found'
      });
    });
    
    // Transactions endpoints
    this.app.get('/transactions', (req, res) => {
      // Placeholder for actual transaction list
      // In a real implementation, this would return a list of recent transactions
      res.json({
        transactions: []
      });
    });
    
    this.app.get('/transactions/:hash', (req, res) => {
      const { hash } = req.params;
      
      // Placeholder for actual transaction retrieval
      // In a real implementation, this would look up the transaction by hash
      res.status(404).json({
        error: 'Transaction not found'
      });
    });
    
    this.app.post('/transactions', (req, res) => {
      const { transaction } = req.body;
      
      if (!transaction) {
        return res.status(400).json({
          error: 'Missing transaction data'
        });
      }
      
      // Placeholder for actual transaction submission
      // In a real implementation, this would validate and broadcast the transaction
      res.status(202).json({
        message: 'Transaction received',
        status: 'pending'
      });
    });
    
    // Wallet endpoints
    this.app.get('/wallet/:address', (req, res) => {
      const { address } = req.params;
      
      // Placeholder for actual wallet info
      // In a real implementation, this would return the wallet balance and transaction history
      res.json({
        address,
        balance: 0,
        transactions: []
      });
    });
    
    // Peers endpoint
    this.app.get('/peers', (req, res) => {
      const peers = Array.from(this.node.peers.values()).map(peer => ({
        id: peer.id,
        address: peer.address,
        connected: peer.connected,
        last_seen: peer.lastSeen,
        version: peer.version,
        height: peer.height
      }));
      
      res.json({ peers });
    });
    
    // Smart contract endpoints (placeholder)
    this.app.get('/contracts', (req, res) => {
      // Placeholder for smart contract list
      res.json({
        contracts: []
      });
    });
    
    this.app.post('/contracts', (req, res) => {
      const { contract } = req.body;
      
      if (!contract) {
        return res.status(400).json({
          error: 'Missing contract data'
        });
      }
      
      // Placeholder for contract deployment
      res.status(202).json({
        message: 'Contract deployment received',
        status: 'pending'
      });
    });
    
    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('API error:', err);
      res.status(500).json({
        error: 'Internal server error'
      });
    });
  }
  
  /**
   * Start the API server
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          console.log(`API server listening on ${this.config.host}:${this.config.port}`);
          resolve();
        });
      } catch (err) {
        console.error(`Failed to start API server: ${err.message}`);
        reject(err);
      }
    });
  }
  
  /**
   * Stop the API server
   */
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      try {
        this.server.close(() => {
          console.log('API server stopped');
          this.server = null;
          resolve();
        });
      } catch (err) {
        console.error(`Failed to stop API server: ${err.message}`);
        reject(err);
      }
    });
  }
}

module.exports = ApiServer;