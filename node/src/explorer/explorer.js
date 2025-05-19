/**
 * GENX Blockchain Explorer Integration
 * 
 * This script connects the Explorer UI to the blockchain API and handles
 * the display of blockchain data in the UI.
 */

// Import API client
document.addEventListener('DOMContentLoaded', () => {
  // Load the API client script
  const apiScript = document.createElement('script');
  apiScript.src = 'api.js';
  apiScript.onload = initExplorer;
  document.head.appendChild(apiScript);
});

// State variables
let blocks = [];
let transactions = [];
let contracts = [];
let isConnected = false;
let refreshInterval;

// DOM Elements
let nodeStatus, statusIndicator, blockchainHeight, transactionCount, peerCount, validatorStatus;
let searchInput, searchButton, tabButtons, tabPanes;
let blocksTableBody, transactionsTableBody, contractsTableBody;
let modal, modalTitle, modalContent, closeButton;

/**
 * Initialize the explorer
 */
async function initExplorer() {
  // Get DOM elements
  nodeStatus = document.getElementById('node-status');
  statusIndicator = document.querySelector('.status-indicator');
  blockchainHeight = document.getElementById('blockchain-height');
  transactionCount = document.getElementById('transaction-count');
  peerCount = document.getElementById('peer-count');
  validatorStatus = document.getElementById('validator-status');
  searchInput = document.getElementById('search-input');
  searchButton = document.getElementById('search-button');
  tabButtons = document.querySelectorAll('.tab-button');
  tabPanes = document.querySelectorAll('.tab-pane');
  blocksTableBody = document.getElementById('blocks-table-body');
  transactionsTableBody = document.getElementById('transactions-table-body');
  contractsTableBody = document.getElementById('contracts-table-body');
  modal = document.getElementById('detail-modal');
  modalTitle = document.getElementById('modal-title');
  modalContent = document.getElementById('modal-content');
  closeButton = document.querySelector('.close-button');
  
  // Set up event listeners
  setupEventListeners();
  
  try {
    // Fetch initial data
    await fetchData();
    
    // Set up refresh interval (every 10 seconds)
    refreshInterval = setInterval(fetchData, 10000);
    
    console.log('Explorer initialized successfully');
  } catch (error) {
    console.error('Failed to initialize explorer:', error);
    updateConnectionStatus(false);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab pane
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(`${tabId}-pane`).classList.add('active');
    });
  });
  
  // Search functionality
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  });
  
  // Modal close button
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', event => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Fetch all data from the API
 */
async function fetchData() {
  try {
    // Fetch node info
    const nodeInfo = await window.explorerApi.fetchNodeInfo();
    updateNodeInfo(nodeInfo);
    
    // Fetch blocks
    blocks = await window.explorerApi.fetchBlocks(10, 0);
    renderBlocks();
    
    // Fetch transactions
    transactions = await window.explorerApi.fetchTransactions(10, 0);
    renderTransactions();
    
    // Fetch contracts
    contracts = await window.explorerApi.fetchContracts(10, 0);
    renderContracts();
    
    updateConnectionStatus(true);
  } catch (error) {
    console.error('Error fetching data:', error);
    updateConnectionStatus(false);
  }
}

/**
 * Update node information in the UI
 * @param {Object} info - Node information
 */
function updateNodeInfo(info) {
  blockchainHeight.textContent = info.blockchainHeight || 0;
  transactionCount.textContent = info.transactionCount || 0;
  peerCount.textContent = info.peerCount || 0;
  validatorStatus.textContent = info.isValidator ? 'Active' : 'Inactive';
}

/**
 * Update connection status in the UI
 * @param {boolean} connected - Whether connected to the node
 */
function updateConnectionStatus(connected) {
  isConnected = connected;
  nodeStatus.textContent = connected ? 'Connected' : 'Disconnected';
  statusIndicator.className = 'status-indicator ' + (connected ? 'online' : 'offline');
}

/**
 * Render blocks in the UI
 */
