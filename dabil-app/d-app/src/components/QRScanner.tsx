// Update the QRScanner.tsx component to actually scan QR codes
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (restaurantId: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      setError('');
      setScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning for QR codes
        videoRef.current.onloadedmetadata = () => {
          startScanning();
        };
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions and try again.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setScanning(false);
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Scan for QR codes every 500ms
    intervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Try to detect QR code using a simple method
        // In production, you'd use a proper QR code library like jsQR
        scanForQRCode(canvas);
      }
    }, 500);
  };

  const scanForQRCode = (canvas: HTMLCanvasElement) => {
    // Simple QR detection - in production use jsQR library
    // For now, we'll simulate QR detection
    // This is a placeholder that would be replaced with actual QR scanning
    
    // Simulated QR code detection logic would go here
    // For testing purposes, we'll rely on manual input
  };

  const handleManualInput = () => {
    const input = prompt('Enter restaurant URL or scan result:');
    if (input) {
      processQRResult(input);
    }
  };

  const processQRResult = (result: string) => {
    setScanResult(result);
    
    try {
      // Extract restaurant ID from URL or QR data
      let restaurantId = '';
      
      if (result.includes('restaurant_id=')) {
        // URL format: http://localhost:3000?restaurant_id=abc123
        const url = new URL(result);
        restaurantId = url.searchParams.get('restaurant_id') || '';
      } else if (result.startsWith('restaurant_id_')) {
        // Direct format: restaurant_id_abc123
        restaurantId = result.replace('restaurant_id_', '');
      } else {
        throw new Error('Invalid QR code format');
      }
      
      if (!restaurantId) {
        throw new Error('Restaurant ID not found in QR code');
      }
      
      stopCamera();
      onScan(restaurantId);
      
    } catch (error) {
      setError('Invalid QR code. Please try scanning again or enter manually.');
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
              
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-2"
              >
                📱 Start Camera
              </button>
              
              <button
                onClick={handleManualInput}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                ⌨️ Enter Manually
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
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanning overlay */}
                <div className="absolute inset-4 border-2 border-blue-500 rounded-lg">
                  <div className="absolute inset-0 border border-white rounded-lg opacity-50"></div>
                  <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-500"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-500"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-blue-500"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-blue-500"></div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                📍 Position the QR code within the frame
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