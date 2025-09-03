import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  session_code: string;
  restaurant_name: string;
  restaurant_type: string;
  table_number: number;
  party_size: number;
  checked_in_at: string;
  total_spent: number;
}

interface SessionManagementProps {
  onCheckOut: () => void;
  onViewMenu: () => void;
}

export const SessionManagement: React.FC<SessionManagementProps> = ({ 
  onCheckOut, 
  onViewMenu 
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchActiveSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dabil_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      } else if (response.status === 404) {
        setSession(null);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/checkout`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dabil_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setSession(null);
        onCheckOut();
        alert('Checked out successfully!');
      }
    } catch (error) {
      console.error('Check out failed:', error);
      alert('Check out failed. Please try again.');
    }
  };

  useEffect(() => {
    fetchActiveSession();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white">
        <div className="text-center py-8 text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white">
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">No active session</div>
          <div className="text-sm text-gray-400">Scan a restaurant QR code to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white">
      <div className="mb-4">
      <button
        onClick={() => window.history.back()} // Or pass onBack prop
        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
      >
        ← Back
      </button>
    </div>
      {/* Active Session Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-semibold text-black">{session.restaurant_name}</h2>
            <div className="text-sm text-gray-600">{session.restaurant_type} Restaurant</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-blue-600">Session: {session.session_code}</div>
            <div className="text-xs text-gray-500">
              Table {session.table_number} • {session.party_size} guests
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Checked in: {new Date(session.checked_in_at).toLocaleTimeString()}
          </span>
          <span className="font-medium text-black">
            Spent: ₦{session.total_spent.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onViewMenu}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          📖 View Menu & Order
        </button>
        
        <button
          onClick={handleCheckOut}
          className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          🚶‍♂️ Check Out
        </button>
      </div>

      {/* Session Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          💡 Your orders will be automatically charged to your Dabil wallet when served.
        </div>
      </div>
    </div>
  );
};