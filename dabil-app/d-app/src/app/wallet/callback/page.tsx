'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '../../../lib/apiclient';

export default function WalletCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference');

        if (!reference) {
          setStatus('failed');
          setMessage('Payment reference not found');
          return;
        }

        const response = await apiService.verifyPayment(reference);
        
        if (response.success) {
          setStatus('success');
          setMessage('Payment successful!');
          setDetails({
            amount: response.amount,
            newBalance: response.newBalance
            // Removed loyaltyPoints since wallet funding doesn't earn points
          });
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setStatus('failed');
          setMessage('Payment verification failed');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.message || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          )}
          {status === 'success' && (
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          )}
          {status === 'failed' && (
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'loading' && 'Verifying Payment...'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
        </h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {status === 'success' && details && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700">Amount Added:</span>
                <span className="font-semibold text-green-900">₦{details.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">New Balance:</span>
                <span className="font-semibold text-green-900">₦{details.newBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-sm text-gray-500 mb-4">
            Redirecting you back to the app in a few seconds...
          </div>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {status === 'success' ? 'Continue to App' : 'Back to App'}
        </button>
      </div>
    </div>
  );
}