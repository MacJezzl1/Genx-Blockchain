/**
 * GENX Token Contract Template
 * 
 * This module provides a standard ERC-20 like token contract template for the
 * Crypto Trust Bank blockchain platform.
 */

class TokenContract {
  /**
   * Create a new token contract
   * @param {Object} params - Token parameters
   * @param {string} params.name - Token name
   * @param {string} params.symbol - Token symbol
   * @param {number} params.totalSupply - Total token supply
   * @param {string} params.creator - Creator's address
   */
  constructor(params) {
    this.name = params.name;
    this.symbol = params.symbol;
    this.totalSupply = params.totalSupply;
    this.creator = params.creator;
    this.balances = {};
    this.allowances = {};
    
    // Initialize creator's balance with total supply
    this.balances[this.creator] = this.totalSupply;
  }
  
  /**
   * Get the balance of an address
   * @param {string} address - Address to check
   * @returns {number} Balance
   */
  balanceOf(address) {
    return this.balances[address] || 0;
  }
  
  /**
   * Transfer tokens to another address
   * @param {string} from - Sender's address
   * @param {string} to - Recipient's address
   * @param {number} amount - Amount to transfer
   * @returns {boolean} Whether the transfer was successful
   */
  transfer(from, to, amount) {
    // Validate sender
    if (from !== this.env.sender) {
      this.env.emit('Error', { message: 'Unauthorized sender' });
      return false;
    }
    
    // Check if sender has enough balance
    if (this.balanceOf(from) < amount) {
      this.env.emit('Error', { message: 'Insufficient balance' });
      return false;
    }
    
    // Update balances
    this.balances[from] = (this.balances[from] || 0) - amount;
    this.balances[to] = (this.balances[to] || 0) + amount;
    
    // Emit transfer event
    this.env.emit('Transfer', { from, to, amount });
    
    return true;
  }
  
  /**
   * Approve another address to spend tokens
   * @param {string} owner - Owner's address
   * @param {string} spender - Spender's address
   * @param {number} amount - Amount to approve
   * @returns {boolean} Whether the approval was successful
   */
  approve(owner, spender, amount) {
    // Validate owner
    if (owner !== this.env.sender) {
      this.env.emit('Error', { message: 'Unauthorized owner' });
      return false;
    }
    
    // Initialize allowances for owner if not exists
    if (!this.allowances[owner]) {
      this.allowances[owner] = {};
    }
    
    // Set allowance
    this.allowances[owner][spender] = amount;
    
    // Emit approval event
    this.env.emit('Approval', { owner, spender, amount });
    
    return true;
  }
  
  /**
   * Get the amount of tokens approved for a spender
   * @param {string} owner - Owner's address
   * @param {string} spender - Spender's address
   * @returns {number} Approved amount
   */
  allowance(owner, spender) {
    if (!this.allowances[owner]) return 0;
    return this.allowances[owner][spender] || 0;
  }
  
  /**
   * Transfer tokens from one address to another
   * @param {string} sender - Transaction sender
   * @param {string} from - Owner's address
   * @param {string} to - Recipient's address
   * @param {number} amount - Amount to transfer
   * @returns {boolean} Whether the transfer was successful
   */
  transferFrom(sender, from, to, amount) {
    // Validate sender
    if (sender !== this.env.sender) {
      this.env.emit('Error', { message: 'Unauthorized sender' });
      return false;
    }
    
    // Check if sender has enough allowance
    const currentAllowance = this.allowance(from, sender);
    if (currentAllowance < amount) {
      this.env.emit('Error', { message: 'Insufficient allowance' });
      return false;
    }
    
    // Check if from has enough balance
    if (this.balanceOf(from) < amount) {
      this.env.emit('Error', { message: 'Insufficient balance' });
      return false;
    }
    
    // Update balances
    this.balances[from] = (this.balances[from] || 0) - amount;
    this.balances[to] = (this.balances[to] || 0) + amount;
    
    // Update allowance
    this.allowances[from][sender] -= amount;
    
    // Emit transfer event
    this.env.emit('Transfer', { from, to, amount });
    
    return true;
  }
  
  /**
   * Get token metadata
   * @returns {Object} Token metadata
   */
  getMetadata() {
    return {
      name: this.name,
      symbol: this.symbol,
      totalSupply: this.totalSupply,
      creator: this.creator,
      contractType: 'ERC20'
    };
  }
  
  /**
   * Set contract environment
   * @param {Object} env - Contract environment
   */
  setEnvironment(env) {
    this.env = env;
  }
  
  /**
   * Get contract ABI
   * @returns {Array} Contract ABI
   */
  static getABI() {
    return [
      {
        name: 'balanceOf',
        inputs: [{ name: 'address', param_type: 'string' }],
        outputs: [{ name: 'balance', param_type: 'uint256' }],
        constant: true
      },
      {
        name: 'transfer',
        inputs: [
          { name: 'from', param_type: 'string' },
          { name: 'to', param_type: 'string' },
          { name: 'amount', param_type: 'uint256' }
        ],
        outputs: [{ name: 'success', param_type: 'boolean' }],
        constant: false
      },
      {
        name: 'approve',
        inputs: [
          { name: 'owner', param_type: 'string' },
          { name: 'spender', param_type: 'string' },
          { name: 'amount', param_type: 'uint256' }
        ],
        outputs: [{ name: 'success', param_type: 'boolean' }],
        constant: false
      },
      {
        name: 'allowance',
        inputs: [
          { name: 'owner', param_type: 'string' },
          { name: 'spender', param_type: 'string' }
        ],
        outputs: [{ name: 'amount', param_type: 'uint256' }],
        constant: true
      },
      {
        name: 'transferFrom',
        inputs: [
          { name: 'sender', param_type: 'string' },
          { name: 'from', param_type: 'string' },
          { name: 'to', param_type: 'string' },
          { name: 'amount', param_type: 'uint256' }
        ],
        outputs: [{ name: 'success', param_type: 'boolean' }],
        constant: false
      },
      {
        name: 'getMetadata',
        inputs: [],
        outputs: [{ name: 'metadata', param_type: 'object' }],
        constant: true
      }
    ];
  }
}

module.exports = TokenContract;