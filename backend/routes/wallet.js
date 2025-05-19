/**
 * Wallet API Routes for Crypto Trust Bank Blockchain
 * 
 * This module provides API endpoints for wallet operations including:
 * - Creating and loading wallets
 * - Managing accounts
 * - Signing transactions
 * - Checking balances
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const WalletBridge = require('../../node/src/wallet-bridge');

// Initialize wallet bridge
const walletBridge = new WalletBridge({
  dataDir: path.join(__dirname, '..', 'data', 'wallets')
  // In production, we would pass the blockchain connection here
});


/**
 * @route   POST /api/wallet/create
 * @desc    Create a new wallet
 * @access  Public
 */
router.post('/create', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    // Use wallet bridge to create wallet
    const result = await walletBridge.createWallet(password);
    
    res.status(201).json({
      success: true,
      walletId: result.walletId,
      address: result.address
    });
  } catch (err) {
    console.error('Wallet creation error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create wallet' });
  }
});


/**
 * @route   POST /api/wallet/load
 * @desc    Load an existing wallet
 * @access  Public
 */
router.post('/load', async (req, res) => {
  try {
    const { walletId, password } = req.body;
    
    if (!walletId || !password) {
      return res.status(400).json({ success: false, message: 'Wallet ID and password are required' });
    }
    
    // Use wallet bridge to load wallet
    const result = await walletBridge.loadWallet(walletId, password);
    
    res.json({
      success: true,
      address: result.address,
      accounts: result.accounts
    });
  } catch (err) {
    console.error('Wallet loading error:', err);
    if (err.message === 'Wallet not found') {
      return res.status(404).json({ success: false, message: err.message });
    } else if (err.message === 'Invalid password') {
      return res.status(401).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to load wallet' });
  }
});

/**
 * @route   GET /api/wallet/balance/:address
 * @desc    Get wallet balance
 * @access  Public
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await walletBridge.getBalance(address);
    
    res.json({
      success: true,
      address,
      balance
    });
  } catch (err) {
    console.error('Balance check error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to get balance' });
  }
});

/**
 * @route   GET /api/wallet/transactions/:address
 * @desc    Get wallet transaction history
 * @access  Public
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const transactions = await walletBridge.getTransactions(address);
    
    res.json({
      success: true,
      address,
      transactions
    });
  } catch (err) {
    console.error('Transaction history error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to get transaction history' });
  }
});

/**
 * @route   POST /api/wallet/send
 * @desc    Send a transaction
 * @access  Public
 */
router.post('/send', async (req, res) => {
  try {
    const { walletId, password, recipient, amount, fee = 0.001, data } = req.body;
    
    if (!walletId || !password || !recipient || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet ID, password, recipient, and amount are required' 
      });
    }
    
    // Use wallet bridge to send transaction
    const result = await walletBridge.sendTransaction({
      walletId,
      password,
      recipient,
      amount: parseFloat(amount),
      fee: parseFloat(fee),
      data
    });
    
    res.json({
      success: true,
      transactionId: result.transactionId,
      sender: result.sender || walletId,
      recipient,
      amount: parseFloat(amount),
      fee: parseFloat(fee)
    });
  } catch (err) {
    console.error('Send transaction error:', err);
    if (err.message === 'Wallet not found') {
      return res.status(404).json({ success: false, message: err.message });
    } else if (err.message.includes('Invalid password')) {
      return res.status(401).json({ success: false, message: 'Invalid password or transaction error' });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to send transaction' });
  }
});


module.exports = router;