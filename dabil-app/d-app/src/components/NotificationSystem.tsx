"use client";

// components/NotificationSystem.tsx
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface ModalNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  showToast: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  showModal: (type: NotificationType, title: string, message: string, options?: {
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success': return <CheckCircle className="w-5 h-5" />;
    case 'error': return <AlertCircle className="w-5 h-5" />;
    case 'warning': return <AlertTriangle className="w-5 h-5" />;
    case 'info': return <Info className="w-5 h-5" />;
  }
};

const getColors = (type: NotificationType) => {
  switch (type) {
    case 'success': return {
      toast: 'bg-green-50 border-green-200 text-green-800',
      icon: 'text-green-600',
      button: 'text-green-600 hover:text-green-800'
    };
    case 'error': return {
      toast: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      button: 'text-red-600 hover:text-red-800'
    };
    case 'warning': return {
      toast: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-600',
      button: 'text-yellow-600 hover:text-yellow-800'
    };
    case 'info': return {
      toast: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-600',
      button: 'text-blue-600 hover:text-blue-800'
    };
  }
};

const Toast: React.FC<{ notification: ToastNotification; onRemove: (id: string) => void }> = ({ 
  notification, 
  onRemove 
}) => {
  const colors = getColors(notification.type);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, notification.duration || 4000);
    
    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onRemove]);

  return (
    <div className={`${colors.toast} border rounded-lg p-4 shadow-lg mb-3 animate-slide-in-right`}>
      <div className="flex items-start">
        <div className={`${colors.icon} mr-3 mt-0.5`}>
          {getIcon(notification.type)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          {notification.message && (
            <p className="text-sm mt-1 opacity-90">{notification.message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(notification.id)}
          className={`${colors.button} ml-3 hover:bg-white hover:bg-opacity-20 rounded p-1`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Modal: React.FC<{ notification: ModalNotification; onRemove: (id: string) => void }> = ({ 
  notification, 
  onRemove 
}) => {
    
    const colors = getColors(notification.type);
  
  const handleConfirm = () => {
    notification.onConfirm?.();
    onRemove(notification.id);
  };
  
  const handleCancel = () => {
    notification.onCancel?.();
    onRemove(notification.id);
  };
    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-start mb-4">
          <div className={`${colors.icon} mr-3 mt-1`}>
            {getIcon(notification.type)}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {notification.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {notification.message}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-6">
          {notification.onCancel || notification.cancelText ? (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {notification.cancelText || 'Cancel'}
            </button>
          ) : null}
          
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors ${
              notification.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
              notification.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
              notification.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {notification.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [modal, setModal] = useState<ModalNotification | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((
    type: NotificationType, 
    title: string, 
    message?: string, 
    duration?: number
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const showModal = useCallback((
    type: NotificationType, 
    title: string, 
    message: string, 
    options?: {
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
      onCancel?: () => void;
    }
  ) => {
    const id = Date.now().toString();
    setModal({
      id,
      type,
      title,
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel
    });
  }, []);

  const success = useCallback((title: string, message?: string) => {
    showToast('success', title, message);
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showModal('error', title, message || 'Please try again or contact support if the problem persists.');
  }, [showModal]);

  const warning = useCallback((title: string, message?: string) => {
    showModal('warning', title, message || 'Please review and try again.');
  }, [showModal]);

  const info = useCallback((title: string, message?: string) => {
    showToast('info', title, message);
  }, [showToast]);

  const confirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void
  ) => {
    showModal('warning', title, message, {
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
      onCancel
    });
  }, [showModal]);

  const contextValue: NotificationContextType = {
    showToast,
    showModal,
    success,
    error,
    warning,
    info,
    confirm
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
        {toasts.map(toast => (
          <Toast key={toast.id} notification={toast} onRemove={removeToast} />
        ))}
      </div>
      
      {/* Modal Container */}
      {modal && (
        <Modal 
          notification={modal} 
          onRemove={() => setModal(null)} 
        />
      )}
    </NotificationContext.Provider>
  );
};