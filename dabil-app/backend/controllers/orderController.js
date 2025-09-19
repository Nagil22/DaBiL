exports.createOrder = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { sessionId, items, notes } = req.body;
    
    if (!sessionId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Session ID and items are required' });
    }
    
    // Validate each item
    for (let item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Each item must have menuItemId and valid quantity' });
      }
    }
    
    // Verify session belongs to user and is active
    const sessionResult = await pool.query(
      'SELECT id, restaurant_id FROM sessions WHERE id = $1 AND user_id = $2 AND status = $3',
      [sessionId, req.userId, 'active']
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }
    
    // Calculate totals
    let subtotal = 0;
    const menuItemIds = items.map(item => item.menuItemId);
    
    const menuResult = await pool.query(
      'SELECT id, price FROM menu_items WHERE id = ANY($1)',
      [menuItemIds]
    );
    
    const menuPrices = {};
    menuResult.rows.forEach(item => {
      menuPrices[item.id] = parseFloat(item.price);
    });
    
    // Calculate subtotal
    items.forEach(item => {
      const price = menuPrices[item.menuItemId];
      if (price) {
        subtotal += price * item.quantity;
      }
    });
    
    const totalAmount = subtotal; // No tax/service charge for MVP
    const orderNumber = `ORD${Date.now()}`;
    
    // Create order
    const result = await pool.query(`
      INSERT INTO orders (session_id, order_number, items, subtotal, total_amount, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [sessionId, orderNumber, JSON.stringify(items), subtotal, totalAmount, notes]);
    
    res.status(201).json({
      order: result.rows[0],
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create order error:', error);
    const { handleDatabaseError } = require('../middleware/errorHandler');
    const dbError = handleDatabaseError(error);
    res.status(dbError.status).json({ error: dbError.message });
  }
};

// Update the serveOrder function in orderController.js
exports.serveOrder = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { orderId } = req.params;
    
    await pool.query('BEGIN');
    
    // Get order details with restaurant info
    const orderResult = await pool.query(`
      SELECT o.*, s.user_id, s.restaurant_id, r.restaurant_type, r.name as restaurant_name
      FROM orders o 
      JOIN sessions s ON o.session_id = s.id 
      JOIN restaurants r ON s.restaurant_id = r.id
      WHERE o.id = $1 AND o.status = $2
    `, [orderId, 'pending']);
    
    if (orderResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found or already processed' });
    }
    
    const order = orderResult.rows[0];
    
    // Get user's current loyalty tier
    const loyaltyResult = await pool.query(
      'SELECT current_tier FROM loyalty_points WHERE user_id = $1',
      [order.user_id]
    );
    const userTier = loyaltyResult.rows[0]?.current_tier || 'bronze';
    
    // Calculate loyalty points using the database function
    const pointsResult = await pool.query(
      'SELECT calculate_loyalty_points($1, $2, $3) as points',
      [order.total_amount, order.restaurant_type, userTier]
    );
    const loyaltyPointsEarned = pointsResult.rows[0].points;
    
    // Check wallet balance
    const walletResult = await pool.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [order.user_id]
    );
    
    const wallet = walletResult.rows[0];
    const currentBalance = parseFloat(wallet.balance);
    
    if (currentBalance < order.total_amount) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    
    const newBalance = currentBalance - order.total_amount;
    
    // Update wallet
    await pool.query(
      'UPDATE wallets SET balance = $1, total_spent = total_spent + $2, last_transaction_at = CURRENT_TIMESTAMP WHERE id = $3',
      [newBalance, order.total_amount, wallet.id]
    );
    
    // Record transaction
    const reference = `order_${orderId}_${Date.now()}`;
    await pool.query(`
      INSERT INTO transactions (wallet_id, order_id, amount, transaction_type, reference, description, balance_before, balance_after, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [wallet.id, orderId, order.total_amount, 'debit', reference, `Order payment - ${order.restaurant_name}`, currentBalance, newBalance, 'completed']);
    
    // Award loyalty points
    await pool.query(
      'UPDATE loyalty_points SET points_balance = points_balance + $1, lifetime_points_earned = lifetime_points_earned + $1, last_earned_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [loyaltyPointsEarned, order.user_id]
    );
    
    // Update user's loyalty tier based on lifetime points
    await updateLoyaltyTier(pool, order.user_id);
    
    // Update order status
    await pool.query(
      'UPDATE orders SET status = $1, served_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['served', orderId]
    );
    
    // Update session total spent
    await pool.query(
      'UPDATE sessions SET total_spent = total_spent + $1, loyalty_points_earned = loyalty_points_earned + $2 WHERE id = $3',
      [order.total_amount, loyaltyPointsEarned, order.session_id]
    );
    
    await pool.query('COMMIT');
    
    res.json({
      success: true,
      newBalance,
      amountCharged: order.total_amount,
      loyaltyPointsEarned,
      message: `Order served successfully! Customer earned ${loyaltyPointsEarned} loyalty points.`
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Serve order error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to update loyalty tier
async function updateLoyaltyTier(pool, userId) {
  try {
    const result = await pool.query(
      'SELECT lifetime_points_earned FROM loyalty_points WHERE user_id = $1',
      [userId]
    );
    
    const lifetimePoints = result.rows[0]?.lifetime_points_earned || 0;
    let newTier = 'bronze';
    
    // Tier thresholds
    if (lifetimePoints >= 10000) {
      newTier = 'platinum';
    } else if (lifetimePoints >= 5000) {
      newTier = 'gold';
    } else if (lifetimePoints >= 2000) {
      newTier = 'silver';
    }
    
    // Update tier if changed
    await pool.query(
      'UPDATE loyalty_points SET current_tier = $1 WHERE user_id = $2',
      [newTier, userId]
    );
    
  } catch (error) {
    console.error('Failed to update loyalty tier:', error);
  }
}

exports.requestPaymentConfirmation = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { orderId } = req.params;
    
    // Update order status to awaiting_payment
    await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['awaiting_payment', orderId]
    );
    
    res.json({
      success: true,
      message: 'Payment confirmation requested'
    });
  } catch (error) {
    console.error('Request payment confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(
      'SELECT status FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const status = result.rows[0].status;
    
    res.json({
      confirmed: status === 'payment_confirmed',
      declined: status === 'payment_declined',
      pending: status === 'awaiting_payment'
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { orderId } = req.params;
    
    // Update order status to payment_confirmed
    await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['payment_confirmed', orderId]
    );
    
    res.json({
      success: true,
      message: 'Payment confirmed'
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.declinePayment = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { orderId } = req.params;
    
    // Update order status back to pending
    await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['pending', orderId]
    );
    
    res.json({
      success: true,
      message: 'Payment declined'
    });
  } catch (error) {
    console.error('Decline payment error:', error);
    res.status(500).json({ error: error.message });
  }
};
