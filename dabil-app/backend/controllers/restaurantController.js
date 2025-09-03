const QRCode = require('qrcode');

exports.getAllRestaurants = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const result = await pool.query(
      'SELECT id, name, slug, restaurant_type, cuisine_type, address, city, logo_url, status, qr_code FROM restaurants WHERE status = $1 ORDER BY name',
      ['active']
    );
    
    res.json({ restaurants: result.rows });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getRestaurant = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { id } = req.params;
    
    // Get restaurant with menu items
    const restaurantResult = await pool.query(
  'SELECT * FROM restaurants WHERE id = $1',
  [id]
);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const menuResult = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND status = $2 AND is_available = $3 ORDER BY category, sort_order',
      [id, 'active', true]
    );
    
    const restaurant = restaurantResult.rows[0];
    restaurant.menu_items = menuResult.rows;
    
    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createRestaurant = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { name, restaurant_type, cuisine_type, address, city, phone, email, password } = req.body;
    
    // Validate required fields
    if (!name || !restaurant_type || !email || !password) {
      return res.status(400).json({ error: 'Restaurant name, type, owner email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Check if user already exists with this email
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      let ownerId;

      if (existingUser.rows.length > 0) {
        // User exists, check if they're not already a restaurant owner
        const existingRestaurant = await pool.query(
          'SELECT id FROM restaurants WHERE owner_user_id = $1',
          [existingUser.rows[0].id]
        );

        if (existingRestaurant.rows.length > 0) {
          await pool.query('ROLLBACK');
          return res.status(400).json({ error: 'This user already owns a restaurant' });
        }

        ownerId = existingUser.rows[0].id;

        // Update existing user to restaurant_manager role
        await pool.query(
          'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['restaurant_manager', ownerId]
        );
      } else {
        // Create new user as restaurant manager
        const bcrypt = require('bcryptjs');
        const password_hash = await bcrypt.hash(password, 10);

        const userResult = await pool.query(
          'INSERT INTO users (email, name, password_hash, email_verified, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [email.toLowerCase(), name + ' Owner', password_hash, true, 'restaurant_manager']
        );

        ownerId = userResult.rows[0].id;
      }

      // Create slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Insert restaurant
      const restaurantResult = await pool.query(`
        INSERT INTO restaurants (name, slug, restaurant_type, cuisine_type, address, city, phone, email, owner_user_id, onboarded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `, [name, slug, restaurant_type, cuisine_type, address, city, phone, email, ownerId]);

      const restaurant = restaurantResult.rows[0];

      // Generate QR code with proper check-in URL (improved version)
      const checkInUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?restaurant_id=${restaurant.id}`;
      const qrCodeImage = await QRCode.toDataURL(checkInUrl);

      // Update restaurant with QR code
      await pool.query(
        'UPDATE restaurants SET qr_code = $1 WHERE id = $2',
        [qrCodeImage, restaurant.id]
      );

      restaurant.qr_code = qrCodeImage;

      await pool.query('COMMIT');

      res.status(201).json({ 
        restaurant,
        message: 'Restaurant and owner account created successfully. QR code generated for customer check-ins. Owner can now login with their email and password.'
      });

    } catch (innerError) {
      await pool.query('ROLLBACK');
      throw innerError;
    }

  } catch (error) {
    console.error('Create restaurant error:', error);
    const { handleDatabaseError } = require('../middleware/errorHandler');
    const dbError = handleDatabaseError(error);
    res.status(dbError.status).json({ error: dbError.message });
  }
};

exports.regenerateQRCode = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { id } = req.params;
    
    // Get restaurant
    const restaurantResult = await pool.query(
      'SELECT id, name FROM restaurants WHERE id = $1',
      [id]
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const restaurant = restaurantResult.rows[0];
    
    // Generate QR code
    const checkInUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?restaurant_id=${restaurant.id}`;
    console.log('Regenerating QR code for URL:', checkInUrl);
    
    const qrCodeImage = await QRCode.toDataURL(checkInUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Update restaurant with QR code
    await pool.query(
      'UPDATE restaurants SET qr_code = $1 WHERE id = $2',
      [qrCodeImage, restaurant.id]
    );
    
    res.json({ 
      success: true,
      qr_code: qrCodeImage,
      message: 'QR code generated successfully'
    });
  } catch (error) {
    console.error('Regenerate QR code error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.addMenuItem = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { restaurantId } = req.params;
    const { name, description, price, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Check if user owns this restaurant (for restaurant managers)
    if (req.userRole !== 'admin') { // If not admin, check ownership
      const ownershipCheck = await pool.query(
        'SELECT id FROM restaurants WHERE id = $1 AND owner_user_id = $2',
        [restaurantId, req.userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You can only add menu items to your own restaurant' });
      }
    }
    
    const result = await pool.query(`
      INSERT INTO menu_items (restaurant_id, name, description, price, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [restaurantId, name, description, price, category]);
    
    res.status(201).json({ 
      menuItem: result.rows[0],
      message: 'Menu item added successfully'
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteRestaurant = async (req, res) => {
  const pool = req.app.locals.db;
  
  try {
    const { id } = req.params;
    
    // Check if restaurant exists
    const restaurantResult = await pool.query(
      'SELECT id, name FROM restaurants WHERE id = $1',
      [id]
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // Delete the restaurant (this will cascade to related records)
    await pool.query('DELETE FROM restaurants WHERE id = $1', [id]);
    
    res.json({ 
      message: `Restaurant "${restaurantResult.rows[0].name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
};