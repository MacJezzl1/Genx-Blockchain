/**
 * GENX Blockchain Explorer
 * 
 * This script handles the UI interactions and data fetching for the blockchain explorer.
 */

// API endpoint (adjust based on your node configuration)
const API_BASE_URL = 'http://localhost:8080';

// DOM Elements
const nodeStatus = document.getElementById('node-status');
const statusIndicator = document.querySelector('.status-indicator');
const blockchainHeight = document.getElementById('blockchain-height');
const transactionCount = document.getElementById('transaction-count');
const peerCount = document.getElementById('peer-count');
const validatorStatus = document.getElementById('validator-status');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const blocksTableBody = document.getElementById('blocks-table-body');
const transactionsTableBody = document.getElementById('transactions-table-body');
const contractsTableBody = document.getElementById('contracts-table-body');
const modal = document.getElementById('detail-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const closeButton = document.querySelector('.close-button');

// State
let isConnected = false;
let blocks = [];
let transactions = [];
let contracts = [];

// Initialize the explorer
async function initExplorer() {
  try {
    // Fetch initial data
    await fetchNodeInfo();
    await fetchBlocks();
    await fetchTransactions();
    await fetchContracts();
    
    // Set up refresh interval (every 10 seconds)
    setInterval(async () => {
      await fetchNodeInfo();
      await fetchBlocks();
      await fetchTransactions();
    }, 10000);
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Explorer initialized successfully');
  } catch (error) {
    console.error('Failed to initialize explorer:', error);
    updateConnectionStatus(false);
  }
}

// Fetch node information
async function fetchNodeInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/info`);
    if (!response.ok) throw new Error('Failed to fetch node info');
    
    const data = await response.json();
    updateNodeInfo(data);
    updateConnectionStatus(true);
    return data;
  } catch (error) {
    console.error('Error fetching node info:', error);
    updateConnectionStatus(false);
    throw error;
  }
}

// Fetch blocks
async function fetchBlocks() {
  try {
    const response = await fetch(`${API_BASE_URL}/blocks`);
    if (!response.ok) throw new Error('Failed to fetch blocks');
    
    const data = await response.json();
    blocks = data.blocks || [];
    renderBlocks();
    return blocks;
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
}

// Fetch transactions
async function fetchTransactions() {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    
    const data = await response.json();
    transactions = data.transactions || [];
    renderTransactions();
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

// Fetch contracts
async function fetchContracts() {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts`);
    if (!response.ok) throw new Error('Failed to fetch contracts');
    
    const data = await response.json();
    contracts = data.contracts || [];
    renderContracts();
    return contracts;
  } catch (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }
}

// Update node information in the UI
function updateNodeInfo(data) {
  blockchainHeight.textContent = data.blockchain?.height || 0;
  transactionCount.textContent = data.blockchain?.mempool_size || 0;
  peerCount.textContent = data.peers || 0;
  validatorStatus.textContent = data.is_validator ? 'Active' : 'Inactive';
  validatorStatus.style.color = data.is_validator ? 'var(--success-color)' : 'var(--text-dim)';
}

// Update connection status
function updateConnectionStatus(connected) {
  isConnected = connected;
  nodeStatus.textContent = connected ? 'Connected' : 'Disconnected';
  statusIndicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
}

// Render blocks in the table
function renderBlocks() {
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
      <td>${block.index}</td>
      <td class="hash-cell">${block.hash}</td>
      <td>${formatTimestamp(block.timestamp)}</td>
      <td>${block.transactions.length}</td>
      <td class="address-cell">${block.validator || 'Genesis'}</td>
    `;
    
    row.addEventListener('click', () => showBlockDetails(block));
    blocksTableBody.appendChild(row);
  });
}

// Render transactions in the table
function renderTransactions() {
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
      <td class="hash-cell">${tx.id}</td>
      <td class="address-cell">${tx.sender || 'Coinbase'}</td>
      <td class="address-cell">${tx.recipient}</td>
      <td>${tx.amount} GENX</td>
      <td>${formatTimestamp(tx.timestamp)}</td>
    `;
    
    row.addEventListener('click', () => showTransactionDetails(tx));
    transactionsTableBody.appendChild(row);
  });
}

// Render contracts in the table
function renderContracts() {
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
      <td class="hash-cell">${contract.address}</td>
      <td class="address-cell">${contract.creator}</td>
      <td>${formatTimestamp(contract.createdAt)}</td>
      <td>${contract.transactionCount || 0}</td>
    `;
    
    row.addEventListener('click', () => showContractDetails(contract));
    contractsTableBody.appendChild(row);
  });
}

// Show block details in modal
function showBlockDetails(block) {
  modalTitle.textContent = `Block #${block.index}`;
  
  let content = `
    <div class="detail-row">
      <div class="detail-label">Hash:</div>
      <div class="detail-value">${block.hash}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Previous Hash:</div>
      <div class="detail-value">${block.previousHash}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Timestamp:</div>
      <div class="detail-value">${formatTimestamp(block.timestamp)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Validator:</div>
      <div class="detail-value">${block.validator || 'Genesis'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Difficulty:</div>
      <div class="detail-value">${block.difficulty}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Merkle Root:</div>
      <div class="detail-value">${block.merkleRoot}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Transactions:</div>
      <div class="detail-value">${block.transactions.length}</div>
    </div>
  `;
  
  if (block.transactions.length > 0) {
    content += '<h3>Transactions</h3><div class="transaction-list">';
    block.transactions.forEach(tx => {
      content += `
        <div class="transaction-item">
          <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">${tx.id}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">From:</div>
            <div class="detail-value">${tx.sender || 'Coinbase'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">To:</div>
            <div class="detail-value">${tx.recipient}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Amount:</div>
            <div class="detail-value">${tx.amount} GENX</div>
          </div>
        </div>
      `;
    });
    content += '</div>';
  }
  
  modalContent.innerHTML = content;
  modal.style.display = 'block';
}

