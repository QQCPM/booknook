import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiUser, FiLogOut, FiUpload, FiHome, FiX, FiBook } from 'react-icons/fi';
import { logoutUser } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="logo">
            {/* Replace image with icon */}
            <FiBook size={24} />
            <span>BookNook</span>
          </Link>
        </div>
        
        {currentUser ? (
          <>
            <div className="navbar-menu">
              <Link to="/library" className="nav-item">
                Library
              </Link>
              <Link to="/upload" className="nav-item">
                Upload
              </Link>
            </div>
            
            <div className="navbar-auth">
              <div className="user-profile">
                <img 
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=random`} 
                  alt={currentUser.displayName || 'User'}
                  className="user-avatar"
                />
                <div className="user-menu">
                  <Link to="/profile" className="user-menu-item">
                    <FiUser />
                    <span>Profile</span>
                  </Link>
                  <Link to="/upload" className="user-menu-item">
                    <FiUpload />
                    <span>Upload Book</span>
                  </Link>
                  <button 
                    className="user-menu-item logout"
                    onClick={handleLogout}
                  >
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              className="mobile-menu-toggle"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <FiX /> : <FiMenu />}
            </button>
            
            {showMobileMenu && (
              <div className="mobile-menu">
                <div className="mobile-user-info">
                  <img 
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=random`} 
                    alt={currentUser.displayName || 'User'}
                    className="mobile-user-avatar"
                  />
                  <div className="mobile-user-details">
                    <span className="mobile-user-name">
                      {currentUser.displayName || 'User'}
                    </span>
                    <span className="mobile-user-email">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
                
                <div className="mobile-menu-items">
                  <Link 
                    to="/library" 
                    className="mobile-menu-item"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <FiHome />
                    <span>Library</span>
                  </Link>
                  <Link 
                    to="/upload" 
                    className="mobile-menu-item"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <FiUpload />
                    <span>Upload Book</span>
                  </Link>
                  <Link 
                    to="/profile" 
                    className="mobile-menu-item"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <FiUser />
                    <span>Profile</span>
                  </Link>
                  <button 
                    className="user-menu-item logout"
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                  >
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="btn btn-link">
              Sign In
            </Link>
            <Link to="/signup" className="btn btn-primary">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;