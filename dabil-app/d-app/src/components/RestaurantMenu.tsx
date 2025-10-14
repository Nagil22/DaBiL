// Update the RestaurantMenu.tsx component
import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import apiService from '../lib/apiclient';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string;
  restaurant_type: string;
  menu_items?: MenuItem[];
}

interface RestaurantMenuProps {
  restaurant: Restaurant;
  sessionId: string;
  onOrderPlace: (orderData: any) => void;
  onBack: () => void;
}

export const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ 
  restaurant, 
  sessionId, 
  onOrderPlace, 
  onBack 
}) => {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, [restaurant.id]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRestaurantMenu(restaurant.id);
      setMenuItems(response.menuItems);
    } catch (error: any) {
      console.error('Failed to fetch menu:', error);
      alert('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => ({ 
      ...prev, 
      [itemId]: Math.max((prev[itemId] || 0) - 1, 0) 
    }));
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find(i => i.id === itemId);
      return total + (item?.price || 0) * quantity;
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

const handlePlaceOrder = async () => {
  const orderItems = Object.entries(cart)
    .filter(([_, quantity]) => quantity > 0)
    .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
  
  if (orderItems.length === 0) {
    alert('Please add items to your order');
    return;
  }

  try {
    setPlacing(true);
    
    // Calculate total first
    const total = getCartTotal();
    
    // Check wallet balance before placing order
    const balanceResponse = await apiService.getWalletBalance();
    const currentBalance = balanceResponse.balance;
    
    if (currentBalance < total) {
      alert(`Insufficient balance. Order total: ₦${total.toLocaleString()}, Available: ₦${currentBalance.toLocaleString()}`);
      setPlacing(false);
      return;
    }
    
    const response = await apiService.createOrder({
      sessionId: sessionId,
      items: orderItems,
      notes: notes || undefined
    });

    // Clear cart after successful order
    setCart({});
    setNotes('');
    
    // Call parent callback with order data
    onOrderPlace(response.order);
    
    alert(`Order placed successfully! Order #${response.order.order_number}`);
    
  } catch (error: any) {
    if (error.message.includes('Insufficient balance')) {
      alert(`Insufficient balance: ${error.message}`);
    } else {
      alert(`Failed to place order: ${error.message}`);
    }
  } finally {
    setPlacing(false);
  }
};

  // Group menu items by category
  const groupedItems = menuItems.reduce((groups, item) => {
    const category = item.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={onBack}
              className="text-blue-600 text-sm mb-1"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-black">{restaurant.name}</h1>
            <p className="text-sm text-gray-600">{restaurant.cuisine_type} • {restaurant.restaurant_type}</p>
          </div>
          
          {getCartCount() > 0 && (
            <div className="bg-blue-600 text-white px-3 py-2 rounded-full">
              <ShoppingCart className="w-5 h-5 inline mr-1" />
              {getCartCount()}
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 pb-32">
        {menuItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">🍽️</span>
            </div>
            <p className="text-gray-500 text-lg">No menu items available</p>
            <p className="text-gray-400 text-sm mt-1">This restaurant hasn't added their menu yet</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h2 className="text-lg font-semibold text-black mb-3 sticky top-20 bg-gray-50 py-2">
                {category}
              </h2>
              
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-black">{item.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <p className="text-lg font-bold text-blue-600">₦{item.price.toLocaleString()}</p>
                        {!item.is_available && (
                          <p className="text-red-500 text-sm mt-1">Currently unavailable</p>
                        )}
                      </div>
                      
                      {item.is_available && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                            disabled={!cart[item.id]}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <span className="w-8 text-center font-medium">
                            {cart[item.id] || 0}
                          </span>
                          
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Order Button */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-black">
                {getCartCount()} items
              </div>
              <div className="text-2xl font-bold text-blue-600">
                ₦{getCartTotal().toLocaleString()}
              </div>
            </div>
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions (optional)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 resize-none"
            rows={2}
          />
          
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {placing ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Placing Order...
              </span>
            ) : (
              `Place Order - ₦${getCartTotal().toLocaleString()}`
            )}
          </button>
        </div>
      )}
    </div>
  );
};