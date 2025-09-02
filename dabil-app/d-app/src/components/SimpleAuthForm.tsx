import React, { useState, useRef, useEffect } from 'react';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (data: { email: string; name: string; password: string; loginType?: 'user' | 'staff' }) => void;
  onClose: () => void;
  onToggleMode: () => void;
  loading: boolean;
}

export const SimpleAuthForm: React.FC<AuthFormProps> = ({ 
  mode, 
  onSubmit, 
  onClose, 
  onToggleMode, 
  loading 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loginType, setLoginType] = useState<'user' | 'staff'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Update individual field without losing focus
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    return '';
  };

  const validateName = (name: string) => {
    if (!name) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters long';
    return '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    newErrors.email = validateEmail(formData.email);
    newErrors.password = validatePassword(formData.password);
    
    if (mode === 'signup') {
      newErrors.name = validateName(formData.name);
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    onSubmit({ 
      email: formData.email.trim(), 
      name: formData.name.trim(), 
      password: formData.password,
      loginType 
    });
  };

  const handleModeToggle = () => {
    // Clear form and errors when switching modes
    setFormData({ email: '', name: '', password: '', confirmPassword: '' });
    setErrors({});
    onToggleMode();
  };

  // Focus email input when modal opens or login type changes
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [loginType]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-black">
            {mode === 'login' ? 'Login to Dabil' : 'Create Account'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            type="button"
          >
            ×
          </button>
        </div>

        {mode === 'login' && (
          <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={() => setLoginType('user')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                loginType === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Customer Login
            </button>
            <button
              type="button"
              onClick={() => setLoginType('staff')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                loginType === 'staff' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Staff Login
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-black font-medium mb-2">
              Email Address
            </label>
            <input
              ref={emailInputRef}
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={loginType === 'staff' ? 'staff@restaurant.com' : 'john@example.com'}
              className={`w-full border rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                errors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              required
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Name Field (Signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-black font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="John Doe"
                className={`w-full border rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="block text-black font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Enter your password"
                className={`w-full border rounded-lg px-4 py-3 pr-12 text-black focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                  errors.password ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            {mode === 'signup' && !errors.password && (
              <p className="text-gray-500 text-sm mt-1">Must be at least 6 characters long</p>
            )}
          </div>

          {/* Confirm Password Field (Signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-black font-medium mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                className={`w-full border rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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
              mode === 'login' ? 'Login' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleModeToggle}
            className="text-blue-600 hover:text-blue-700 text-sm underline"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>

        {/* Help text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            {mode === 'login' 
              ? loginType === 'staff' 
                ? 'Staff members: Use your restaurant email and password'
                : 'Customers: Use your registered email and password'
              : 'Create your Dabil account to start enjoying cashless dining'
            }
          </p>
        </div>
      </div>
    </div>
  );
};