function renderBlocks() {
  if (!blocksTableBody) return;
  
  blocksTableBody.innerHTML = '';
  
  if (blocks.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="empty-message">No blocks found</td>';
    blocksTableBody.appendChild(row);
    return;
  }
  
  blocks.forEach(block => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${block.height}</td>
      <td class="hash-cell">${formatHash(block.hash)}</td>
      <td>${formatTimestamp(block.timestamp)}</td>
      <td>${block.transactions.length}</td>
      <td class="address-cell">${formatHash(block.validator)}</td>
    `;
    
    row.addEventListener('click', () => showBlockDetails(block));
    blocksTableBody.appendChild(row);
  });
}

/**
 * Render transactions in the UI
 */
function renderTransactions() {
  if (!transactionsTableBody) return;
  
  transactionsTableBody.innerHTML = '';
  
  if (transactions.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="empty-message">No transactions found</td>';
    transactionsTableBody.appendChild(row);
    return;
  }
  
  transactions.forEach(tx => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="hash-cell">${formatHash(tx.id)}</td>
      <td class="address-cell">${formatHash(tx.sender)}</td>
      <td class="address-cell">${formatHash(tx.recipient)}</td>
      <td>${tx.amount} GENX</td>
      <td>${formatTimestamp(tx.timestamp)}</td>
    `;
    
    row.addEventListener('click', () => showTransactionDetails(tx));
    transactionsTableBody.appendChild(row);
  });
}

/**
 * Render contracts in the UI
 */
