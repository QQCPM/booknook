import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile, verifyEmail } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../UI/Alert';

const Profile = () => {
  const { currentUser, userData, updateUserState, setError } = useAuth();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalBookmarks: 0,
    favoriteBooks: 0
  });
  
  // Load user data
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
    }
    
    if (userData) {
      const bookmarks = userData.bookmarks || [];
      const favorites = userData.favoriteBooks || [];
      
      setStats({
        totalBooks: userData.totalBooks || 0,
        totalBookmarks: bookmarks.length,
        favoriteBooks: favorites.length
      });
    }
  }, [currentUser, userData]);
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }
    
    try {
      setLoading(true);
      await updateUserProfile({ displayName });
      await updateUserState();
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Update profile error:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendVerificationEmail = async () => {
    try {
      setLoading(true);
      await verifyEmail();
      setSuccess('Verification email sent! Check your inbox.');
    } catch (err) {
      console.error('Send verification email error:', err);
      setError('Failed to send verification email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!currentUser || !userData) {
    return (
      <div className="container">
        <p>Loading profile...</p>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Profile Settings</h2>
        {success && <Alert type="success" message={success} />}
      </div>
      
      <div className="profile-content">
        <div className="profile-section">
          <h3>Account Information</h3>
          <div className="account-details">
            <p>
              <strong>Email:</strong> {currentUser.email}
              {!currentUser.emailVerified && (
                <span className="verification-badge">
                  Not Verified
                  <button 
                    className="btn btn-link"
                    onClick={handleSendVerificationEmail}
                    disabled={loading}
                  >
                    Verify Now
                  </button>
                </span>
              )}
            </p>
            <p><strong>Account Created:</strong> {new Date(userData.createdAt?.toDate()).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="profile-section">
          <h3>Personal Information</h3>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
        
        <div className="profile-section">
          <h3>Reading Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalBooks}</div>
              <div className="stat-label">Books</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalBookmarks}</div>
              <div className="stat-label">Bookmarks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.favoriteBooks}</div>
              <div className="stat-label">Favorites</div>
            </div>
          </div>
        </div>
        
        <div className="profile-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/library')}
          >
            Return to Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;