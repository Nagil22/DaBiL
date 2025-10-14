'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/components/NotificationSystem';
import { QRScanner } from '../components/QRScanner';
import { RestaurantMenu } from '../components/RestaurantMenu';
import { SessionManagement } from '../components/SessionManagement';
import { SimpleAuthForm } from '../components/SimpleAuthForm';
import { POSInterface } from '../components/POSInterface';
import { LoyaltyPoints } from '../components/LoyaltyPoints';
import { Receipt } from '../components/Receipt';
import apiService from '../lib/apiclient';
import { PaymentConfirmation } from '@/components/Paymentconfim';


// Brand colors extracted from logo
const brandColors = {
  primary: '#2563eb', // Blue from logo
  secondary: '#1d4ed8', // Darker blue
  accent: '#f59e0b', // Gold accent
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1f2937',
  textLight: '#6b7280'
};

interface User {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'staff' | 'restaurant_manager' | 'admin' | 'waiter' | 'cashier' | 'chef' | 'manager';
  restaurant_id?: string;
  restaurant_name?: string;
  balance?: number;
}
export default function DabilApp() {
  // State management
  const { showToast, showModal, success, error, warning, info, confirm } = useNotifications();
  const [currentView, setCurrentView] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showFundWallet, setShowFundWallet] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [restaurantStats, setRestaurantStats] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedQRCode, setSelectedQRCode] = useState<any>(null);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeUsers: 0
  });
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState<any>(null);
  const [payoutsData, setPayoutsData] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loyaltyOverview, setLoyaltyOverview] = useState<any>(null);
  const [loyaltyTierDistribution, setLoyaltyTierDistribution] = useState<any[]>([]);

  // Initialize app
useEffect(() => {
  const token = localStorage.getItem('dabil_token') || localStorage.getItem('pos_token');
  const userData = localStorage.getItem('dabil_user') || localStorage.getItem('pos_user');
  
  if (token && userData) {
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    // Determine user type based on which token is present
    const userType: 'user' | 'staff' =
      localStorage.getItem('dabil_token') ? 'user' : 'staff';
    apiService.setToken(token, userType);
    
    // Route based on role according to FRD
    switch (parsedUser.role) {
      case 'admin':
        setCurrentView('admin');
        fetchRestaurants();
        break;
      case 'restaurant_manager':
      case 'manager': // Handle both variations
        setCurrentView('manager');
        break;
      case 'staff':
      case 'waiter':
      case 'cashier':
      case 'chef': // Handle all staff roles
        setCurrentView('pos');
        break;
      case 'user':
      default:
        // Only show home view for regular users or when no role is found
        if (!parsedUser.role || parsedUser.role === 'user') {
          setCurrentView('home');
          fetchWalletBalance();
        }
        break;
    }
  } else {
    // Only show home view when no user is logged in
    setCurrentView('home');
  }
}, []);

