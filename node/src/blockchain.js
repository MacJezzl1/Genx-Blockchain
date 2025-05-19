/**
 * Crypto Trust Bank Blockchain Core
 * 
 * This module provides the core blockchain functionality including blocks,
 * transactions, and chain state management.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const { EC } = require('elliptic');
const merkle = require('merkle');

// Initialize elliptic curve for cryptographic operations
const ec = new EC('secp256k1');

/**
 * Transaction class
 */
class Transaction {
  /**
   * Create a new transaction
   * @param {Object} data - Transaction data
   */
  constructor(data) {
    this.id = data.id || uuidv4();
    this.timestamp = data.timestamp || Date.now();
    this.sender = data.sender;
    this.recipient = data.recipient;
    this.amount = data.amount;
    this.fee = data.fee || 0;
    this.signature = data.signature || null;
    this.data = data.data || null; // For smart contract calls
    this.nonce = data.nonce || 0; // For preventing replay attacks
  }
  
  /**
   * Calculate the transaction hash
   * @returns {string} Transaction hash
   */
  calculateHash() {
    const data = {
      id: this.id,
      timestamp: this.timestamp,
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      fee: this.fee,
      data: this.data,
      nonce: this.nonce
    };
    
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }
  
  /**
   * Sign the transaction with a private key
   * @param {string} privateKey - Private key in hex format
   */
  sign(privateKey) {
    const keyPair = ec.keyFromPrivate(privateKey);
    const hash = this.calculateHash();
    const signature = keyPair.sign(hash);
    this.signature = {
      r: signature.r.toString(16),
      s: signature.s.toString(16)
    };
    return this;
  }
  
