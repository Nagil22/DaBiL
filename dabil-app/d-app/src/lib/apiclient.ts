// Complete API Service with email/password authentication - FIXED
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dabil.onrender.com/api';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  balance?: number;
  total_funded?: number;
  total_spent?: number;
  points_balance?: number;
  current_tier?: string;
  email_verified?: boolean;
  lifetime_points_earned?: number; 
  lifetime_points_redeemed?: number; 
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  restaurant_type: string;
  cuisine_type: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logo_url?: string;
  cover_image_url?: string;
  status: string;
  owner_user_id?: string;
  qr_code?: string;
  onboarded_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

interface StaffResponse {
  staff: any;
  token: string;
  message: string;
}

// API Service Class
class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // FIXED: Check pos_token first for staff, then dabil_token for users
      this.token = localStorage.getItem('pos_token') || localStorage.getItem('dabil_token');
      console.log('🔑 ApiService initialized with token:', this.token ? 'Present' : 'Missing');
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // CRITICAL FIX: Reload token from localStorage on every request
    // This ensures we always use the latest token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('pos_token') || localStorage.getItem('dabil_token');
    }
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('🔐 Authorization header added:', headers.Authorization.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No token available for request');
    }
    
    return headers;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('📡 API Request:', {
      method: options.method || 'GET',
      url,
      hasAuth: !!this.token
    });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      console.log('📥 API Response:', {
        status: response.status,
        statusText: response.statusText,
        url
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ API Error Response:', errorData);
        } catch {
          errorData = { error: 'Request failed' };
        }
        
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }

  // Auth Methods - Updated for email/password
  async signup(data: { email: string; name: string; password: string }): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.token = response.token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dabil_token', response.token);
      localStorage.setItem('dabil_user', JSON.stringify(response.user));
      console.log('✅ User signup successful, token saved');
    }
    
    return response;
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.token = response.token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dabil_token', response.token);
      localStorage.setItem('dabil_user', JSON.stringify(response.user));
      console.log('✅ User login successful, token saved');
    }
    
    return response;
  }

  async logout(): Promise<{ message: string }> {
    try {
      const response = await this.makeRequest<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      this.token = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dabil_token');
        localStorage.removeItem('dabil_user');
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        console.log('🧹 Tokens cleared from localStorage');
      }
    }
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalRevenue: number; activeUsers: number }> {
    return this.makeRequest('/admin/stats');
  }

  async getProfile(): Promise<{ user: User }> {
    return this.makeRequest('/auth/profile');
  }

  async updateProfile(data: { name: string; email: string }): Promise<{ user: User }> {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.makeRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Staff Auth Methods
  async staffLogin(data: { email: string; password: string }): Promise<StaffResponse> {
    console.log('🔐 Staff login attempt:', data.email);
    
    const response = await this.makeRequest<StaffResponse>('/staff/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.token = response.token;
    if (typeof window !== 'undefined') {
      // CRITICAL: Store in pos_token for staff
      localStorage.setItem('pos_token', response.token);
      localStorage.setItem('pos_user', JSON.stringify(response.staff));
      console.log('✅ Staff login successful, token saved to pos_token');
      console.log('👤 Staff details:', {
        id: response.staff.id,
        name: response.staff.name,
        role: response.staff.role,
        restaurant_id: response.staff.restaurant_id
      });
    }
    
    return response;
  }

  async createStaff(data: { restaurant_id: string; email: string; name: string; role: string; password: string }): Promise<any> {
    return this.makeRequest('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Restaurant Methods
  async getRestaurants(): Promise<{ restaurants: any[] }> {
    return this.makeRequest('/restaurants');
  }

  async getRestaurant(id: string): Promise<{ restaurant: any }> {
    return this.makeRequest(`/restaurants/${id}`);
  }

  async deleteRestaurant(restaurantId: string): Promise<{ message: string }> {
    return this.makeRequest(`/restaurants/${restaurantId}`, {
      method: 'DELETE',
    });
  }

  async addMyMenuItem(data: {
    name: string;
    description: string;
    price: number;
    category: string;
  }): Promise<any> {
    return this.makeRequest('/manager/menu-item', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyStaff(): Promise<{ staff: any[] }> {
    return this.makeRequest('/manager/staff');
  }

  async createRestaurant(data: {
    name: string;
    restaurant_type: string;
    cuisine_type: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<{ restaurant: Restaurant; message: string }> {
    return this.makeRequest('/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addMenuItem(restaurantId: string, data: {
    name: string;
    description: string;
    price: number;
    category: string;
  }): Promise<any> {
    return this.makeRequest(`/restaurants/${restaurantId}/menu`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Session Methods
  async checkIn(data: { 
    restaurantId: string; 
    tableNumber?: number; 
    partySize?: number; 
  }): Promise<any> {
    return this.makeRequest('/sessions/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkOut(sessionId: string): Promise<any> {
    return this.makeRequest(`/sessions/${sessionId}/checkout`, {
      method: 'PUT',
    });
  }

  async getActiveSession(): Promise<any> {
    return this.makeRequest('/sessions/active');
  }

  // Order Methods
  async createOrder(data: {
    sessionId: string;
    items: Array<{ menuItemId: string; quantity: number }>;
    notes?: string;
  }): Promise<any> {
    return this.makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async serveOrder(orderId: string): Promise<any> {
    return this.makeRequest(`/orders/${orderId}/serve`, {
      method: 'PUT',
    });
  }

  // POS Methods
async getCheckedInGuests(): Promise<{ guests: any[] }> {
  console.log('🏪 Fetching checked-in guests for authenticated restaurant');
  return this.makeRequest(`/pos/guests`);
}

async getSessionOrders(sessionId: string): Promise<{ orders: any[] }> {
  return this.makeRequest(`/pos/session/${sessionId}/orders`);
}

async getRestaurantMenu(): Promise<{ menuItems: any[] }> {
  return this.makeRequest(`/pos/menu`);
}

  // Wallet Methods
  async getWalletBalance(): Promise<any> {
    return this.makeRequest('/wallet/balance');
  }

  async fundWallet(data: { amount: number; email: string }): Promise<any> {
    return this.makeRequest('/wallet/fund', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyPayment(reference: string): Promise<any> {
    return this.makeRequest(`/wallet/verify/${reference}`);
  }

  async getTransactions(limit = 20, offset = 0): Promise<{ transactions: any[] }> {
    return this.makeRequest(`/wallet/transactions?limit=${limit}&offset=${offset}`);
  }

  async debitWallet(data: { 
    amount: number; 
    orderId?: string; 
    description: string 
  }): Promise<any> {
    return this.makeRequest('/wallet/debit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async redeemPoints(data: { points: number }): Promise<any> {
    return this.makeRequest('/wallet/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestPaymentConfirmation(orderId: string): Promise<any> {
    return this.makeRequest(`/orders/${orderId}/request-payment`, {
      method: 'POST',
    });
  }

  async checkPaymentStatus(orderId: string): Promise<any> {
    return this.makeRequest(`/orders/${orderId}/payment-status`);
  }

  async confirmPayment(orderId: string): Promise<any> {
    return this.makeRequest(`/orders/${orderId}/confirm-payment`, {
      method: 'POST',
    });
  }

  async declinePayment(orderId: string): Promise<any> {
    return this.makeRequest(`/orders/${orderId}/decline-payment`, {
      method: 'POST',
    });
  }

  // Restaurant Manager Methods
  async getMyRestaurant(): Promise<{ restaurant: any }> {
    return this.makeRequest('/manager/my-restaurant');
  }

  async getMyRestaurantStats(): Promise<{ stats: any }> {
    return this.makeRequest('/manager/stats');
  }

  async getAdminPayouts(): Promise<{ payouts: any[] }> {
    return this.makeRequest('/admin/payouts');
  }

  async getAdminPayoutHistory(limit: number = 20): Promise<{ payoutHistory: any[] }> {
    return this.makeRequest(`/admin/payouts/history?limit=${limit}`);
  }

  async getManagerLoyaltyOverview(): Promise<{ 
    restaurant_loyalty_stats: {
      total_points_earned: number;
      total_points_redeemed: number;
      active_customers: number;
      total_customer_spend: number;
      average_points_per_customer: number;
      points_earned_this_month: number;
      total_sessions: number;
      restaurant_name: string;
    };
    tierDistribution: any[];
    topCustomers: any[];
    monthlyTrend: any[];
  }> {
    return this.makeRequest('/manager/loyalty-overview');
  }

  async createMyStaff(data: {
    email: string;
    name: string;
    role: string;
    password: string;
  }): Promise<any> {
    return this.makeRequest('/manager/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Utility Methods
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pos_token') || localStorage.getItem('dabil_token');
      return !!token;
    }
    return !!this.token;
  }

  getCurrentUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('pos_user') || localStorage.getItem('dabil_user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  setToken(token: string) {
    this.token = token;
    console.log('🔑 Token manually set');
  }

  // Debug method to check token status
  debugTokenStatus() {
    if (typeof window !== 'undefined') {
      const posToken = localStorage.getItem('pos_token');
      const dabilToken = localStorage.getItem('dabil_token');
      const posUser = localStorage.getItem('pos_user');
      const dabilUser = localStorage.getItem('dabil_user');
      
      console.log('🔍 Token Debug Status:', {
        hasPostToken: !!posToken,
        hasDabilToken: !!dabilToken,
        currentToken: this.token?.substring(0, 20) + '...',
        posUser: posUser ? JSON.parse(posUser) : null,
        dabilUser: dabilUser ? JSON.parse(dabilUser) : null
      });
    }
  }

  async testConnection(): Promise<{ status: string }> {
    return this.makeRequest('/health');
  }
}

export const apiService = new ApiService();
export default apiService;