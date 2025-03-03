import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const Alert = ({ type = 'info', message, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  // Auto-dismiss after duration
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  if (!isVisible) return null;
  
  // Icon based on alert type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle />;
      case 'error':
        return <FiAlertCircle />;
      case 'info':
      default:
        return <FiInfo />;
    }
  };
  
  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-icon">
        {getIcon()}
      </div>
      <div className="alert-content">
        {message}
      </div>
      {onClose && (
        <button 
          className="alert-close"
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
        >
          <FiX />
        </button>
      )}
    </div>
  );
};

export default Alert;