  /**
   * Verify the transaction signature
   * @returns {boolean} Whether the signature is valid
   */
  verifySignature() {
    // Skip verification for coinbase transactions (no sender)
    if (!this.sender) return true;
    
    try {
      const hash = this.calculateHash();
      const keyPair = ec.keyFromPublic(this.sender, 'hex');
      return keyPair.verify(hash, this.signature);
    } catch (err) {
      console.error(`Signature verification error: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Serialize the transaction to JSON
   * @returns {Object} JSON representation of the transaction
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      fee: this.fee,
      signature: this.signature,
      data: this.data,
      nonce: this.nonce
    };
  }
  
  /**
   * Create a transaction from JSON
   * @param {Object} data - JSON representation of the transaction
   * @returns {Transaction} New transaction instance
   */
  static fromJSON(data) {
    return new Transaction(data);
  }
  
  /**
   * Create a coinbase transaction (block reward)
   * @param {string} recipient - Recipient address
   * @param {number} amount - Reward amount
   * @returns {Transaction} Coinbase transaction
   */
  static createCoinbase(recipient, amount) {
    return new Transaction({
      sender: null, // Coinbase transactions have no sender
      recipient,
      amount,
      fee: 0,
      timestamp: Date.now(),
      data: 'coinbase'
    });
  }
}

/**
 * Block class
 */
class Block {
  /**
   * Create a new block
   * @param {Object} data - Block data
   */
  constructor(data) {
    this.index = data.index || 0;
    this.timestamp = data.timestamp || Date.now();
    this.transactions = data.transactions || [];
    this.previousHash = data.previousHash || '0'.repeat(64);
    this.hash = data.hash || this.calculateHash();
    this.nonce = data.nonce || 0;
    this.difficulty = data.difficulty || 1;
    this.validator = data.validator || null; // For PoS
    this.signature = data.signature || null; // For PoS
    this.merkleRoot = data.merkleRoot || this.calculateMerkleRoot();
  }
  
  /**
   * Calculate the block hash
   * @returns {string} Block hash
   */
  calculateHash() {
    const data = {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.id),
      previousHash: this.previousHash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot || this.calculateMerkleRoot(),
      validator: this.validator
    };
    
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }
  
  /**
   * Calculate the merkle root of the transactions
   * @returns {string} Merkle root hash
   */
  calculateMerkleRoot() {
    if (this.transactions.length === 0) {
      return '0'.repeat(64);
    }
    
    const txHashes = this.transactions.map(tx => tx.calculateHash());
    const tree = merkle('sha256').sync(txHashes);
    return tree.root() || '0'.repeat(64);
  }
  
  /**
   * Sign the block with a validator's private key (for PoS)
   * @param {string} privateKey - Validator's private key in hex format
   */
  sign(privateKey) {
    const keyPair = ec.keyFromPrivate(privateKey);
    const hash = this.calculateHash();
    const signature = keyPair.sign(hash);
    this.signature = {
      r: signature.r.toString(16),
      s: signature.s.toString(16)
    };
    return this;
  }
  
  /**
   * Verify the block signature (for PoS)
   * @returns {boolean} Whether the signature is valid
   */
  verifySignature() {
    if (!this.validator || !this.signature) return false;
    
    try {
      const hash = this.calculateHash();
      const keyPair = ec.keyFromPublic(this.validator, 'hex');
      return keyPair.verify(hash, this.signature);
    } catch (err) {
      console.error(`Block signature verification error: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Serialize the block to JSON
   * @returns {Object} JSON representation of the block
   */
  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      validator: this.validator,
      signature: this.signature,
      merkleRoot: this.merkleRoot
    };
  }
  
  /**
   * Create a block from JSON
   * @param {Object} data - JSON representation of the block
   * @returns {Block} New block instance
   */
  static fromJSON(data) {
    const block = new Block({
      ...data,
      transactions: data.transactions.map(tx => Transaction.fromJSON(tx))
    });
    return block;
  }
  
  /**
   * Create the genesis block
   * @param {Transaction[]} initialTransactions - Initial transactions for the genesis block
   * @returns {Block} Genesis block
   */
  static createGenesisBlock(initialTransactions = []) {
    const genesisBlock = new Block({
      index: 0,
      timestamp: Date.now(),
      transactions: initialTransactions,
      previousHash: '0'.repeat(64),
      difficulty: 1
    });
    
    genesisBlock.hash = genesisBlock.calculateHash();
    genesisBlock.merkleRoot = genesisBlock.calculateMerkleRoot();
    
    return genesisBlock;
  }
}

/**
 * Blockchain class
 */
class Blockchain extends EventEmitter {
  /**
   * Create a new blockchain
   * @param {Object} config - Blockchain configuration
   */
  constructor(config = {}) {
    super();
    this.config = {
      dataDir: config.dataDir || './data',
      blockTime: config.blockTime || 10000, // 10 seconds
      blockReward: config.blockReward || 50, // Initial block reward
      maxTransactionsPerBlock: config.maxTransactionsPerBlock || 100,
      difficultyAdjustmentInterval: config.difficultyAdjustmentInterval || 10, // blocks
      genesisAddress: config.genesisAddress || null
    };
    
    this.chain = [];
    this.mempool = new Map();
    this.utxoSet = new Map(); // Unspent transaction outputs
    this.blockHeight = -1;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the blockchain
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create data directory if it doesn't exist
      const chainDir = path.join(this.config.dataDir, 'chain');
      if (!fs.existsSync(chainDir)) {
        fs.mkdirSync(chainDir, { recursive: true });
      }
      
      // Check if blockchain data exists
      const genesisPath = path.join(chainDir, '0.json');
      if (fs.existsSync(genesisPath)) {
        // Load existing blockchain
        await this.loadChain();
      } else {
        // Create genesis block
        await this.createGenesisBlock();
      }
      
      this.isInitialized = true;
      this.emit('blockchain:initialized');
    } catch (err) {
      console.error(`Failed to initialize blockchain: ${err.message}`);
      throw err;
    }
  }
  
