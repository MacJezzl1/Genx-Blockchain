//! Wallet API for the GENX blockchain
//!
//! This module provides a high-level API for wallet operations
//! that can be used by the UI and other components.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::{Account, Wallet, WalletError, Result};
use core::transaction::Transaction;

/// Wallet API for managing wallets and accounts
pub struct WalletApi {
    /// The underlying wallet instance
    wallet: Arc<Mutex<Wallet>>,
}

impl WalletApi {
    /// Creates a new wallet API instance
    pub fn new(wallet: Wallet) -> Self {
        Self {
            wallet: Arc::new(Mutex::new(wallet)),
        }
    }
    
    /// Creates a new wallet at the given path
    pub fn create_wallet(wallet_path: PathBuf, password: &str) -> Result<Self> {
        let wallet = Wallet::create(wallet_path, password)?;
        Ok(Self::new(wallet))
    }
    
    /// Loads a wallet from the given path
    pub fn load_wallet(wallet_path: PathBuf) -> Result<Self> {
        let wallet = Wallet::load(wallet_path)?;
        Ok(Self::new(wallet))
    }
    
    /// Unlocks the wallet with the given password
    pub fn unlock(&self, password: &str) -> Result<()> {
        let mut wallet = self.wallet.lock().unwrap();
        wallet.unlock(password)
    }
    
    /// Locks the wallet
    pub fn lock(&self) -> Result<()> {
        let mut wallet = self.wallet.lock().unwrap();
        wallet.lock();
        Ok(())
    }
    
    /// Creates a new account in the wallet
    pub fn create_account(&self, label: &str) -> Result<String> {
        let mut wallet = self.wallet.lock().unwrap();
        wallet.create_account(label)
    }
    
    /// Gets all accounts in the wallet
    pub fn get_accounts(&self) -> Result<Vec<Account>> {
        let wallet = self.wallet.lock().unwrap();
        Ok(wallet.get_accounts().into_iter().cloned().collect())
    }
    
    /// Gets an account by address
    pub fn get_account(&self, address: &str) -> Result<Option<Account>> {
        let wallet = self.wallet.lock().unwrap();
        Ok(wallet.get_account(address).cloned())
    }
    
    /// Gets the default account
    pub fn get_default_account(&self) -> Result<Option<Account>> {
        let wallet = self.wallet.lock().unwrap();
        Ok(wallet.get_default_account().cloned())
    }
    
    /// Sets the default account
    pub fn set_default_account(&self, address: &str) -> Result<()> {
        let mut wallet = self.wallet.lock().unwrap();
        wallet.set_default_account(address)
    }
    
    /// Creates and signs a transaction
    pub fn create_transaction(
        &self,
        sender: &str,
        recipient: &str,
        amount: u64,
        fee: u64,
        data: Option<Vec<u8>>,
    ) -> Result<Transaction> {
        let wallet = self.wallet.lock().unwrap();
        wallet.create_transaction(sender, recipient, amount, fee, data)
    }
    
    /// Gets the wallet's balance by querying the blockchain
    pub fn get_balance(&self, address: &str) -> Result<u64> {
        // In a real implementation, this would query the blockchain
        // for the account balance
        
        // For now, we'll just return a dummy balance
        Ok(1000)
    }
}