// Show transaction details in modal
function showTransactionDetails(tx) {
  modalTitle.textContent = 'Transaction Details';
  
  const content = `
    <div class="detail-row">
      <div class="detail-label">Transaction ID:</div>
      <div class="detail-value">${tx.id}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">From:</div>
      <div class="detail-value">${tx.sender || 'Coinbase'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">To:</div>
      <div class="detail-value">${tx.recipient}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Amount:</div>
      <div class="detail-value">${tx.amount} GENX</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Fee:</div>
      <div class="detail-value">${tx.fee || 0} GENX</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Timestamp:</div>
      <div class="detail-value">${formatTimestamp(tx.timestamp)}</div>
    </div>
    ${tx.data ? `
    <div class="detail-row">
      <div class="detail-label">Data:</div>
      <div class="detail-value">${typeof tx.data === 'object' ? JSON.stringify(tx.data, null, 2) : tx.data}</div>
    </div>
    ` : ''}
    <div class="detail-row">
      <div class="detail-label">Signature:</div>
      <div class="detail-value">${tx.signature ? JSON.stringify(tx.signature) : 'None'}</div>
    </div>
  `;
  
  modalContent.innerHTML = content;
  modal.style.display = 'block';
}

// Show contract details in modal
function showContractDetails(contract) {
  modalTitle.textContent = 'Smart Contract Details';
  
  const content = `
    <div class="detail-row">
      <div class="detail-label">Address:</div>
      <div class="detail-value">${contract.address}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Creator:</div>
      <div class="detail-value">${contract.creator}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Created:</div>
      <div class="detail-value">${formatTimestamp(contract.createdAt)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">ABI:</div>
      <div class="detail-value">${contract.abi ? JSON.stringify(contract.abi, null, 2) : 'None'}</div>
    </div>
  `;
  
  modalContent.innerHTML = content;
  modal.style.display = 'block';
}

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab pane
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(`${tabName}-pane`).classList.add('active');
    });
  });
  
  // Search functionality
  searchButton.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
  
  // Close modal
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// Perform search
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  
  try {
    // Try to search by block hash
    const blockResponse = await fetch(`${API_BASE_URL}/blocks/${query}`);
    if (blockResponse.ok) {
      const block = await blockResponse.json();
      showBlockDetails(block);
      return;
    }
    
    // Try to search by transaction ID
    const txResponse = await fetch(`${API_BASE_URL}/transactions/${query}`);
    if (txResponse.ok) {
      const tx = await txResponse.json();
      showTransactionDetails(tx);
      return;
    }
    
    // Try to search by address
    const addressResponse = await fetch(`${API_BASE_URL}/wallet/${query}`);
    if (addressResponse.ok) {
      const wallet = await addressResponse.json();
      showAddressDetails(wallet);
      return;
    }
    
    // No results found
    alert('No results found for your search query');
  } catch (error) {
    console.error('Search error:', error);
    alert('Error performing search');
  }
}

// Show address details in modal
function showAddressDetails(wallet) {
  modalTitle.textContent = 'Address Details';
  
  let content = `
    <div class="detail-row">
      <div class="detail-label">Address:</div>
      <div class="detail-value">${wallet.address}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Balance:</div>
      <div class="detail-value">${wallet.balance} GENX</div>
    </div>
  `;
  
  if (wallet.transactions && wallet.transactions.length > 0) {
    content += '<h3>Transactions</h3><div class="transaction-list">';
    wallet.transactions.forEach(tx => {
      content += `
        <div class="transaction-item">
          <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">${tx.id}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Type:</div>
            <div class="detail-value">${tx.sender === wallet.address ? 'Sent' : 'Received'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">${tx.sender === wallet.address ? 'To' : 'From'}:</div>
            <div class="detail-value">${tx.sender === wallet.address ? tx.recipient : (tx.sender || 'Coinbase')}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Amount:</div>
            <div class="detail-value">${tx.amount} GENX</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Time:</div>
            <div class="detail-value">${formatTimestamp(tx.timestamp)}</div>
          </div>
        </div>
      `;
    });
    content += '</div>';
  } else {
    content += '<p>No transactions found for this address.</p>';
  }
  
  modalContent.innerHTML = content;
  modal.style.display = 'block';
}

// Format timestamp to readable date
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Initialize the explorer when the page loads
document.addEventListener('DOMContentLoaded', initExplorer);