useEffect(() => {
  // Handle Paystack payment callback
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  const status = urlParams.get('status');

  if (reference && status === 'success') {
    // Verify payment
    verifyPayment(reference);
  } else if (reference && status === 'cancelled') {
    success('Payment was cancelled');
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);

useEffect(() => {
  // Handle QR code check-in from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('restaurant_id');
  
  if (restaurantId && !activeSession) {
    if (!user) {
      // User not logged in - show auth modal and store restaurant ID
      setShowAuthModal(true);
      localStorage.setItem('pending_checkin_restaurant', restaurantId);
    } else {
      // User logged in - proceed with check-in
      handleQRCheckIn(restaurantId);
    }
    
    // Clean up URL after processing
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Check for pending check-in after login
  const pendingRestaurant = localStorage.getItem('pending_checkin_restaurant');
  if (user && pendingRestaurant && !activeSession) {
    handleQRCheckIn(pendingRestaurant);
    localStorage.removeItem('pending_checkin_restaurant');
  }
}, [user, activeSession]);



useEffect(() => {
  // Fetch manager data when user is restaurant_manager and view is manager
  if (user?.role === 'restaurant_manager' && currentView === 'manager') {
    fetchManagerData();
    fetchManagerLoyaltyData();
  }
}, [user, currentView]);

useEffect(() => {
  if (currentView === 'admin') {
    fetchAdminStats();
  }
  if (currentView === 'admin-payouts') {
    fetchPayoutsData();
  }
}, [currentView]);


const fetchAdminStats = async () => {
    try {
      const stats = await apiService.getAdminStats();
      setAdminStats(stats);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

// In renderAdminPayouts function, fix the number formatting:
const renderAdminPayouts = () => {
  // Calculate totals properly
  const totalSales = payoutsData.reduce((sum, item) => sum + (parseFloat(item.total_sales) || 0), 0);
  const totalOrders = payoutsData.reduce((sum, item) => sum + (parseInt(item.total_orders) || 0), 0);
  const avgPerRestaurant = payoutsData.length > 0 ? totalSales / payoutsData.length : 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payout Tracking</h2>
            <p className="text-gray-600">All-time sales summary for restaurant payouts</p>
          </div>
          <div className="text-sm text-gray-500">
            As of {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Payout Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2">Total Restaurants</h3>
            <p className="text-2xl font-bold text-blue-700">{payoutsData.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <h3 className="font-semibold text-green-900 mb-2">Total Sales</h3>
            <p className="text-2xl font-bold text-green-700">
              ₦{totalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl">
            <h3 className="font-semibold text-purple-900 mb-2">Total Orders</h3>
            <p className="text-2xl font-bold text-purple-700">
              {totalOrders}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl">
            <h3 className="font-semibold text-yellow-900 mb-2">Avg per Restaurant</h3>
            <p className="text-2xl font-bold text-yellow-700">
              ₦{avgPerRestaurant.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payoutsData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-2">📊</span>
                        <p>No payout data available</p>
                        <p className="text-sm">Sales data will appear here as orders are completed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payoutsData.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payout.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{payout.restaurant_type}</div>
                        <div className="text-xs text-gray-400">{payout.cuisine_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          ₦{(parseFloat(payout.total_sales) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payout.total_orders || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payout.payout_status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : payout.payout_status === 'no-sales'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payout.payout_status === 'no-sales' ? 'No Sales' : (payout.payout_status || 'Pending')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historical Data */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Periods</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payoutHistory.slice(0, 6).map((history, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">
                  {new Date(history.period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ₦{(parseFloat(history.period_sales) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">{history.order_count || 0} orders</div>
                <div className="text-xs text-gray-400 mt-2">{history.name}</div>
                <div className="mt-2">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    history.payout_status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {history.payout_status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const handleQRCheckIn = async (restaurantId: string) => {
  // Check if current user is staff - staff can't check in as customers
  if (user && (user.role === 'staff' || user.role === 'waiter' || user.role === 'cashier' || user.role === 'chef')) {
    error('Staff members cannot check in as customers. Please use a customer account.');
    return;
  }

  if (!user) {
    console.log('QR Scan - User not logged in, showing auth modal');
    setShowAuthModal(true);
    // Store the restaurant ID for after login
    localStorage.setItem('pending_checkin_restaurant', restaurantId);
    return;
  }

  console.log('QR Scan - User logged in, proceeding with check-in');
  
  try {
    setLoading(true);
    
    const restaurantResponse = await apiService.getRestaurant(restaurantId);
    const restaurant = restaurantResponse.restaurant;
    
    // Check if user already has an active session
    try {
      const activeSessionResponse = await apiService.getActiveSession();
      if (activeSessionResponse.session) {
        if (activeSessionResponse.session.restaurant_id === restaurantId) {
          setActiveSession(activeSessionResponse.session);
          setSelectedRestaurant(restaurant);
          setCurrentView('home');
          setTimeout(() => {
            success(`Welcome back to ${restaurant.name}! Continuing your session.`);
          }, 100);
          return;
        } else {
          await apiService.checkOut(activeSessionResponse.session.id);
          success(`Checked out from previous restaurant. Starting new session at ${restaurant.name}.`);
        }
      }
    } catch (error) {
      console.log('No active session found, creating new one');
    }
    
    // IMPORTANT: Use user token for check-in, not staff token
    const response = await apiService.checkIn({ 
      restaurantId: restaurantId,
      tableNumber: undefined,
      partySize: 1
    });
    
    setActiveSession(response.session);
    setSelectedRestaurant(restaurant);
    setCurrentView('home');
    
    setTimeout(() => {
      success(`Welcome to ${restaurant.name}! You're checked in. Session: ${response.session.session_code}.`);
    }, 100);
    
  } catch (error: any) {
    error('Check-in Failed', error.message || 'Check-in failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

// Add the verifyPayment function
const verifyPayment = async (reference: string) => {
  try {
    setLoading(true);
    const response = await apiService.verifyPayment(reference);
    
    if (response.success) {
      setWalletBalance(response.newBalance);
      success(`Payment successful! ₦${response.amount.toLocaleString()} added to your wallet.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // FIX: Change from success() to error() for payment failures
      error('Payment Failed', 'Payment verification failed. Please contact support if money was debited.');
    }
  } catch (error: any) {
    // FIX: Change from success() to error() for payment errors
    error('Payment Error', `Payment verification failed: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // API calls
  const fetchRestaurants = async () => {
    try {
      const response = await apiService.getRestaurants();
      setRestaurants(response.restaurants);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  };

 const fetchManagerData = async () => {
  try {
    // Fetch restaurant data
    const restaurantResponse = await apiService.getMyRestaurant();
    setRestaurantData(restaurantResponse.restaurant);
    
    // Fetch stats
    const statsResponse = await apiService.getMyRestaurantStats();
    setRestaurantStats(statsResponse.stats);
    
    // Fetch staff list
    const staffResponse = await apiService.getMyStaff();
    setStaffList(staffResponse.staff);
    
    // Fetch menu items
    if (restaurantResponse.restaurant?.id) {
      const menuResponse = await apiService.getRestaurantMenu();
      setMenuItems(menuResponse.menuItems);
    }
  } catch (error: any) {
    console.error('Failed to fetch manager data:', error);
  }
};

const fetchManagerLoyaltyData = async () => {
  try {
    console.log('Starting to fetch manager loyalty data...');
    const response = await apiService.getManagerLoyaltyOverview();
    console.log('Manager loyalty API response:', response);
    
    // Handle the response based on what we actually get
    if (response.restaurant_loyalty_stats) {
      setLoyaltyOverview(response.restaurant_loyalty_stats);
      setLoyaltyTierDistribution(response.tierDistribution || []);
    }
    
  } catch (err: any) {
    console.error('Failed to fetch loyalty data:', err);
    // Set empty data to prevent breaking the UI
    setLoyaltyOverview({
      total_points_earned: 0,
      total_points_redeemed: 0,
      active_customers: 0,
      total_customer_spend: 0,
      average_points_per_customer: 0,
      points_earned_this_month: 0
    });
    setLoyaltyTierDistribution([]);
  }
};

const fetchPayoutsData = async () => {
  try {
    console.log('Starting to fetch payouts data...');
    const payoutsResponse = await apiService.getAdminPayouts();
    console.log('Payouts API response:', payoutsResponse);
    setPayoutsData(payoutsResponse.payouts || []);
    
    const historyResponse = await apiService.getAdminPayoutHistory();
    console.log('Payout history API response:', historyResponse);
    setPayoutHistory(historyResponse.payoutHistory || []);
  } catch (err: any) {
    console.error('Failed to fetch payouts data:', err);
    // Use the notification system properly
    error('Failed to load payout data: ' + err.message);
  }
};
  const fetchWalletBalance = async () => {
    try {
      const response = await apiService.getWalletBalance();
      setWalletBalance(response.balance);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  // Authentication handlers
const handleAuth = async (data: { 
  email: string; 
  name: string; 
  password: string; 
  loginType?: 'user' | 'staff' 
}) => {
  setLoading(true);
  try {
    let response;
    
    if (authMode === 'login') {
      if (data.loginType === 'staff') {
        response = await apiService.staffLogin({ 
          email: data.email.toLowerCase(),
          password: data.password 
        });
        
        const userWithRole = {
          ...response.staff,
          role: response.staff.role === 'manager' ? 'restaurant_manager' : 'staff'
        } as User;
        setUser(userWithRole);
        
        if (userWithRole.role === 'restaurant_manager') {
          setCurrentView('manager');
        } else {
          setCurrentView('pos');
        }
      } else {
        response = await apiService.login({ 
          email: data.email.toLowerCase(),
          password: data.password 
        });
        
        const userWithRole = {
          ...response.user,
          role: response.user.role || 'user'
        } as User;
        setUser(userWithRole);
        
        switch (userWithRole.role) {
          case 'admin':
            setCurrentView('admin');
            fetchRestaurants();
            break;
          case 'restaurant_manager':
            setCurrentView('manager');
            break;
          case 'user':
          default:
            setCurrentView('home');
            fetchWalletBalance();
            
            // Check for pending QR check-in after user login
            const pendingRestaurant = localStorage.getItem('pending_checkin_restaurant');
            if (pendingRestaurant) {
              console.log('Found pending check-in after login:', pendingRestaurant);
              setTimeout(() => {
                handleQRCheckIn(pendingRestaurant);
              }, 500);
              localStorage.removeItem('pending_checkin_restaurant');
            }
            break;
        }
      }
    } else {
      // Signup - always create regular users
      response = await apiService.signup({
        email: data.email.toLowerCase(),
        name: data.name,
        password: data.password
      });
      
      const userWithRole = {
        ...response.user,
        role: 'user'
      } as User;
      setUser(userWithRole);
      setCurrentView('home');
      fetchWalletBalance();
      
      // Check for pending QR check-in after signup
      const pendingRestaurant = localStorage.getItem('pending_checkin_restaurant');
      if (pendingRestaurant) {
        console.log('Found pending check-in after signup:', pendingRestaurant);
        setTimeout(() => {
          handleQRCheckIn(pendingRestaurant);
        }, 500);
        localStorage.removeItem('pending_checkin_restaurant');
      }
    }
    
    setShowAuthModal(false);
    success(`${authMode === 'login' ? 'Login' : 'Account creation'} successful!`);
  } catch (err: any) {
    error(err.message || 'Authentication failed');
  } finally {
    setLoading(false);
  }
};
 const handleLogout = async () => {
  try {
    await apiService.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear client-side data
    setUser(null);
    setActiveSession(null);
    setSelectedRestaurant(null);
    setCurrentView('home');
    setWalletBalance(0);
  }
};

  // QR Scanner handler
const handleQRScan = async (restaurantId: string) => {
  console.log('QR Scan - Restaurant ID:', restaurantId);
  
  // Close QR scanner immediately
  setShowQRScanner(false);
  
  if (!user) {
    console.log('QR Scan - User not logged in, showing auth modal');
    setShowAuthModal(true);
    // Store the restaurant ID for after login
    localStorage.setItem('pending_checkin_restaurant', restaurantId);
    return;
  }

  console.log('QR Scan - User logged in, proceeding with check-in');
  // Call the check-in handler
  await handleQRCheckIn(restaurantId);
};
  // Role-based header
  const renderHeader = () => {
    const headerTitle = () => {
      switch (user?.role) {
        case 'staff': return 'Dabil POS';
        case 'restaurant_manager': return 'Dabil Manager';
        case 'admin': return 'Dabil Admin';
        default: return 'Dabil';
      }
    };

    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">D</span>
              </div>
              <h1 className="text-xl font-bold">{headerTitle()}</h1>
            </div>

            {/* Navigation */}
          {user && user.role === 'admin' && (
  <div className="hidden md:flex items-center space-x-4">
    <button
      onClick={() => setCurrentView('admin')}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        currentView === 'admin' ? 'bg-blue-800' : 'hover:bg-blue-700'
      }`}
    >
      Dashboard
    </button>
    <button
      onClick={() => setCurrentView('admin-payouts')}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        currentView === 'admin-payouts' ? 'bg-blue-800' : 'hover:bg-blue-700'
      }`}
    >
      Payouts
    </button>
  </div>
)}

            {/* User info and actions */}
            <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    {user.role === 'user' && (
                      <div className="hidden sm:flex items-center space-x-2 bg-blue-800 px-3 py-1 rounded-full">
                        <span className="text-sm">₦{walletBalance.toLocaleString()}</span>
                      </div>
                    )}
                    {/* Add navigation for staff to go back to POS if they end up on wrong page */}
      {(user.role === 'staff' || user.role === 'waiter' || user.role === 'cashier' || user.role === 'chef') && currentView !== 'pos' && (
        <button
          onClick={() => setCurrentView('pos')}
          className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Back to POS
        </button>
      )}
      
      {/* Add navigation for restaurant managers */}
      {(user.role === 'restaurant_manager' || user.role === 'manager') && currentView !== 'manager' && (
        <button
          onClick={() => setCurrentView('manager')}
          className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      )}
      
      <div className="text-right min-w-0">
        <div className="text-sm hidden sm:block truncate">{user.name}</div>
        <div className="text-xs text-blue-200 hidden sm:block truncate">{user.email}</div>
      </div>
      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors ml-4"
      >
        Logout
      </button>
    </>
  ) : (
    <button
      onClick={() => setShowAuthModal(true)}
      className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
    >
      Login
    </button>
  )}
</div>
          </div>
        </div>
      </div>
    );
  };
  // Guest interface
const renderGuestInterface = () => (
  <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
    <div className="text-center mb-8">
      <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-white font-bold text-2xl">D</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Dabil</h2>
      <p className="text-gray-600">Cashless • Cardless • Seamless</p>
    </div>

    {/* Wallet Balance Display */}
    {user && user.role === 'user' && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-blue-600 mb-1">Wallet Balance</div>
          <div className="text-2xl font-bold text-blue-900">₦{walletBalance.toLocaleString()}</div>
          <button
            onClick={() => setShowFundWallet(true)}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            + Fund Wallet
          </button>
        </div>
      </div>
    )}

    <div className="space-y-4">
      <button
        onClick={() => {
          if (!user) {
            setShowAuthModal(true);
            return;
          }
          setShowQRScanner(true);
        }}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2"
      >
        <span className="text-xl">📱</span>
        <span>Scan Restaurant QR</span>
      </button>
      {user && user.role === 'user' && (
  <button
    onClick={async () => {
      try {
        const activeSession = await apiService.getActiveSession();
        await apiService.checkOut(activeSession.session.id);
        success('Session cleared! You can now check in again.');
      } catch (error) {
        success('No active session to clear or error occurred');
      }
    }}
    className="w-full bg-red-600 text-white py-2 rounded-lg text-sm"
  >
    Clear Active Session 
  </button>
)}

      {user && user.role === 'user' && (
        <>
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const activeSessionResponse = await apiService.getActiveSession();
                
                if (activeSessionResponse.session) {
                  // Get restaurant details
                  const restaurantResponse = await apiService.getRestaurant(activeSessionResponse.session.restaurant_id || selectedRestaurant?.id);
                  
                  // Set session and restaurant data
                  setActiveSession(activeSessionResponse.session);
                  setSelectedRestaurant(restaurantResponse.restaurant);
                  
                  // Go directly to menu
                  setCurrentView('menu');
                } else {
                  success('No active session found. Please scan a restaurant QR code to get started.');
                }
              } catch (error: any) {
                if (error.message.includes('not found')) {
                  success('No active session found. Please scan a restaurant QR code to get started.');
                } else {
                  success('Failed to load active session. Please try again.');
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:border-blue-300 hover:text-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>🍽️</span>
            <span>{loading ? 'Loading...' : 'View Menu'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowLoyalty(true)}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-xl font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all flex items-center justify-center space-x-1"
            >
              <span>⭐</span>
              <span className="text-sm">Loyalty</span>
            </button>
            
            <button
              onClick={() => setShowTransactions(true)}
              className="bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-1"
            >
              <span>📊</span>
              <span className="text-sm">History</span>
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);

  // Admin interface
const renderAdminInterface = () => {
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600">System administration and restaurant management</p>
          </div>
          <button
            onClick={() => setShowAddRestaurant(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            + Add Restaurant
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2">Total Restaurants</h3>
            <p className="text-2xl font-bold text-blue-700">{restaurants.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <h3 className="font-semibold text-green-900 mb-2">Active Users</h3>
            <p className="text-2xl font-bold text-green-700">{adminStats.activeUsers}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl">
            <h3 className="font-semibold text-yellow-900 mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-yellow-700">₦{adminStats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Rest of restaurants section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurants</h3>
          <div className="grid gap-4">
            {restaurants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No restaurants added yet</p>
                <p className="text-sm">Add your first restaurant to get started</p>
              </div>
            ) : (
              restaurants.map(restaurant => (
                <div key={restaurant.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
                      <p className="text-sm text-gray-600">{restaurant.cuisine_type} • {restaurant.restaurant_type}</p>
                      <p className="text-sm text-gray-500">{restaurant.address}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedQRCode(restaurant)}
                        className="text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-3 py-1 rounded"
                      >
                        View QR
                      </button>
                      <button 
                        onClick={() => handleEditRestaurant(restaurant)}
                        className="text-green-600 hover:text-green-800 text-sm bg-green-50 px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteRestaurant(restaurant.id)}
                        className="text-red-600 hover:text-red-800 text-sm bg-red-50 px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
const renderManagerInterface = () => { 

  return (
    <div className="max-w-6xl mx-auto p-6">
    
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        {/* Header with restaurant name */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 mr-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Manager Dashboard</h2>
            {restaurantData && (
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-blue-600">{restaurantData.name}</h3>
                <p className="text-sm text-gray-600">{restaurantData.cuisine_type} • {restaurantData.restaurant_type}</p>
                <p className="text-sm text-gray-500">{restaurantData.address}, {restaurantData.city}</p>
              </div>
            )}
            <p className="text-gray-600 mt-2">Manage your restaurant operations, staff, and menu</p>
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => setShowCreateStaff(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              + Add Staff
            </button>
            <button
              onClick={() => setShowAddMenuItem(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + Add Menu Item
            </button>
          </div>
        </div>

        {/* Restaurant Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2">Total Customers</h3>
            <p className="text-2xl font-bold text-blue-700">
              {restaurantStats?.total_customers || 0}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <h3 className="font-semibold text-green-900 mb-2">Total Orders</h3>
            <p className="text-2xl font-bold text-green-700">
              {restaurantStats?.total_orders || 0}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl">
            <h3 className="font-semibold text-yellow-900 mb-2">Total Revenue</h3>
            <p className="text-2xl font-bold text-yellow-700">
              ₦{restaurantStats?.total_revenue ? parseFloat(restaurantStats.total_revenue).toLocaleString() : 0}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl">
            <h3 className="font-semibold text-purple-900 mb-2">Avg Order Value</h3>
            <p className="text-2xl font-bold text-purple-700">
              ₦{restaurantStats?.avg_order_value ? parseFloat(restaurantStats.avg_order_value).toLocaleString() : 0}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'menu'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Menu Management
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'staff'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Staff Management
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Daily Sales
            </button>
             
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'loyalty'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Loyalty Points
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Overview</h3>
            {restaurantData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Restaurant Name</label>
                    <p className="text-gray-900">{restaurantData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cuisine Type</label>
                    <p className="text-gray-900">{restaurantData.cuisine_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Restaurant Type</label>
                    <p className="text-gray-900">{restaurantData.restaurant_type}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-gray-900">{restaurantData.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{restaurantData.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{restaurantData.email || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600">Loading restaurant information...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
              <button
                onClick={() => setShowAddMenuItem(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Add New Item
              </button>
            </div>
            {menuItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-gray-600">₦{item.price}</p>
                    <p className="text-sm text-gray-500 mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600">No menu items yet</p>
                <p className="text-sm text-gray-500 mt-2">Add your first menu item to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Staff Members</h3>
              <button
                onClick={() => setShowCreateStaff(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Add Staff
              </button>
            </div>
            {staffList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffList.map((staff) => (
                      <tr key={staff.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600">No staff members added yet</p>
                <p className="text-sm text-gray-500 mt-2">Create staff accounts for waiters, cashiers, and chefs</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Report</h3>
    {restaurantStats ? (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Today's Orders</h4>
            <p className="text-2xl font-bold text-blue-600">{restaurantStats.total_orders || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Today's Revenue</h4>
            <p className="text-2xl font-bold text-green-600">
              ₦{restaurantStats.total_revenue ? parseFloat(restaurantStats.total_revenue).toLocaleString() : 0}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Average Order</h4>
            <p className="text-2xl font-bold text-purple-600">
              ₦{restaurantStats.avg_order_value ? parseFloat(restaurantStats.avg_order_value).toLocaleString() : 0}
            </p>
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Daily Performance</h4>
          <div className="text-sm text-gray-600">
            <p>Total Customers Served: {restaurantStats.total_customers || 0}</p>
            <p>Orders per Customer: {restaurantStats.total_customers > 0 ? (restaurantStats.total_orders / restaurantStats.total_customers).toFixed(1) : 0}</p>
          </div>
        </div>
      </div>
    ) : (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Loading sales data...</p>
      </div>
    )}
  </div>
)}

      {activeTab === 'loyalty' && (
  <div>
    <div className="flex justify-between items-center mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Loyalty Points Overview</h3>
        <p className="text-gray-600">Customer loyalty points accumulated at your restaurant (All-time)</p>
      </div>
      <div className="text-sm text-gray-500">
        All-time data
      </div>
    </div>

    {/* Loyalty Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-purple-50 p-4 rounded-xl">
        <h3 className="font-semibold text-purple-900 mb-2">Total Points Earned</h3>
        <p className="text-2xl font-bold text-purple-700">
          {loyaltyOverview?.total_points_earned?.toLocaleString() || 0}
        </p>
        <p className="text-sm text-purple-600 mt-2">All-time</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2">Active Customers</h3>
        <p className="text-2xl font-bold text-blue-700">
          {loyaltyOverview?.active_customers || 0}
        </p>
        <p className="text-sm text-blue-600 mt-2">Earned points all-time</p>
      </div>
      <div className="bg-green-50 p-4 rounded-xl">
        <h3 className="font-semibold text-green-900 mb-2">Avg Points per Customer</h3>
        <p className="text-2xl font-bold text-green-700">
          {loyaltyOverview?.active_customers > 0 
            ? Math.round(loyaltyOverview.total_points_earned / loyaltyOverview.active_customers) 
            : 0
          }
        </p>
        <p className="text-sm text-green-600 mt-2">All-time</p>
      </div>
      <div className="bg-yellow-50 p-4 rounded-xl">
        <h3 className="font-semibold text-yellow-900 mb-2">Revenue Generated</h3>
        <p className="text-2xl font-bold text-yellow-700">
          ₦{loyaltyOverview?.revenue_generated ? Math.round(loyaltyOverview.revenue_generated).toLocaleString() : 0}
        </p>
        <p className="text-sm text-yellow-600 mt-2">From loyalty sales</p>
      </div>
    </div>

    {/* Tier Distribution */}
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Tier Distribution (All-time)</h4>
      {loyaltyTierDistribution.length > 0 ? (
        <div className="space-y-4">
          {loyaltyTierDistribution.map((tier) => (
            <div key={tier.current_tier} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-4 h-4 rounded-full ${
                  tier.current_tier === 'gold' ? 'bg-yellow-400' :
                  tier.current_tier === 'silver' ? 'bg-gray-400' : 'bg-orange-400'
                }`}></div>
                <div>
                  <span className="font-medium text-gray-700 capitalize">
                    {tier.current_tier || 'bronze'} Tier
                  </span>
                  <div className="text-sm text-gray-500">
                    {tier.customer_count} customers
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">{tier.points_earned?.toLocaleString() || 0} points</div>
                <div className="text-sm text-green-600">
                  ₦{tier.revenue_generated ? Math.round(tier.revenue_generated).toLocaleString() : 0} revenue
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No loyalty data available</p>
          <p className="text-sm">Customer points will appear here as they earn them</p>
        </div>
      )}
    </div>

    {/* Help Text */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <span className="text-blue-600 text-lg">💡</span>
        <div>
          <h4 className="font-semibold text-blue-900">Loyalty Points Information</h4>
          <p className="text-sm text-blue-700 mt-1">
            This shows the total loyalty points earned by customers at your restaurant (all-time). 
            Points are earned when customers make purchases and can be redeemed for rewards.
            Revenue generated is estimated based on points earned.
          </p>
        </div>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
};

  // POS Interface wrapper
  const renderPOSInterface = () => {
    if (!user?.restaurant_id) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No restaurant assigned to this staff account</p>
        </div>
      );
    }

    return (
      <POSInterface
        restaurantId={user.restaurant_id || ''}
        onServeOrder={async (orderId: string) => {
          try {
            await apiService.serveOrder(orderId);
            success('Order served and payment processed!');
          } catch (error: any) {
            success(error.message || 'Failed to process order');
          }
        }}
      />
    );
  };

  // Modals
  const AddRestaurantModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    restaurant_type: '',
    cuisine_type: '',
    address: '',
    city: 'Lagos',
    phone: '',
    email: '',
    password: '' // Add password field
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await apiService.createRestaurant(formData);
      success('Restaurant and owner account created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      success(`Failed to create restaurant: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-black">Add New Restaurant</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black font-medium mb-2">Restaurant Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Restaurant Type *</label>
            <select
              required
              value={formData.restaurant_type}
              onChange={(e) => setFormData({...formData, restaurant_type: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Type</option>
              <option value="QSR">QSR</option>
              <option value="Casual">Casual</option>
              <option value="Luxury">Luxury</option>
            </select>
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Cuisine Type *</label>
            <input
              type="text"
              required
              value={formData.cuisine_type}
              onChange={(e) => setFormData({...formData, cuisine_type: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Owner Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Owner Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Password for restaurant owner"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Owner will use this to login as Restaurant Manager</p>
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-black font-medium mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-black font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? 'Creating...' : 'Create Restaurant & Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
  
  const CreateStaffModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await apiService.createMyStaff(formData);
      success('Staff member created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      success(`Failed to create staff: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-black">Add New Staff</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="staff@restaurant.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Role *</label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Role</option>
              <option value="waiter">Waiter</option>
              <option value="cashier">Cashier</option>
              <option value="chef">Chef</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Must be at least 6 characters long</p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300"
            >
              {loading ? 'Creating...' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

  const AddMenuItemModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    await apiService.addMyMenuItem({
      ...formData,
      price: parseFloat(formData.price)
    });
    
    success('Menu item added successfully!');
    onSuccess();
    onClose();
  } catch (error: any) {
    success(`Failed to add menu item: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-black">Add Menu Item</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black font-medium mb-2">Item Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Jollof Rice"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-black font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Delicious Nigerian rice dish..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-black font-medium mb-2">Price (₦) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="1500"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-black font-medium mb-2">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Category</option>
                <option value="Appetizers">Appetizers</option>
                <option value="Mains">Mains</option>
                <option value="Drinks">Drinks</option>
                <option value="Desserts">Desserts</option>
                <option value="Grills">Grills</option>
                <option value="Soups">Soups</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
  const FundWalletModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const fundAmount = parseFloat(amount);
    
    // Validate amount
    if (!fundAmount || fundAmount < 100) {
      success('Minimum funding amount is ₦100');
      setLoading(false);
      return;
    }
    
    if (fundAmount > 500000) {
      success('Maximum funding amount is ₦500,000');
      setLoading(false);
      return;
    }

    // Get user email from current user
    const currentUser = apiService.getCurrentUser();
    if (!currentUser?.email) {
      success('User email not found. Please log in again.');
      setLoading(false);
      return;
    }

    // Initialize Paystack payment with callback URL
    const response = await apiService.fundWallet({
      amount: fundAmount,
      email: currentUser.email
    });

    // Close modal and redirect to Paystack
    onClose();
    window.location.href = response.authorization_url;
    
  } catch (error: any) {
    success(`Failed to initialize payment: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-black">Fund Wallet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black font-medium mb-2">Amount (₦)</label>
            <input
              type="number"
              required
              min="100"
              max="500000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Min: ₦100 | Max: ₦500,000</p>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-black font-medium mb-2">Quick Select</label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    amount === quickAmount.toString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₦{quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-600 mb-1">Current Balance</div>
            <div className="text-lg font-bold text-blue-900">₦{walletBalance.toLocaleString()}</div>
          </div>

          {/* Payment Method Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">🔒</span>
              <div>
                <div className="text-sm font-medium text-green-800">Secure Payment via Paystack</div>
                <div className="text-xs text-green-600">Card, Bank Transfer, USSD supported</div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) < 100}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Fund ₦${amount ? parseFloat(amount).toLocaleString() : '0'}`
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            You'll be redirected to Paystack to complete your payment securely. 
            Funds will be added to your wallet immediately after successful payment.
          </p>
        </div>
      </div>
    </div>
  );
};
const QRCodeModal: React.FC<{ restaurant: any; onClose: () => void }> = ({ restaurant, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-black">{restaurant.name} QR Code</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      
      <div className="text-center">
        {restaurant.qr_code ? (
          <img 
            src={restaurant.qr_code} 
            alt="Restaurant QR Code" 
            className="w-64 h-64 mx-auto border border-gray-200 rounded-lg"
          />
        ) : (
          <div className="w-64 h-64 mx-auto border border-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">QR Code not available</p>
          </div>
        )}
        
        <p className="text-sm text-gray-600 mt-4">
          Customers scan this code to check in at your restaurant
        </p>
        
        <button
          onClick={() => {
            const link = document.createElement('a');
            link.href = restaurant.qr_code;
            link.download = `${restaurant.name}-qr-code.png`;
            link.click();
          }}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Download QR Code
        </button>
      </div>
    </div>
  </div>
);

const TransactionHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTransactions(50, 0); // Get last 50 transactions
      setTransactions(response.transactions);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      success('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.transaction_type === filter;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return '💰';
      case 'debit': return '🛒';
      case 'bonus': return '🎁';
      case 'refund': return '↩️';
      default: return '📊';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit': return 'text-green-600';
      case 'debit': return 'text-red-600';
      case 'bonus': return 'text-yellow-600';
      case 'refund': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'credit': return 'Wallet Funded';
      case 'debit': return 'Order Payment';
      case 'bonus': return 'Points Redeemed';
      case 'refund': return 'Refund';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-black">Transaction History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'credit', label: 'Credits' },
              { key: 'debit', label: 'Debits' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading transactions...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📊</span>
              </div>
              <p className="text-gray-500 text-lg">No transactions found</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === 'all' ? 'Your transactions will appear here' : `No ${filter} transactions yet`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">{getTransactionIcon(transaction.transaction_type)}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {formatTransactionType(transaction.transaction_type)}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {transaction.description || 'No description'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Ref: {transaction.reference}</span>
                          <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                          <span>{new Date(transaction.created_at).toLocaleTimeString()}</span>
                        </div>
                        {transaction.order_details && (
                          <div className="mt-2 text-xs text-blue-600">
                            Order: {transaction.order_details.order_number}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type === 'debit' ? '-' : '+'}₦{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Balance: ₦{transaction.balance_after.toLocaleString()}
                      </div>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const handleEditRestaurant = (restaurant: any) => {
  // For now, just show restaurant details
  success(`Edit functionality not implemented yet. Restaurant: ${restaurant.name}`);
};

const handleDeleteRestaurant = async (restaurantId: string) => {
  confirm(
    'Are you sure you want to delete this restaurant? This action cannot be undone.',
    'Delete Restaurant',
    async () => {
      try {
        await apiService.deleteRestaurant(restaurantId);
        success('Restaurant deleted successfully');
        fetchRestaurants(); // Refresh the list
      } catch (error: any) {
        success(`Failed to delete restaurant: ${error.message}`);
      }
    },
    () => {
      // Cancelled, do nothing
    }
  );
};

const handlePaymentRequest = (orderData: any) => {
  setPaymentOrderData(orderData);
  setShowPaymentConfirmation(true);
};

const handleConfirmPayment = async () => {
  if (!paymentOrderData) return;
  
  try {
    setLoading(true);
    await apiService.confirmPayment(paymentOrderData.id);
    setShowPaymentConfirmation(false);
    setPaymentOrderData(null);
    success('Payment confirmed! Your order is being served.');
  } catch (error: any) {
    success(`Payment failed: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const handleDeclinePayment = async () => {
  if (!paymentOrderData) return;
  
  try {
    setLoading(true);
    await apiService.declinePayment(paymentOrderData.id);
    setShowPaymentConfirmation(false);
    setPaymentOrderData(null);
    success('Payment declined.');
  } catch (error: any) {
    success(`Failed to decline: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // Main render
return (
  <div className="min-h-screen bg-gray-50">
    {renderHeader()}

    <main className="py-8">
      {currentView === 'home' && (!user || user.role === 'user') && renderGuestInterface()}
      {currentView === 'admin' && renderAdminInterface()}
      {currentView === 'manager' && renderManagerInterface()}
      {currentView === 'admin-payouts' && renderAdminPayouts()}
      {currentView === 'pos' && renderPOSInterface()}
      {currentView === 'session' && (
        <div className="max-w-md mx-auto">
          <div className="mb-4 px-6">
            <button
              onClick={() => setCurrentView('home')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              ← Back to Home
            </button>
          </div>
          <SessionManagement
            onCheckOut={() => {
              setActiveSession(null);
              setCurrentView('home');
            }}
            onViewMenu={() => setCurrentView('menu')}
          />
        </div>
      )}
            {currentView === 'menu' && selectedRestaurant && activeSession && (
        <RestaurantMenu
          restaurant={selectedRestaurant}
          sessionId={activeSession.id}
          onOrderPlace={(orderData) => {
            console.log('Order placed:', orderData);
            success(`Order ${orderData.order_number} placed successfully! You can order more items.`);
          }}
          onBack={() => setCurrentView('home')} // Goes back to session view
        />
      )}
    </main>
          {showAddMenuItem && (
        <AddMenuItemModal
          onClose={() => setShowAddMenuItem(false)}
          onSuccess={() => {
            setShowAddMenuItem(false);
            fetchManagerData(); // This will refresh menu items
          }}
        />
      )}

      {/* Modals */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRCheckIn}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {showAuthModal && (
        <SimpleAuthForm
          mode={authMode}
          loading={loading}
          onSubmit={handleAuth}
          onClose={() => setShowAuthModal(false)}
          onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        />
      )} 
        
        {showTransactions && (
            <TransactionHistoryModal
              onClose={() => setShowTransactions(false)}
            />
        )}

        {showFundWallet && (
          <FundWalletModal
            onClose={() => setShowFundWallet(false)}
            onSuccess={() => {
              setShowFundWallet(false);
              fetchWalletBalance(); // Refresh balance
            }}
          />
        )}

     {showCreateStaff && (
      <CreateStaffModal
        onClose={() => setShowCreateStaff(false)}
        onSuccess={() => {
          setShowCreateStaff(false);
          // Fetch updated staff list - need to implement this API call
          fetchManagerData(); // This will refresh all manager data including staff
        }}
      />
    )}


      {showAddRestaurant && (
        <AddRestaurantModal
          onClose={() => setShowAddRestaurant(false)}
          onSuccess={fetchRestaurants}
        />
      )}
      {selectedQRCode && (
        <QRCodeModal
          restaurant={selectedQRCode}
          onClose={() => setSelectedQRCode(null)}
        />
      )}

      {showLoyalty && (
        <LoyaltyPoints
          onClose={() => setShowLoyalty(false)}
  
        />
      )}
      {showPaymentConfirmation && paymentOrderData && (
        <PaymentConfirmation
          orderData={paymentOrderData}
          onConfirm={handleConfirmPayment}
          onDecline={handleDeclinePayment}
          onClose={() => {
            setShowPaymentConfirmation(false);
            setPaymentOrderData(null);
          }}
        />
      )}
    </div>
  );
}