/**
 * Explorer API Client
 * 
 * This module provides a client for interacting with the blockchain API
 * from the Explorer UI.
 */

// API endpoint (adjust based on your node configuration)
const API_BASE_URL = 'http://localhost:8080';

/**
 * Fetch node information
 * @returns {Promise<Object>} Node information
 */
async function fetchNodeInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/info`);
    if (!response.ok) throw new Error('Failed to fetch node info');
    return await response.json();
  } catch (error) {
    console.error('Error fetching node info:', error);
    throw error;
  }
}

/**
 * Fetch blocks
 * @param {number} limit - Maximum number of blocks to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of blocks
 */
async function fetchBlocks(limit = 10, offset = 0) {
  try {
    const response = await fetch(`${API_BASE_URL}/blocks?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch blocks');
    const data = await response.json();
    return data.blocks || [];
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
}

/**
 * Fetch block by hash
 * @param {string} hash - Block hash
 * @returns {Promise<Object>} Block data
 */
async function fetchBlockByHash(hash) {
  try {
    const response = await fetch(`${API_BASE_URL}/blocks/${hash}`);
    if (!response.ok) throw new Error('Failed to fetch block');
    const data = await response.json();
    return data.block;
  } catch (error) {
    console.error('Error fetching block:', error);
    throw error;
  }
}

/**
 * Fetch transactions
 * @param {number} limit - Maximum number of transactions to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of transactions
 */
async function fetchTransactions(limit = 10, offset = 0) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Fetch transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>} Transaction data
 */
async function fetchTransactionById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`);
    if (!response.ok) throw new Error('Failed to fetch transaction');
    const data = await response.json();
    return data.transaction;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
}

/**
 * Fetch address information
 * @param {string} address - Wallet address
 * @returns {Promise<Object>} Address information including balance and transactions
 */
async function fetchAddressInfo(address) {
  try {
    const response = await fetch(`${API_BASE_URL}/address/${address}`);
    if (!response.ok) throw new Error('Failed to fetch address info');
    return await response.json();
  } catch (error) {
    console.error('Error fetching address info:', error);
    throw error;
  }
}

/**
 * Fetch smart contracts
 * @param {number} limit - Maximum number of contracts to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} List of smart contracts
 */
async function fetchContracts(limit = 10, offset = 0) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch contracts');
    const data = await response.json();
    return data.contracts || [];
  } catch (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }
}

/**
 * Fetch contract by address
 * @param {string} address - Contract address
 * @returns {Promise<Object>} Contract data
 */
async function fetchContractByAddress(address) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${address}`);
    if (!response.ok) throw new Error('Failed to fetch contract');
    const data = await response.json();
    return data.contract;
  } catch (error) {
    console.error('Error fetching contract:', error);
    throw error;
  }
}

/**
 * Submit a transaction
 * @param {Object} transaction - Transaction data
 * @returns {Promise<Object>} Transaction result
 */
async function submitTransaction(transaction) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transaction)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit transaction');
    }
    return await response.json();
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw error;
  }
}

/**
 * Deploy a smart contract
 * @param {Object} contractData - Contract data including bytecode and ABI
 * @returns {Promise<Object>} Deployment result
 */
async function deployContract(contractData) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contractData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deploy contract');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deploying contract:', error);
    throw error;
  }
}

/**
 * Call a smart contract method
 * @param {string} address - Contract address
 * @param {Object} callData - Call data including method and parameters
 * @returns {Promise<Object>} Call result
 */
async function callContract(address, callData) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${address}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to call contract');
    }
    return await response.json();
  } catch (error) {
    console.error('Error calling contract:', error);
    throw error;
  }
}

// Export API functions
window.explorerApi = {
  fetchNodeInfo,
  fetchBlocks,
  fetchBlockByHash,
  fetchTransactions,
  fetchTransactionById,
  fetchAddressInfo,
  fetchContracts,
  fetchContractByAddress,
  submitTransaction,
  deployContract,
  callContract
};