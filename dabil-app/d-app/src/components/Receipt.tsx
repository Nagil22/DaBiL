// Create a new Receipt component that shows after order is served
import React from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptProps {
  orderNumber: string;
  restaurantName: string;
  items: ReceiptItem[];
  subtotal: number;
  totalAmount: number;
  loyaltyPointsEarned: number;
  servedAt: string;
  sessionCode: string;
  onClose: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({
  orderNumber,
  restaurantName,
  items,
  subtotal,
  totalAmount,
  loyaltyPointsEarned,
  servedAt,
  sessionCode,
  onClose
}) => {
  const handleDownload = () => {
    // Create a simple text receipt for download
    const receiptText = `
DABIL RECEIPT
${restaurantName}
================
Order: ${orderNumber}
Session: ${sessionCode}
Served: ${new Date(servedAt).toLocaleString()}

ITEMS:
${items.map(item => `${item.quantity}x ${item.name} - ₦${(item.price * item.quantity).toLocaleString()}`).join('\n')}

================
Subtotal: ₦${subtotal.toLocaleString()}
TOTAL: ₦${totalAmount.toLocaleString()}

Loyalty Points Earned: +${loyaltyPointsEarned}
Payment Method: Dabil Wallet

Thank you for using Dabil!
Cashless • Cardless • Seamless
`;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dabil-receipt-${orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">✓</span>
          </div>
          <h2 className="text-xl font-bold text-black">Order Served!</h2>
          <p className="text-sm text-gray-600">{restaurantName}</p>
        </div>

        {/* Receipt Details */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Order #:</span>
            <span className="font-medium text-black">{orderNumber}</span>
          </div>
          
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Session:</span>
            <span className="font-medium text-black">{sessionCode}</span>
          </div>
          
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-600">Served at:</span>
            <span className="font-medium text-black">
              {new Date(servedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <h3 className="font-semibold text-black mb-3">Order Items</h3>
          
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1">
                  <span className="text-black">{item.quantity}x {item.name}</span>
                </div>
                <span className="font-medium text-black">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-black">₦{subtotal.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span className="text-black">Total Paid:</span>
            <span className="text-blue-600">₦{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Loyalty Points */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">+{loyaltyPointsEarned}</div>
            <div className="text-sm text-gray-600">Loyalty Points Earned</div>
            <div className="text-xs text-gray-500 mt-1">Use across all Dabil restaurants</div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-600">Paid via</div>
          <div className="font-medium text-black">Dabil Wallet</div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Download Receipt
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Thank you for using Dabil!</p>
          <p className="text-xs text-gray-400">Cashless • Cardless • Seamless</p>
        </div>
      </div>
    </div>
  );
};