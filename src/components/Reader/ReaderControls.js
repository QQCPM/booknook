import React from 'react';
import { FiMinus, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ReaderControls = ({
  theme,
  setTheme,
  fontSize,
  setFontSize,
  progress,
  currentPage,
  totalPages,
  prevPage,
  nextPage
}) => {
  // Handle font size changes
  const decreaseFontSize = () => {
    if (fontSize > 70) {
      setFontSize(fontSize - 10);
    }
  };
  
  const increaseFontSize = () => {
    if (fontSize < 150) {
      setFontSize(fontSize + 10);
    }
  };
  
  // Handle theme changes
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };
  
  return (
    <div className="reader-controls" onClick={(e) => e.stopPropagation()}>
      <div className="controls-section">
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            {Math.round(progress)}% • Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>
      
      <div className="controls-section">
        <div className="theme-controls">
          <button 
            className={`theme-button light ${theme === 'light' ? 'active' : ''}`}
            onClick={() => changeTheme('light')}
          >
            Light
          </button>
          <button 
            className={`theme-button sepia ${theme === 'sepia' ? 'active' : ''}`}
            onClick={() => changeTheme('sepia')}
          >
            Sepia
          </button>
          <button 
            className={`theme-button dark ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => changeTheme('dark')}
          >
            Dark
          </button>
        </div>
      </div>
      
      <div className="controls-section">
        <div className="font-controls">
          <button 
            className="font-button"
            onClick={decreaseFontSize}
            disabled={fontSize <= 70}
          >
            <FiMinus />
          </button>
          <span className="font-size-text">{fontSize}%</span>
          <button 
            className="font-button"
            onClick={increaseFontSize}
            disabled={fontSize >= 150}
          >
            <FiPlus />
          </button>
        </div>
      </div>
      
      <div className="controls-section">
        <div className="navigation-controls">
          <button 
            className="nav-button"
            onClick={prevPage}
          >
            <FiChevronLeft />
          </button>
          <button 
            className="nav-button"
            onClick={nextPage}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderControls;