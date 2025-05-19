/**
 * Crypto Trust Bank Blockchain Wallet
 * 
 * This module provides wallet functionality for the blockchain node,
 * including key generation, transaction signing, and balance checking.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EC } = require('elliptic');
const { Transaction } = require('./blockchain');

// Initialize elliptic curve for cryptographic operations
const ec = new EC('secp256k1');

/**
 * Wallet class for managing keys and transactions
 */
class Wallet {
  /**
   * Create a new wallet
   * @param {Object} options - Wallet options
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || './data/wallets';
    this.keyPair = null;
    this.publicKey = null;
    this.privateKey = null;
    this.address = null;
    this.blockchain = options.blockchain || null;
  }
  
  /**
   * Initialize the wallet
   */
  initialize() {
    // Create wallet directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  /**
   * Generate a new key pair
   * @returns {Object} Generated key pair
   */
  generateKeyPair() {
    this.keyPair = ec.genKeyPair();
    this.privateKey = this.keyPair.getPrivate('hex');
    this.publicKey = this.keyPair.getPublic('hex');
    this.address = this.publicKey;
    
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address
    };
  }
  
  /**
   * Import a private key
   * @param {string} privateKey - Private key in hex format
   * @returns {Object} Imported key pair
   */
  importPrivateKey(privateKey) {
    try {
      this.keyPair = ec.keyFromPrivate(privateKey, 'hex');
      this.privateKey = privateKey;
      this.publicKey = this.keyPair.getPublic('hex');
      this.address = this.publicKey;
      
      return {
        privateKey: this.privateKey,
        publicKey: this.publicKey,
        address: this.address
      };
    } catch (err) {
      throw new Error(`Invalid private key: ${err.message}`);
    }
  }
  
  /**
   * Save the wallet to a file
   * @param {string} password - Password to encrypt the wallet
   * @param {string} filename - Wallet filename
   * @returns {boolean} Whether the wallet was saved successfully
   */
  saveWallet(password, filename = 'wallet.json') {
    if (!this.privateKey) {
      throw new Error('No wallet to save');
    }
    
    try {
      // Encrypt the private key with the password
      const cipher = crypto.createCipher('aes-256-cbc', password);
      let encryptedKey = cipher.update(this.privateKey, 'utf8', 'hex');
      encryptedKey += cipher.final('hex');
      
      const walletData = {
        address: this.address,
        publicKey: this.publicKey,
        encryptedPrivateKey: encryptedKey,
        createdAt: Date.now()
      };
      
      const walletPath = path.join(this.dataDir, filename);
      fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
      
      return true;
    } catch (err) {
      throw new Error(`Failed to save wallet: ${err.message}`);
    }
  }
  
  /**
   * Load a wallet from a file
   * @param {string} password - Password to decrypt the wallet
   * @param {string} filename - Wallet filename
   * @returns {Object} Loaded wallet
   */
  loadWallet(password, filename = 'wallet.json') {
    try {
      const walletPath = path.join(this.dataDir, filename);
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      
      // Decrypt the private key
      const decipher = crypto.createDecipher('aes-256-cbc', password);
      let decryptedKey = decipher.update(walletData.encryptedPrivateKey, 'hex', 'utf8');
      decryptedKey += decipher.final('utf8');
      
      // Import the private key
      this.importPrivateKey(decryptedKey);
      
      return {
        privateKey: this.privateKey,
        publicKey: this.publicKey,
        address: this.address
      };
    } catch (err) {
      throw new Error(`Failed to load wallet: ${err.message}`);
    }
  }
  
  /**
   * Get the wallet balance
   * @returns {number} Wallet balance
   */
  getBalance() {
    if (!this.blockchain || !this.address) {
      throw new Error('Blockchain not connected or wallet not initialized');
    }
    
    return this.blockchain.getBalance(this.address);
  }
  
  /**
   * Get the wallet transaction history
   * @returns {Transaction[]} Transaction history
   */
  getTransactionHistory() {
    if (!this.blockchain || !this.address) {
      throw new Error('Blockchain not connected or wallet not initialized');
    }
    
    return this.blockchain.getTransactionsByAddress(this.address);
  }
  
  /**
   * Create a new transaction
   * @param {string} recipient - Recipient address
   * @param {number} amount - Transaction amount
   * @param {number} fee - Transaction fee
   * @param {Object} data - Additional transaction data
   * @returns {Transaction} Created transaction
   */
  createTransaction(recipient, amount, fee = 0, data = null) {
    if (!this.privateKey) {
      throw new Error('Wallet not initialized');
    }
    
    if (!this.blockchain) {
      throw new Error('Blockchain not connected');
    }
    
    // Check balance
    const balance = this.getBalance();
    if (balance < amount + fee) {
      throw new Error(`Insufficient balance: ${balance} < ${amount + fee}`);
    }
    
    // Create transaction
    const tx = new Transaction({
      sender: this.address,
      recipient,
      amount,
      fee,
      data,
      timestamp: Date.now(),
      nonce: Math.floor(Math.random() * 1000000) // Simple nonce implementation
    });
    
    // Sign transaction
    tx.sign(this.privateKey);
    
    return tx;
  }
  
  /**
   * Send a transaction to the blockchain
   * @param {string} recipient - Recipient address
   * @param {number} amount - Transaction amount
   * @param {number} fee - Transaction fee
   * @param {Object} data - Additional transaction data
   * @returns {Transaction} Sent transaction
   */
  sendTransaction(recipient, amount, fee = 0, data = null) {
    const tx = this.createTransaction(recipient, amount, fee, data);
    
    // Add transaction to blockchain
    if (this.blockchain.addTransaction(tx)) {
      return tx;
    } else {
      throw new Error('Failed to add transaction to blockchain');
    }
  }
  
  /**
   * List all wallets in the data directory
   * @returns {string[]} List of wallet filenames
   */
  static listWallets(dataDir = './data/wallets') {
    if (!fs.existsSync(dataDir)) {
      return [];
    }
    
    return fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'));
  }
}

module.exports = Wallet;