  /**
   * Create the genesis block
   */
  async createGenesisBlock() {
    console.log('Creating genesis block...');
    
    // Create initial distribution transaction if genesis address is provided
    const initialTransactions = [];
    if (this.config.genesisAddress) {
      const genesisTx = Transaction.createCoinbase(
        this.config.genesisAddress,
        21000000 // Total supply of GENX
      );
      initialTransactions.push(genesisTx);
    }
    
    // Create genesis block
    const genesisBlock = Block.createGenesisBlock(initialTransactions);
    
    // Add genesis block to chain
    this.chain.push(genesisBlock);
    this.blockHeight = 0;
    
    // Save genesis block to disk
    await this.saveBlock(genesisBlock);
    
    // Update UTXO set
    this.updateUTXOSet(genesisBlock);
    
    console.log(`Genesis block created with hash: ${genesisBlock.hash}`);
    this.emit('block:new', genesisBlock);
    
    return genesisBlock;
  }
  
  /**
   * Load the blockchain from disk
   */
  async loadChain() {
    console.log('Loading blockchain from disk...');
    
    const chainDir = path.join(this.config.dataDir, 'chain');
    let blockHeight = 0;
    
    // Find the highest block number
    const files = fs.readdirSync(chainDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const blockNumber = parseInt(file.split('.')[0], 10);
        if (!isNaN(blockNumber) && blockNumber > blockHeight) {
          blockHeight = blockNumber;
        }
      }
    }
    
    // Load blocks from disk
    this.chain = [];
    for (let i = 0; i <= blockHeight; i++) {
      const blockPath = path.join(chainDir, `${i}.json`);
      if (fs.existsSync(blockPath)) {
        const blockData = JSON.parse(fs.readFileSync(blockPath, 'utf8'));
        const block = Block.fromJSON(blockData);
        this.chain.push(block);
      } else {
        throw new Error(`Missing block file: ${blockPath}`);
      }
    }
    
    this.blockHeight = blockHeight;
    
    // Rebuild UTXO set
    this.rebuildUTXOSet();
    
    console.log(`Blockchain loaded with ${this.chain.length} blocks, height: ${this.blockHeight}`);
    this.emit('blockchain:loaded');
  }
  
  /**
   * Save a block to disk
   * @param {Block} block - Block to save
   */
  async saveBlock(block) {
    const chainDir = path.join(this.config.dataDir, 'chain');
    const blockPath = path.join(chainDir, `${block.index}.json`);
    
    fs.writeFileSync(blockPath, JSON.stringify(block.toJSON(), null, 2));
  }
  
  /**
   * Get the latest block in the chain
   * @returns {Block} Latest block
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }
  
  /**
   * Add a new block to the chain
   * @param {Block} block - Block to add
   * @returns {boolean} Whether the block was added successfully
   */
  async addBlock(block) {
    try {
      // Validate the block
      if (!this.isValidBlock(block, this.getLatestBlock())) {
        console.error('Invalid block, rejecting');
        return false;
      }
      
      // Add block to chain
      this.chain.push(block);
      this.blockHeight = block.index;
      
      // Save block to disk
      await this.saveBlock(block);
      
      // Update UTXO set
      this.updateUTXOSet(block);
      
      // Remove block transactions from mempool
      for (const tx of block.transactions) {
        this.mempool.delete(tx.id);
      }
      
      console.log(`Added block #${block.index} with hash: ${block.hash}`);
      this.emit('block:new', block);
      
      return true;
    } catch (err) {
      console.error(`Failed to add block: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Validate a block
   * @param {Block} block - Block to validate
   * @param {Block} previousBlock - Previous block in the chain
   * @returns {boolean} Whether the block is valid
   */
  isValidBlock(block, previousBlock) {
    // Check block index
    if (block.index !== previousBlock.index + 1) {
      console.error(`Invalid block index: ${block.index}`);
      return false;
    }
    
    // Check previous hash
    if (block.previousHash !== previousBlock.hash) {
      console.error(`Invalid previous hash: ${block.previousHash}`);
      return false;
    }
    
    // Check block hash
    if (block.hash !== block.calculateHash()) {
      console.error(`Invalid block hash: ${block.hash}`);
      return false;
    }
    
    // Check merkle root
    if (block.merkleRoot !== block.calculateMerkleRoot()) {
      console.error(`Invalid merkle root: ${block.merkleRoot}`);
      return false;
    }
    
    // Validate transactions
    for (const tx of block.transactions) {
      if (!this.isValidTransaction(tx)) {
        console.error(`Invalid transaction in block: ${tx.id}`);
        return false;
      }
    }
    
    // For PoS: verify block signature
    if (block.validator && !block.verifySignature()) {
      console.error(`Invalid block signature from validator: ${block.validator}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Add a transaction to the mempool
   * @param {Transaction} transaction - Transaction to add
   * @returns {boolean} Whether the transaction was added successfully
   */
  addTransaction(transaction) {
    // Validate transaction
    if (!this.isValidTransaction(transaction)) {
      console.error(`Invalid transaction: ${transaction.id}`);
      return false;
    }
    
    // Add to mempool
    this.mempool.set(transaction.id, transaction);
    console.log(`Added transaction to mempool: ${transaction.id}`);
    this.emit('transaction:new', transaction);
    
    return true;
  }
  
  /**
   * Validate a transaction
   * @param {Transaction} transaction - Transaction to validate
   * @returns {boolean} Whether the transaction is valid
   */
  isValidTransaction(transaction) {
    // Coinbase transactions are always valid
    if (!transaction.sender) return true;
    
    // Verify signature
    if (!transaction.verifySignature()) {
      console.error(`Invalid transaction signature: ${transaction.id}`);
      return false;
    }
    
    // Check if sender has enough balance
    const senderBalance = this.getBalance(transaction.sender);
    if (senderBalance < transaction.amount + transaction.fee) {
      console.error(`Insufficient balance for transaction: ${transaction.id}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get the balance of an address
   * @param {string} address - Address to check
   * @returns {number} Balance
   */
  getBalance(address) {
    let balance = 0;
    
    // Sum all unspent outputs for this address
    for (const [txId, outputs] of this.utxoSet.entries()) {
      for (const output of outputs) {
        if (output.recipient === address) {
          balance += output.amount;
        }
      }
    }
    
    return balance;
  }
  
  /**
   * Update the UTXO set with a new block
   * @param {Block} block - Block to process
   */
  updateUTXOSet(block) {
    for (const tx of block.transactions) {
      // Remove spent outputs
      if (tx.sender) {
        // In a real UTXO model, we would reference specific outputs
        // This is a simplified version
        const senderOutputs = this.utxoSet.get(tx.sender) || [];
        this.utxoSet.set(tx.sender, senderOutputs.filter(output => {
          return output.amount > tx.amount + tx.fee;
        }));
      }
      
      // Add new outputs
      const recipientOutputs = this.utxoSet.get(tx.recipient) || [];
      recipientOutputs.push({
        txId: tx.id,
        amount: tx.amount,
        recipient: tx.recipient
      });
      this.utxoSet.set(tx.recipient, recipientOutputs);
    }
  }
  
  /**
   * Rebuild the UTXO set from the blockchain
   */
  rebuildUTXOSet() {
    this.utxoSet.clear();
    
    for (const block of this.chain) {
      this.updateUTXOSet(block);
    }
  }
  
  /**
   * Create a new block with pending transactions
   * @param {string} validatorAddress - Address of the validator
   * @param {string} validatorPrivateKey - Private key of the validator
   * @returns {Block} New block
   */
  async createBlock(validatorAddress, validatorPrivateKey) {
    const latestBlock = this.getLatestBlock();
    const newIndex = latestBlock.index + 1;
    
    // Select transactions from mempool
    const pendingTransactions = Array.from(this.mempool.values())
      .sort((a, b) => b.fee - a.fee) // Sort by fee (highest first)
      .slice(0, this.config.maxTransactionsPerBlock);
    
    // Add coinbase transaction (block reward)
    const coinbaseTx = Transaction.createCoinbase(
      validatorAddress,
      this.config.blockReward
    );
    pendingTransactions.unshift(coinbaseTx);
    
    // Create new block
    const newBlock = new Block({
      index: newIndex,
      timestamp: Date.now(),
      transactions: pendingTransactions,
      previousHash: latestBlock.hash,
      difficulty: this.calculateDifficulty(),
      validator: validatorAddress
    });
    
    // Calculate merkle root
    newBlock.merkleRoot = newBlock.calculateMerkleRoot();
    
    // Calculate block hash
    newBlock.hash = newBlock.calculateHash();
    
    // Sign the block (for PoS)
    if (validatorPrivateKey) {
      newBlock.sign(validatorPrivateKey);
    }
    
    return newBlock;
  }
  
  /**
   * Calculate the difficulty for a new block
   * @returns {number} Difficulty
   */
  calculateDifficulty() {
    const latestBlock = this.getLatestBlock();
    
    // Adjust difficulty every N blocks
    if (latestBlock.index % this.config.difficultyAdjustmentInterval !== 0) {
      return latestBlock.difficulty;
    }
    
    // Get the first block of the current difficulty period
    const prevAdjustmentBlock = this.chain[Math.max(0, latestBlock.index - this.config.difficultyAdjustmentInterval)];
    
    // Calculate the expected time for the difficulty period
    const expectedTime = this.config.blockTime * this.config.difficultyAdjustmentInterval;
    
    // Calculate the actual time taken
    const actualTime = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    
    // Adjust difficulty based on time difference
    if (actualTime < expectedTime / 2) {
      // Too fast, increase difficulty
      return latestBlock.difficulty + 1;
    } else if (actualTime > expectedTime * 2) {
      // Too slow, decrease difficulty
      return Math.max(1, latestBlock.difficulty - 1);
    } else {
      // Within acceptable range, keep same difficulty
      return latestBlock.difficulty;
    }
  }
  
  /**
   * Get a block by index
   * @param {number} index - Block index
   * @returns {Block} Block at the specified index
   */
  getBlockByIndex(index) {
    if (index < 0 || index > this.blockHeight) {
      return null;
    }
    return this.chain[index];
  }
  
  /**
   * Get a block by hash
   * @param {string} hash - Block hash
   * @returns {Block} Block with the specified hash
   */
  getBlockByHash(hash) {
    return this.chain.find(block => block.hash === hash);
  }
  
  /**
   * Get a transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Transaction} Transaction with the specified ID
   */
  getTransactionById(id) {
    // Check mempool first
    if (this.mempool.has(id)) {
      return this.mempool.get(id);
    }
    
    // Check blocks
    for (const block of this.chain) {
      const tx = block.transactions.find(tx => tx.id === id);
      if (tx) return tx;
    }
    
    return null;
  }
  
  /**
   * Get transactions for an address
   * @param {string} address - Address to get transactions for
   * @returns {Transaction[]} Transactions involving the address
   */
  getTransactionsByAddress(address) {
    const transactions = [];
    
    // Check blocks
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.sender === address || tx.recipient === address) {
          transactions.push(tx);
        }
      }
    }
    
    return transactions;
  }
  
  /**
   * Validate the entire blockchain
   * @returns {boolean} Whether the blockchain is valid
   */
  isValidChain() {
    // Check each block
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      if (!this.isValidBlock(currentBlock, previousBlock)) {
        return false;
      }
    }
    
    return true;
  }
}

module.exports = {
  Transaction,
  Block,
  Blockchain
};