function renderContracts() {
  if (!contractsTableBody) return;
  
  contractsTableBody.innerHTML = '';
  
  if (contracts.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4" class="empty-message">No contracts found</td>';
    contractsTableBody.appendChild(row);
    return;
  }
  
  contracts.forEach(contract => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="address-cell">${formatHash(contract.address)}</td>
      <td class="address-cell">${formatHash(contract.creator)}</td>
      <td>${formatTimestamp(contract.deployedAt)}</td>
      <td>${contract.abi.length} functions</td>
    `;
    
    row.addEventListener('click', () => showContractDetails(contract));
    contractsTableBody.appendChild(row);
  });
}

/**
 * Handle search functionality
 */
function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  
  // Determine search type based on query format
  if (/^[0-9]+$/.test(query)) {
    // Search by block height
    searchByBlockHeight(parseInt(query));
  } else if (query.length === 64 || query.startsWith('0x')) {
    // Search by hash (block or transaction)
    searchByHash(query);
  } else if (query.startsWith('GENX')) {
    // Search by address
    searchByAddress(query);
  } else {
    alert('Invalid search query. Please enter a block height, transaction/block hash, or address.');
  }
}

/**
 * Search by block height
 * @param {number} height - Block height
 */
async function searchByBlockHeight(height) {
  try {
    const block = await window.explorerApi.fetchBlockByHeight(height);
    if (block) {
      showBlockDetails(block);
    } else {
      alert(`Block with height ${height} not found`);
    }
  } catch (error) {
    console.error('Error searching by block height:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Search by hash (block or transaction)
 * @param {string} hash - Hash to search for
 */
async function searchByHash(hash) {
  try {
    // Try as block hash first
    const block = await window.explorerApi.fetchBlockByHash(hash);
    if (block) {
      showBlockDetails(block);
      return;
    }
    
    // Try as transaction hash
    const tx = await window.explorerApi.fetchTransactionById(hash);
    if (tx) {
      showTransactionDetails(tx);
      return;
    }
    
    alert(`No block or transaction found with hash ${hash}`);
  } catch (error) {
    console.error('Error searching by hash:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Search by address (wallet or contract)
 * @param {string} address - Address to search for
 */
async function searchByAddress(address) {
  try {
    // Try as wallet address
    const addressInfo = await window.explorerApi.fetchAddressInfo(address);
    if (addressInfo) {
      showAddressDetails(addressInfo);
      return;
    }
    
    // Try as contract address
    const contract = await window.explorerApi.fetchContractByAddress(address);
    if (contract) {
      showContractDetails(contract);
      return;
    }
    
    alert(`No wallet or contract found with address ${address}`);
  } catch (error) {
    console.error('Error searching by address:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Show block details in modal
 * @param {Object} block - Block data
 */
function showBlockDetails(block) {
  modalTitle.textContent = `Block #${block.height}`;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Hash:</span>
      <span class="detail-value">${block.hash}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Previous Hash:</span>
      <span class="detail-value">${block.previousHash}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Timestamp:</span>
      <span class="detail-value">${formatTimestamp(block.timestamp)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Validator:</span>
      <span class="detail-value">${block.validator}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Transactions:</span>
      <span class="detail-value">${block.transactions.length}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Merkle Root:</span>
      <span class="detail-value">${block.merkleRoot || 'N/A'}</span>
    </div>
    
    <h3>Transactions</h3>
    <div class="detail-transactions">
      ${block.transactions.length > 0 ? renderTransactionsList(block.transactions) : '<p>No transactions in this block</p>'}
    </div>
  `;
  
  modalContent.innerHTML = '';
  modalContent.appendChild(content);
  modal.style.display = 'block';
}

/**
 * Show transaction details in modal
 * @param {Object} tx - Transaction data
 */
function showTransactionDetails(tx) {
  modalTitle.textContent = 'Transaction Details';
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Transaction ID:</span>
      <span class="detail-value">${tx.id}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">From:</span>
      <span class="detail-value">${tx.sender}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">To:</span>
      <span class="detail-value">${tx.recipient}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Amount:</span>
      <span class="detail-value">${tx.amount} GENX</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Fee:</span>
      <span class="detail-value">${tx.fee} GENX</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Timestamp:</span>
      <span class="detail-value">${formatTimestamp(tx.timestamp)}</span>
    </div>
    ${tx.blockHeight ? `
    <div class="detail-item">
      <span class="detail-label">Block:</span>
      <span class="detail-value">#${tx.blockHeight}</span>
    </div>` : ''}
    ${tx.data ? `
    <div class="detail-item">
      <span class="detail-label">Data:</span>
      <span class="detail-value"><pre>${JSON.stringify(tx.data, null, 2)}</pre></span>
    </div>` : ''}
  `;
  
  modalContent.innerHTML = '';
  modalContent.appendChild(content);
  modal.style.display = 'block';
}

/**
 * Show contract details in modal
 * @param {Object} contract - Contract data
 */
function showContractDetails(contract) {
  modalTitle.textContent = 'Smart Contract';
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Address:</span>
      <span class="detail-value">${contract.address}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Creator:</span>
      <span class="detail-value">${contract.creator}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Deployed At:</span>
      <span class="detail-value">${formatTimestamp(contract.deployedAt)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Block:</span>
      <span class="detail-value">#${contract.blockHeight || 'N/A'}</span>
    </div>
    
    <h3>Contract ABI</h3>
    <div class="contract-abi">
      ${renderContractABI(contract.abi)}
    </div>
  `;
  
  modalContent.innerHTML = '';
  modalContent.appendChild(content);
  modal.style.display = 'block';
}

/**
 * Show address details in modal
 * @param {Object} addressInfo - Address information
 */
function showAddressDetails(addressInfo) {
  modalTitle.textContent = 'Address Details';
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Address:</span>
      <span class="detail-value">${addressInfo.address}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Balance:</span>
      <span class="detail-value">${addressInfo.balance} GENX</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Transaction Count:</span>
      <span class="detail-value">${addressInfo.transactions.length}</span>
    </div>
    
    <h3>Transactions</h3>
    <div class="detail-transactions">
      ${addressInfo.transactions.length > 0 ? renderTransactionsList(addressInfo.transactions) : '<p>No transactions for this address</p>'}
    </div>
  `;
  
  modalContent.innerHTML = '';
  modalContent.appendChild(content);
  modal.style.display = 'block';
}

/**
 * Render a list of transactions
 * @param {Array} transactions - List of transactions
 * @returns {string} HTML for transaction list
 */
function renderTransactionsList(transactions) {
  return `
    <table class="detail-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>From</th>
          <th>To</th>
          <th>Amount</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(tx => `
          <tr class="detail-table-row" data-id="${tx.id}">
            <td>${formatHash(tx.id)}</td>
            <td>${formatHash(tx.sender)}</td>
            <td>${formatHash(tx.recipient)}</td>
            <td>${tx.amount} GENX</td>
            <td>${formatTimestamp(tx.timestamp)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Render contract ABI
 * @param {Array} abi - Contract ABI
 * @returns {string} HTML for ABI display
 */
function renderContractABI(abi) {
  if (!abi || abi.length === 0) {
    return '<p>No ABI available for this contract</p>';
  }
  
  return `
    <table class="detail-table">
      <thead>
        <tr>
          <th>Function</th>
          <th>Inputs</th>
          <th>Outputs</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${abi.map(func => `
          <tr>
            <td>${func.name}</td>
            <td>${formatABIParams(func.inputs)}</td>
            <td>${formatABIParams(func.outputs)}</td>
            <td>${func.constant ? 'Read' : 'Write'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Format ABI parameters
 * @param {Array} params - ABI parameters
 * @returns {string} Formatted parameters
 */
function formatABIParams(params) {
  if (!params || params.length === 0) {
    return 'None';
  }
  
  return params.map(param => `${param.name}: ${param.param_type}`).join(', ');
}

/**
 * Format a timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date and time
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format a hash for display
 * @param {string} hash - Hash to format
 * @returns {string} Formatted hash
 */
function formatHash(hash) {
  if (!hash) return 'N/A';
  
  // If hash is longer than 16 characters, truncate it
  if (hash.length > 16) {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  }
  
  return hash;
}