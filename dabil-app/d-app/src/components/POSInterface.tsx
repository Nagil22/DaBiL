// Update the POSInterface.tsx to handle the complete order serving flow
import React, { useState, useEffect } from 'react';
import apiService from '../lib/apiclient';
import { LuxuryMenuSelector } from './LuxuryMenu';

interface Guest {
  session_id: string;
  session_code: string;
  guest_name: string;
  phone: string;
  table_number: number;
  party_size: number;
  checked_in_at: string;
  order_count: number;
  pending_orders: number;
}

interface Order {
  id: string;
  order_number: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    name?: string;
    price?: number;
  }>;
  subtotal: number;
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string;
}

interface POSInterfaceProps {
  restaurantId: string;
  onServeOrder: (orderId: string) => Promise<void>;
}

export const POSInterface: React.FC<POSInterfaceProps> = ({ 
  restaurantId, 
  onServeOrder 
}) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [servingOrder, setServingOrder] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [restaurantQRCode, setRestaurantQRCode] = useState<string | null>(null);
  const [showLuxuryMenu, setShowLuxuryMenu] = useState(false);
  const [selectedGuestForMenu, setSelectedGuestForMenu] = useState<Guest | null>(null);
  const [restaurantType, setRestaurantType] = useState<string>('');

  const fetchRestaurantQR = async () => {
    try {
      const response = await apiService.getRestaurant(restaurantId);
      setRestaurantQRCode(response.restaurant.qr_code);
    } catch (error: any) {
      console.error('Failed to fetch restaurant QR:', error);
    }
  };

  const fetchRestaurantDetails = async () => {
    try {
      const response = await apiService.getRestaurant(restaurantId);
      setRestaurantType(response.restaurant.restaurant_type);
    } catch (error: any) {
      console.error('Failed to fetch restaurant details:', error);
    }
  };

const fetchGuests = async (showLoader = true) => {
  if (showLoader) setLoading(true);
  try {
    console.log('Fetching guests for authenticated restaurant');
    const response = await apiService.getCheckedInGuests(); // No restaurantId needed
    console.log('Guests response:', response);
    setGuests(response.guests);
  } catch (error: any) {
    console.error('Failed to fetch guests:', error);
    alert(`Failed to load guests: ${error.message}`);
  } finally {
    if (showLoader) setLoading(false);
  }
};

const fetchGuestOrders = async (sessionId: string) => {
  try {
    console.log('Fetching orders for session:', sessionId);
    console.log('Current restaurant ID:', restaurantId);
    
    const response = await apiService.getSessionOrders(sessionId);
    console.log('Orders response:', response);
    
    setGuestOrders(response.orders);
    
    const guest = guests.find(g => g.session_id === sessionId);
    if (guest && !selectedGuest) {
      setSelectedGuest(guest);
    }
  } catch (error: any) {
    console.error('Failed to fetch orders:', error);
    alert(`Debug - Failed to fetch orders: ${error.message}`);
    setGuestOrders([]);
  }
};

const fetchMenuItems = async () => {
  try {
    // For staff, use the POS endpoint without restaurantId
    const response = await apiService.getRestaurantMenu();
    const itemsMap: Record<string, any> = {};
    response.menuItems.forEach((item: any) => {
      itemsMap[item.id] = item;
    });
    setMenuItems(itemsMap);
  } catch (error: any) {
    console.error('Failed to fetch menu:', error);
  }
};


