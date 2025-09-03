import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (restaurantId: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [hasCamera, setHasCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  // Check camera availability
  useEffect(() => {
    QrScanner.hasCamera().then(hasCamera => {
      setHasCamera(hasCamera);
      if (!hasCamera) {
        setError('No camera found on this device');
      }
    });
  }, []);

 const startCamera = async () => {
  try {
    setError('');
    setScanning(true);
    
    // Wait for video element to be available
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!videoRef.current) {
      throw new Error('Video element not ready. Please try again.');
    }

    if (!hasCamera) {
      throw new Error('No camera available');
    }

    // Stop any existing scanner
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    
    // Create new scanner instance
    scannerRef.current = new QrScanner(
      videoRef.current,
      (result) => {
        console.log('QR scan result:', result.data);
        processQRResult(result.data);
      },
      {
        onDecodeError: (error) => {
          // Silently ignore decode errors to keep scanning
          console.log('Decode error (continuing):', error);
        },
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment', // Use back camera on mobile
      }
    );
    
    await scannerRef.current.start();
    console.log('Camera started successfully');
    
  } catch (err: any) {
    console.error('Camera start error:', err);
    setScanning(false);
    
    if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
      setError('Camera permission denied. Please allow camera access and try again.');
    } else if (err.name === 'NotFoundError') {
      setError('No camera found. Please ensure your device has a camera.');
    } else if (err.name === 'NotSupportedError') {
      setError('Camera not supported on this browser. Try Chrome or Safari.');
    } else if (err.message.includes('Video element not ready')) {
      setError('Camera initializing... Please try the "Start Camera" button again.');
    } else {
      setError(`Camera error: ${err.message}. Try refreshing the page.`);
    }
  }
};

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const processQRResult = (result: string) => {
  console.log('Processing QR result:', result);
  setScanResult(result);
  
  try {
    let restaurantId = '';
    
    // Handle different QR code formats
    if (result.includes('restaurant_id=')) {
      const url = new URL(result);
      restaurantId = url.searchParams.get('restaurant_id') || '';
    } 
    else if (result.includes('restaurant_id_')) {
      restaurantId = result.replace('restaurant_id_', '');
    }
    else if (result.match(/^[a-f0-9-]{36}$/i)) {
      restaurantId = result;
    }
    else if (result.includes('dabil') && result.includes('restaurant_id=')) {
      const url = new URL(result);
      restaurantId = url.searchParams.get('restaurant_id') || '';
    }
    else {
      throw new Error('Invalid QR code format');
    }
    
    if (!restaurantId) {
      throw new Error('Restaurant ID not found in QR code');
    }
    
    console.log('About to call onScan with restaurant ID:', restaurantId);
    stopCamera();
    onScan(restaurantId);
    
  } catch (error) {
    console.error('QR processing error:', error);
    setError('Invalid QR code. Please try scanning again or enter restaurant ID manually.');
    setScanResult('');
  }
};

  const handleManualInput = () => {
    const input = prompt('Enter restaurant ID (UUID format):');
    if (input) {
      if (input.match(/^[a-f0-9-]{36}$/i)) {
        stopCamera();
        onScan(input);
      } else {
        setError('Please enter a valid restaurant ID in UUID format');
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-black">Scan Restaurant QR Code</h3>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            {error.includes('permission') && (
              <div className="mt-2 text-sm">
                <p>To fix this:</p>
                <p>1. Click the camera icon in your browser's address bar</p>
                <p>2. Select "Allow" for camera access</p>
                <p>3. Refresh the page and try again</p>
              </div>
            )}
          </div>
        )}

        {scanResult && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            QR Code detected! Processing check-in...
          </div>
        )}

        <div className="space-y-4">
          {!scanning ? (
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                <Camera className="w-16 h-16 text-gray-400" />
              </div>
              
              <p className="text-gray-600 mb-4">
                Point your camera at the restaurant's QR code to check in
              </p>
              
              {hasCamera ? (
                <button
                  onClick={startCamera}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-2"
                >
                  Start Camera
                </button>
              ) : (
                <div className="w-full bg-gray-400 text-white py-3 rounded-lg font-medium mb-2">
                  Camera Not Available
                </div>
              )}
              
              <button
                onClick={handleManualInput}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Enter Restaurant ID Manually
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg object-cover mb-4"
                  playsInline
                  muted
                  autoPlay
                />
                
                <div className="absolute inset-4 border-2 border-blue-500 rounded-lg">
                  <div className="absolute inset-0 border border-white rounded-lg opacity-50"></div>
                  <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-500"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-500"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-blue-500"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-blue-500"></div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                Position the QR code within the frame
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Stop Camera
                </button>
                
                <button
                  onClick={handleManualInput}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Manual Input
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};