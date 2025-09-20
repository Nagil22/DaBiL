// components/LuxuryMenuSelector.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, X } from 'lucide-react';
import apiService from '../lib/apiclient';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

interface Guest {
  session_id: string;
  guest_name: string;
  session_code: string;
}

interface LuxuryMenuSelectorProps {
  guest: Guest;
  restaurantId: string;
  onClose: () => void;
  onOrderPlace: (orderData: any) => void;
}

export const LuxuryMenuSelector: React.FC<LuxuryMenuSelectorProps> = ({ 
  guest, 
  restaurantId, 
  onClose, 
  onOrderPlace 
}) => {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantId]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRestaurantMenu(restaurantId);
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
    alert('Please add items to the order');
    return;
  }

  try {
    setPlacing(true);
    
    // Debug logging to check what we're sending
    console.log('Placing order with:', {
      sessionId: guest.session_id,
      items: orderItems,
      notes: notes || undefined
    });
    
    const response = await apiService.createOrder({
      sessionId: guest.session_id,
      items: orderItems,
      notes: notes || undefined
    });

    // Clear cart after successful order
    setCart({});
    setNotes('');
    
    // Call parent callback with order data
    onOrderPlace(response.order);
    
    alert(`Order placed successfully! Order #${response.order.order_number}`);
    onClose();
    
  } catch (error: any) {
    console.error('Order placement error:', error);
    alert(`Failed to place order: ${error.message}`);
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading menu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 text-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Luxury Menu Selection</h2>
              <p className="text-yellow-400 text-sm">For: {guest.guest_name} • Session: {guest.session_code}</p>
            </div>
            <div className="flex items-center space-x-4">
              {getCartCount() > 0 && (
                <div className="bg-yellow-600 text-black px-4 py-2 rounded-full font-medium">
                  <ShoppingCart className="w-4 h-4 inline mr-2" />
                  {getCartCount()} items
                </div>
              )}
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {menuItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🍽️</span>
              </div>
              <p className="text-gray-400 text-lg">No menu items available</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-8">
                <h3 className="text-xl font-semibold text-yellow-400 mb-4 border-b border-gray-700 pb-2">
                  {category}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-yellow-600 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1">{item.name}</h4>
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                          <p className="text-xl font-bold text-yellow-400">₦{item.price.toLocaleString()}</p>
                          {!item.is_available && (
                            <p className="text-red-400 text-sm mt-1">Currently unavailable</p>
                          )}
                        </div>
                        
                        {item.is_available && (
                          <div className="flex items-center space-x-3 ml-4">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                              disabled={!cart[item.id]}
                            >
                              <Minus className="w-4 h-4 text-white" />
                            </button>
                            
                            <span className="w-8 text-center font-medium text-yellow-400">
                              {cart[item.id] || 0}
                            </span>
                            
                            <button
                              onClick={() => addToCart(item.id)}
                              className="w-8 h-8 rounded-full bg-yellow-600 hover:bg-yellow-700 text-black flex items-center justify-center transition-colors"
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

        {/* Footer with Order Summary */}
        {getCartCount() > 0 && (
          <div className="bg-gray-800 border-t border-gray-700 p-6">
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests for the kitchen..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-600 resize-none"
                rows={2}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-300 text-sm">
                  {getCartCount()} items selected
                </div>
                <div className="text-2xl font-bold text-yellow-400">
                  ₦{getCartTotal().toLocaleString()}
                </div>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-black px-8 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placing ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                    Placing Order...
                  </span>
                ) : (
                  `Place Order - ₦${getCartTotal().toLocaleString()}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};