const handleGuestSelect = (guest: Guest) => {
  setSelectedGuest(guest);
  
  // For luxury restaurants, always show orders view when clicking on guest
  if (restaurantType === 'Luxury') {
    fetchGuestOrders(guest.session_id);
  } else {
    // For non-luxury restaurants, always show orders
    fetchGuestOrders(guest.session_id);
  }
};

 const handleServeOrder = async (orderId: string) => {
  try {
    setServingOrder(orderId);
    
    // Direct order serving without payment confirmation
    await apiService.serveOrder(orderId);
    
    // Refresh data after serving
    fetchGuests();
    if (selectedGuest) {
      fetchGuestOrders(selectedGuest.session_id);
    }
    
    alert('Order served successfully!');
    setServingOrder(null);
    
  } catch (error: any) {
    alert(`Failed to serve order: ${error.message}`);
    setServingOrder(null);
  }
};


  const getOrderItemDetails = (order: Order) => {
    return order.items.map(item => ({
      ...item,
      name: menuItems[item.menuItemId]?.name || 'Unknown Item',
      price: menuItems[item.menuItemId]?.price || 0
    }));
  };

  const QRCodeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Restaurant QR Code</h3>
          <button 
            onClick={() => setShowQRModal(false)}
            className="text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        
        <div className="text-center">
          {restaurantQRCode ? (
            <>
              <img 
                src={restaurantQRCode} 
                alt="Restaurant QR Code" 
                className="w-64 h-64 mx-auto border border-gray-200 rounded-lg"
              />
              <p className="text-sm text-gray-600 mt-4">
                Show this QR code to customers for check-in
              </p>
            </>
          ) : (
            <div className="w-64 h-64 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Loading QR Code...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

const handleLuxuryOrderPlace = async (orderData: any) => {
  try {
    // Force immediate refresh after order is placed
    setTimeout(() => {
      fetchGuests(false);
      if (selectedGuest) {
        fetchGuestOrders(selectedGuest.session_id);
      }
    }, 1000); // Small delay to ensure backend has processed the order
    
    console.log('Order placed successfully:', orderData);
  } catch (error: any) {
    console.error('Error after luxury order:', error);
  }
};

useEffect(() => {
  fetchGuests();
  fetchMenuItems();
  
  // More frequent refresh for better real-time updates
  const interval = setInterval(() => {
    fetchGuests(false); // Don't show loading state
    if (selectedGuest) {
      fetchGuestOrders(selectedGuest.session_id);
    }
  }, 10000); // Reduced to 10 seconds for better real-time experience
  
  return () => clearInterval(interval);
}, [restaurantId, selectedGuest]); // Added selectedGuest as dependency

  useEffect(() => {
    fetchRestaurantQR();
  }, [restaurantId]);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [restaurantId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">POS Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage orders and serve customers</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Restaurant ID: {restaurantId}
              </div>
              <button 
                onClick={() => fetchGuests(true)}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Guest List */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">👥</span>
                  </div>
                  Active Guests
                </h2>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {guests.length} checked in
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading guests...</span>
                </div>
              ) : guests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">👥</span>
                  </div>
                  <p className="text-gray-500 text-lg">No guests checked in</p>
                  <p className="text-gray-400 text-sm mt-1">Guests will appear here when they scan QR codes</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {guests.map(guest => (
                    <div 
                      key={guest.session_id}
                      onClick={() => handleGuestSelect(guest)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedGuest?.session_id === guest.session_id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {guest.guest_name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <h3 className="font-semibold text-gray-900">{guest.guest_name}</h3>
                              <p className="text-sm text-gray-600">Code: {guest.session_code}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>🪑 Table {guest.table_number || 'N/A'}</span>
                            <span>👥 {guest.party_size} guests</span>
                            <span>🕐 {new Date(guest.checked_in_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {guest.order_count} orders
                          </div>
                          {guest.pending_orders > 0 && (
                            <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                              {guest.pending_orders} pending
                            </div>
                          )}
                          
                        
                          {restaurantType === 'Luxury' ? (
                            <div className="mt-2 space-y-1">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGuest(guest);
                                  fetchGuestOrders(guest.session_id);
                                }}
                                className="w-full bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                              >
                                View Orders
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGuestForMenu(guest);
                                  setShowLuxuryMenu(true);
                                }}
                                className="w-full bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              >
                                Place Order
                              </button>
                               <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await apiService.checkOut(guest.session_id);
                                alert(`${guest.guest_name} checked out successfully!`);
                                fetchGuests();
                              } catch (error: any) {
                                alert(`Failed to check out: ${error.message}`);
                              }
                            }}
                            className="w-full bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                          >
                            Check Out User
                          </button>
                              
                            </div>
                          
                          ) : (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await apiService.checkOut(guest.session_id);
                                  alert(`${guest.guest_name} checked out successfully!`);
                                  fetchGuests();
                                } catch (error: any) {
                                  alert(`Failed to check out: ${error.message}`);
                                }
                              }}
                              className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                            >
                               Check Out User
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Orders Section */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold">🍽️</span>
                </div>
                {selectedGuest ? `${selectedGuest.guest_name}'s Orders` : 'Select a Guest'}
              </h2>
            </div>

            <div className="p-6">
              {selectedGuest ? (
                guestOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">🍽️</span>
                    </div>
                    <p className="text-gray-500 text-lg">No orders yet</p>
                    <p className="text-gray-400 text-sm mt-1">Orders will appear when guest places them</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {guestOrders.map(order => {
                      const orderItems = getOrderItemDetails(order);
                      
                      return (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                              <p className="text-sm text-gray-600">
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900">
                                ₦{order.total_amount.toLocaleString()}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.status === 'pending' 
                                  ? 'bg-orange-100 text-orange-800'
                                  : order.status === 'served'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </div>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">Order Items:</h4>
                            <div className="space-y-1">
                              {orderItems.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-700">{item.quantity}x {item.name}</span>
                                  <span className="font-medium text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.notes && (
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                              <p className="text-sm text-blue-800">
                                <strong>Special Notes:</strong> {order.notes}
                              </p>
                            </div>
                          )}

                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleServeOrder(order.id)}
                              disabled={servingOrder === order.id}
                              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                            >
                              {servingOrder === order.id ? (
                                <span className="flex items-center">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </span>
                              ) : (
                                <>
                                  <span className="mr-2">✅</span>
                                  Mark as Served & Process Payment
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">👆</span>
                  </div>
                  <p className="text-gray-500 text-lg">Select a guest to view their orders</p>
                  <p className="text-gray-400 text-sm mt-1">Click on a guest from the left panel</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating QR Button */}
      <button
        onClick={() => setShowQRModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-40 font-medium"
      >
        QR
      </button>

      {/* QR Modal */}
      {showQRModal && <QRCodeModal />}
      
      {/* Luxury Menu Selector */}
      {showLuxuryMenu && selectedGuestForMenu && (
        <LuxuryMenuSelector
          guest={selectedGuestForMenu}
          restaurantId={restaurantId}
          onClose={() => {
            setShowLuxuryMenu(false);
            setSelectedGuestForMenu(null);
          }}
          onOrderPlace={handleLuxuryOrderPlace}
        />
      )}
    </div>
  );
};