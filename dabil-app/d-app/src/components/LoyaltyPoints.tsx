// Update the LoyaltyPoints.tsx component to show earning history
import React, { useState, useEffect } from 'react';
import apiService from '../lib/apiclient';

interface LoyaltyData {
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  current_tier: string;
}

interface PointsHistory {
  date: string;
  restaurant: string;
  points: number;
  amount_spent: number;
}

interface LoyaltyPointsProps {
  onClose: () => void;
}

export const LoyaltyPoints: React.FC<LoyaltyPointsProps> = ({ onClose }) => {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'redeem'>('overview');

  const fetchLoyaltyData = async () => {
    try {
      const response = await apiService.getProfile();
      setLoyaltyData({
        points_balance: response.user.points_balance || 0,
        lifetime_points_earned: response.user.lifetime_points_earned || 0,
        lifetime_points_redeemed: response.user.lifetime_points_redeemed || 0,
        current_tier: response.user.current_tier || 'bronze'
      });
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error);
    }
  };

  const fetchPointsHistory = async () => {
    try {
      // This would be a new API endpoint to get points earning history
      const response = await apiService.getTransactions(20, 0);
      const spendingTransactions = response.transactions.filter(tx => 
        tx.transaction_type === 'debit' && tx.order_details
      );
      
      // Mock points history for now - in production this would come from backend
      const history = spendingTransactions.map(tx => ({
        date: tx.created_at,
        restaurant: 'Restaurant Name', // Would come from order details
        points: Math.floor(tx.amount * 0.1), // Approximate points earned
        amount_spent: tx.amount
      }));
      
      setPointsHistory(history);
    } catch (error) {
      console.error('Failed to fetch points history:', error);
    }
  };

  const handleRedeem = async () => {
    const points = parseInt(redeemAmount);
    if (!points || points <= 0) {
      alert('Please enter valid points amount');
      return;
    }
    
    if (points < 4) {
      alert('Minimum redemption is 4 points (₦1)');
      return;
    }
    
    if (points % 4 !== 0) {
      alert('Points must be divisible by 4 (4 points = ₦1)');
      return;
    }
    
    if (points > (loyaltyData?.points_balance || 0)) {
      alert('Insufficient points balance');
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiService.redeemPoints({ points });
      
      if (response.success) {
        alert(`₦${response.walletCredited.toLocaleString()} added to wallet from ${points} points!`);
        setRedeemAmount('');
        fetchLoyaltyData();
      }
    } catch (error: any) {
      alert(`Redemption failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
    fetchPointsHistory();
  }, []);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-100 text-orange-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'platinum': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTierProgress = (tier: string, lifetimePoints: number) => {
    const tiers = {
      bronze: { min: 0, max: 2000 },
      silver: { min: 2000, max: 5000 },
      gold: { min: 5000, max: 10000 },
      platinum: { min: 10000, max: null }
    };
    
    const currentTier = tiers[tier as keyof typeof tiers];
    if (!currentTier.max) return 100; // Platinum is max tier
    
    const progress = ((lifetimePoints - currentTier.min) / (currentTier.max - currentTier.min)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-black">Loyalty Points</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'overview' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'history' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('redeem')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'redeem' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Redeem
          </button>
        </div>

        <div className="p-6">
          {loyaltyData && (
            <>
              {activeTab === 'overview' && (
                <div>
                  {/* Points Balance */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        {loyaltyData.points_balance.toLocaleString()}
                      </div>
                      <div className="text-blue-200 mb-3">Available Points</div>
                      
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTierColor(loyaltyData.current_tier)}`}>
                        {loyaltyData.current_tier.toUpperCase()} TIER
                      </div>
                    </div>
                  </div>

                  {/* Tier Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Tier Progress</span>
                      <span>{loyaltyData.lifetime_points_earned.toLocaleString()} lifetime points</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getTierProgress(loyaltyData.current_tier, loyaltyData.lifetime_points_earned)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">
                        {loyaltyData.lifetime_points_earned.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Earned</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">
                        {loyaltyData.lifetime_points_redeemed.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Redeemed</div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <strong>🎯 Earn Points:</strong> Get 10% of your spending as points at any Dabil restaurant. 
                      Higher tiers earn bonus multipliers!
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <h4 className="font-semibold text-black mb-4">Recent Points Activity</h4>
                  
                  {pointsHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl text-gray-400">⭐</span>
                      </div>
                      <p className="text-gray-500">No points earned yet</p>
                      <p className="text-sm text-gray-400">Points are earned when you spend at restaurants</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {pointsHistory.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-black">+{entry.points} points</div>
                            <div className="text-sm text-gray-600">{entry.restaurant}</div>
                            <div className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-900">₦{entry.amount_spent.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">spent</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'redeem' && (
                <div>
                  <h4 className="font-semibold text-black mb-4">Redeem Points</h4>
                  
                  <div className="mb-4">
                    <label className="block text-black font-medium mb-2">
                      Points to Redeem (4 points = ₦1)
                    </label>
                    <input
                      type="number"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      placeholder="Enter points amount"
                      max={loyaltyData.points_balance}
                      min="4"
                      step="4"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:border-blue-500"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      Available: {loyaltyData.points_balance.toLocaleString()} points = ₦{Math.floor(loyaltyData.points_balance / 4).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={handleRedeem}
                    disabled={loading || !redeemAmount || parseInt(redeemAmount) < 4 || parseInt(redeemAmount) % 4 !== 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                  >
                    {loading ? 'Processing...' : `Redeem ₦${redeemAmount ? Math.floor(parseInt(redeemAmount) / 4).toLocaleString() : '0'}`}
                  </button>

                  {/* Tier Benefits */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <h5 className="font-medium text-yellow-800 mb-2">🏆 Tier Benefits</h5>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <div>Bronze: 1x points (10% of spending)</div>
                      <div>Silver: 1.2x points (12% of spending)</div>
                      <div>Gold: 1.5x points (15% of spending)</div>
                      <div>Platinum: 2x points (20% of spending)</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};