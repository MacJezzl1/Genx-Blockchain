const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Import routes
const walletRoutes = require('./routes/wallet');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for tokens
let tokens = [];

// Mock user data (in a real app, this would be in a database)
let users = [
  { id: '1', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', email: 'demo@example.com' }
];

// Validation functions
const validateTokenSymbol = (symbol) => {
  // Check if alphanumeric and 3-8 characters
  const isValid = /^[a-zA-Z0-9]{3,8}$/.test(symbol);
  if (!isValid) {
    return { valid: false, message: 'Symbol must be alphanumeric and 3-8 characters long' };
  }
  
  // Check for duplicates
  const isDuplicate = tokens.some(token => token.symbol.toUpperCase() === symbol.toUpperCase());
  if (isDuplicate) {
    return { valid: false, message: 'Token symbol already exists' };
  }
  
  return { valid: true };
};

const validateTokenSupply = (supply) => {
  const numSupply = Number(supply);
  if (isNaN(numSupply) || !Number.isInteger(numSupply) || numSupply <= 0 || numSupply >= 1000000000) {
    return { valid: false, message: 'Total supply must be a positive integer less than 1 billion' };
  }
  return { valid: true };
};

// Routes

// Get all tokens
app.get('/api/tokens', (req, res) => {
  res.json(tokens);
});

// Create a new token
app.post('/api/tokens', (req, res) => {
  const { name, symbol, totalSupply, creatorId } = req.body;
  
  // Validate token symbol
  const symbolValidation = validateTokenSymbol(symbol);
  if (!symbolValidation.valid) {
    return res.status(400).json({ error: symbolValidation.message });
  }
  
  // Validate token supply
  const supplyValidation = validateTokenSupply(totalSupply);
  if (!supplyValidation.valid) {
    return res.status(400).json({ error: supplyValidation.message });
  }
  
  // Find creator (in a real app, this would be authenticated)
  const creator = users.find(user => user.id === creatorId) || { id: creatorId, address: 'Unknown' };
  
  // Create new token
  const newToken = {
    id: uuidv4(),
    name,
    symbol: symbol.toUpperCase(),
    totalSupply: Number(totalSupply),
    creatorId: creator.id,
    creatorAddress: creator.address,
    createdAt: new Date().toISOString()
  };
  
  tokens.push(newToken);
  res.status(201).json(newToken);
});

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, walletAddress } = req.body;
  
  // Mock authentication logic
  let user;
  
  if (email) {
    user = users.find(u => u.email === email);
  } else if (walletAddress) {
    user = users.find(u => u.address === walletAddress);
    
    // If wallet not found, create a new user
    if (!user && walletAddress) {
      user = {
        id: uuidv4(),
        address: walletAddress,
        email: null
      };
      users.push(user);
    }
  }
  
  if (user) {
    // In a real app, we would generate a JWT token here
    return res.json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        email: user.email
      }
    });
  }
  
  res.status(401).json({ success: false, message: 'Authentication failed' });
});

// API Routes
app.use('/api/wallet', walletRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});