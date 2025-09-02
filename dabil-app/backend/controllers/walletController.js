const axios = require('axios');

exports.getBalance = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const result = await pool.query(
      'SELECT balance, total_funded, total_spent, currency FROM wallets WHERE user_id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const wallet = result.rows[0];
    res.json({ 
      balance: parseFloat(wallet.balance),
      totalFunded: parseFloat(wallet.total_funded),
      totalSpent: parseFloat(wallet.total_spent),
      currency: wallet.currency
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.fundWallet = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { amount, email } = req.body;
    
    // Validate input
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum funding amount is ₦100' });
    }
    
    if (amount > 500000) {
      return res.status(400).json({ error: 'Maximum funding amount is ₦500,000' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required for payment' });
    }
    
    const reference = `dabil_${req.userId}_${Date.now()}`;
    
    // Initialize Paystack payment
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100, // Convert to kobo
        reference,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/callback`,
        metadata: {
          user_id: req.userId,
          purpose: 'wallet_funding'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Store pending transaction
    await pool.query(`
      INSERT INTO transactions (
        wallet_id, 
        amount, 
        transaction_type, 
        reference, 
        external_reference,
        status,
        description,
        balance_before,
        balance_after
      ) VALUES (
        (SELECT id FROM wallets WHERE user_id = $1),
        $2,
        'credit',
        $3,
        $3,
        'pending',
        'Wallet funding via Paystack',
        (SELECT balance FROM wallets WHERE user_id = $1),
        (SELECT balance FROM wallets WHERE user_id = $1)
      )
    `, [req.userId, amount, reference]);
    
    res.json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
      access_code: response.data.data.access_code
    });
  } catch (error) {
    console.error('Fund wallet error:', error);
    
    if (error.response?.data) {
      return res.status(400).json({ 
        error: 'Payment initialization failed',
        details: error.response.data.message
      });
    }
    
    const { handleDatabaseError } = require('../middleware/errorHandler');
    const dbError = handleDatabaseError(error);
    res.status(dbError.status).json({ error: dbError.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { reference } = req.params;
    
    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );
    
    const paymentData = response.data.data;
    
    if (paymentData.status === 'success') {
      const amount = paymentData.amount / 100; // Convert from kobo
      
      // Start transaction
      await pool.query('BEGIN');
      
      try {
        // Get current wallet balance
        const walletResult = await pool.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1',
          [req.userId]
        );
        
        const wallet = walletResult.rows[0];
        const newBalance = parseFloat(wallet.balance) + amount;
        
        // Update wallet balance
        await pool.query(
          'UPDATE wallets SET balance = $1, total_funded = total_funded + $2, last_transaction_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newBalance, amount, wallet.id]
        );
        
        // Update transaction status
        await pool.query(
          'UPDATE transactions SET status = $1, balance_after = $2, processed_at = CURRENT_TIMESTAMP WHERE reference = $3',
          ['completed', newBalance, reference]
        );
        
        // REMOVED: No loyalty points for wallet funding
        // Loyalty points should only be earned when spending at restaurants
        
        await pool.query('COMMIT');
        
        res.json({ 
          success: true, 
          amount,
          newBalance,
          loyaltyPointsEarned: 0, // Always 0 for wallet funding
          message: 'Wallet funded successfully'
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } else {
      // Update transaction as failed
      await pool.query(
        'UPDATE transactions SET status = $1 WHERE reference = $2',
        ['failed', reference]
      );
      
      res.status(400).json({ 
        error: 'Payment verification failed',
        status: paymentData.status
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    
    if (error.response?.data) {
      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: error.response.data.message
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        t.*,
        CASE 
          WHEN o.id IS NOT NULL THEN json_build_object('id', o.id, 'order_number', o.order_number)
          ELSE NULL
        END as order_details
      FROM transactions t
      LEFT JOIN orders o ON t.order_id = o.id
      WHERE t.wallet_id = (SELECT id FROM wallets WHERE user_id = $1)
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.userId, limit, offset]);
    
    const transactions = result.rows.map(tx => ({
      ...tx,
      amount: parseFloat(tx.amount),
      balance_before: parseFloat(tx.balance_before),
      balance_after: parseFloat(tx.balance_after)
    }));
    
    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.debitWallet = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { amount, orderId, description } = req.body;
    
    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Get current wallet balance
      const walletResult = await pool.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1',
        [req.userId]
      );
      
      if (walletResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      const wallet = walletResult.rows[0];
      const currentBalance = parseFloat(wallet.balance);
      
      // Check sufficient balance
      if (currentBalance < amount) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      
      const newBalance = currentBalance - amount;
      
      // Update wallet balance
      await pool.query(
        'UPDATE wallets SET balance = $1, total_spent = total_spent + $2, last_transaction_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newBalance, amount, wallet.id]
      );
      
      // Record transaction
      const reference = `debit_${req.userId}_${Date.now()}`;
      await pool.query(`
        INSERT INTO transactions (
          wallet_id, 
          order_id,
          amount, 
          transaction_type, 
          reference,
          description,
          balance_before,
          balance_after,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [wallet.id, orderId, amount, 'debit', reference, description, currentBalance, newBalance, 'completed']);
      
      await pool.query('COMMIT');
      
      res.json({ 
        success: true,
        newBalance,
        amountDebited: amount,
        reference
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Debit wallet error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.redeemPoints = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { points } = req.body;
    
    if (!points || points <= 0 || points % 4 !== 0) {
      return res.status(400).json({ error: 'Points must be positive and divisible by 4' });
    }
    
    const walletCredit = Math.floor(points / 4); // 4 points = ₦1
    
    await pool.query('BEGIN');
    
    try {
      // Check loyalty points balance
      const loyaltyResult = await pool.query(
        'SELECT points_balance FROM loyalty_points WHERE user_id = $1',
        [req.userId]
      );
      
      if (loyaltyResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Loyalty account not found' });
      }
      
      const currentPoints = loyaltyResult.rows[0].points_balance;
      
      if (currentPoints < points) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient points balance' });
      }
      
      // Get wallet
      const walletResult = await pool.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1',
        [req.userId]
      );
      
      const wallet = walletResult.rows[0];
      const newWalletBalance = parseFloat(wallet.balance) + walletCredit;
      
      // Update wallet
      await pool.query(
        'UPDATE wallets SET balance = $1, last_transaction_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newWalletBalance, wallet.id]
      );
      
      // Update loyalty points
      await pool.query(
        'UPDATE loyalty_points SET points_balance = points_balance - $1, lifetime_points_redeemed = lifetime_points_redeemed + $1, last_redeemed_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [points, req.userId]
      );
      
      // Record transaction
      const reference = `redeem_${req.userId}_${Date.now()}`;
      await pool.query(`
        INSERT INTO transactions (wallet_id, amount, transaction_type, reference, description, balance_before, balance_after, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [wallet.id, walletCredit, 'bonus', reference, `Points redemption: ${points} points`, wallet.balance, newWalletBalance, 'completed']);
      
      await pool.query('COMMIT');
      
      res.json({
        success: true,
        pointsRedeemed: points,
        walletCredited: walletCredit,
        newWalletBalance,
        message: 'Points redeemed successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ error: error.message });
  }
};