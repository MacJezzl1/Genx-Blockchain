/**
 * Crypto Trust Bank Blockchain Genesis Block Creator
 * 
 * This module creates the genesis block for the blockchain with the initial
 * GENX coin distribution.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Create a genesis block with initial GENX distribution
 * @param {Object} config - Genesis configuration
 * @returns {Object} Genesis block
 */
function createGenesisBlock(config = {}) {
  const timestamp = config.timestamp || Date.now();
  const genesisAddress = config.genesisAddress || 'GENX0000000000000000000000000000000000000000';
  const totalSupply = 21000000; // 21 million GENX, like Bitcoin
  
  // Initial distribution
  const initialDistribution = {
    // Genesis address gets 70% of supply
    [genesisAddress]: Math.floor(totalSupply * 0.7),
    
    // Reserve 20% for validators
    'GENX0000000000000000000000000000000000VALIDATORS': Math.floor(totalSupply * 0.2),
    
    // Reserve 10% for development fund
    'GENX0000000000000000000000000000000000DEVFUND': Math.floor(totalSupply * 0.1)
  };
  
  // Create transactions for initial distribution
  const transactions = Object.entries(initialDistribution).map(([address, amount]) => ({
    id: crypto.createHash('sha256').update(`genesis-${address}-${amount}`).digest('hex'),
    timestamp,
    sender: 'GENESIS',
    recipient: address,
    amount,
    fee: 0,
    data: 'genesis_allocation'
  }));
  
  // Create genesis block
  const genesisBlock = {
    height: 0,
    hash: '0000000000000000000000000000000000000000000000000000000000000000',
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    timestamp,
    transactions,
    validator: 'GENESIS',
    signature: 'GENESIS_SIGNATURE',
    merkleRoot: calculateMerkleRoot(transactions),
    difficulty: 1,
    nonce: 0
  };
  
  // Calculate the actual block hash
  genesisBlock.hash = calculateBlockHash(genesisBlock);
  
  return genesisBlock;
}

/**
 * Calculate the Merkle root of transactions
 * @param {Array} transactions - List of transactions
 * @returns {string} Merkle root hash
 */
function calculateMerkleRoot(transactions) {
  if (transactions.length === 0) {
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }
  
  // Get transaction hashes
  const hashes = transactions.map(tx => tx.id);
  
  // If only one transaction, return its hash
  if (hashes.length === 1) {
    return hashes[0];
  }
  
  // Build the Merkle tree
  let tree = hashes;
  
  // Continue until we reach the root
  while (tree.length > 1) {
    const level = [];
    
    // Process pairs of nodes
    for (let i = 0; i < tree.length; i += 2) {
      const left = tree[i];
      const right = (i + 1 < tree.length) ? tree[i + 1] : left;
      
      // Hash the pair
      const hash = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
      
      level.push(hash);
    }
    
    tree = level;
  }
  
  return tree[0];
}

/**
 * Calculate the hash of a block
 * @param {Object} block - Block data
 * @returns {string} Block hash
 */
function calculateBlockHash(block) {
  const blockData = {
    height: block.height,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    transactions: block.transactions.map(tx => tx.id),
    merkleRoot: block.merkleRoot,
    validator: block.validator,
    difficulty: block.difficulty,
    nonce: block.nonce
  };
  
  return crypto.createHash('sha256')
    .update(JSON.stringify(blockData))
    .digest('hex');
}

/**
 * Save genesis block to file
 * @param {Object} genesisBlock - Genesis block
 * @param {string} dataDir - Data directory
 * @returns {Promise} Promise that resolves when the file is saved
 */
async function saveGenesisBlock(genesisBlock, dataDir) {
  const genesisPath = path.join(dataDir, 'genesis.json');
  
  return new Promise((resolve, reject) => {
    fs.writeFile(genesisPath, JSON.stringify(genesisBlock, null, 2), (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`Genesis block saved to ${genesisPath}`);
      resolve(genesisPath);
    });
  });
}

/**
 * Initialize blockchain with genesis block
 * @param {Object} config - Genesis configuration
 * @param {string} dataDir - Data directory
 * @returns {Promise<Object>} Genesis block
 */
async function initializeBlockchain(config, dataDir) {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const genesisPath = path.join(dataDir, 'genesis.json');
  
  // Check if genesis block already exists
  if (fs.existsSync(genesisPath)) {
    console.log('Genesis block already exists, loading from file...');
    const genesisData = fs.readFileSync(genesisPath, 'utf8');
    return JSON.parse(genesisData);
  }
  
  // Create and save genesis block
  console.log('Creating genesis block...');
  const genesisBlock = createGenesisBlock(config);
  await saveGenesisBlock(genesisBlock, dataDir);
  
  return genesisBlock;
}

module.exports = {
  createGenesisBlock,
  initializeBlockchain,
  saveGenesisBlock
};