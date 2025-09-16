// Create components/PaymentConfirmation.tsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, CreditCard, Clock } from 'lucide-react';

interface PaymentConfirmationProps {
  orderData: {
    id: string;
    order_number: string;
    total_amount: number;
    restaurant_name: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  onConfirm: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  orderData,
  onConfirm,
  onDecline,
  onClose
}) => {
  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await onDecline();
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Ready!</h2>
          <p className="text-gray-600">Your order is ready to be served</p>
        </div>

        {/* Restaurant & Order Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-center mb-3">
            <h3 className="font-semibold text-gray-900">{orderData.restaurant_name}</h3>
            <p className="text-sm text-gray-600">Order #{orderData.order_number}</p>
          </div>
          
          <div className="space-y-1 text-sm">
            {orderData.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-700">{item.quantity}x {item.name}</span>
                <span className="font-medium">₦{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-300 mt-3 pt-3 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span className="text-blue-600">₦{orderData.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Confirmation Message */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                The waiter is ready to serve your order
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Payment will be deducted from your Dabil wallet upon confirmation
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleDecline}
            disabled={confirming || declining}
            className="flex-1 bg-red-600 text-white py-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
          >
            {declining ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Declining...
              </span>
            ) : (
              <>
                <XCircle className="w-5 h-5 mr-2" />
                Decline Payment
              </>
            )}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={confirming || declining}
            className="flex-1 bg-green-600 text-white py-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
          >
            {confirming ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirm & Pay
              </>
            )}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          This request will timeout in 2 minutes if no action is taken
        </p>
      </div>
    </div>
  );
};