import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { addBookmark, getBookBookmarks, removeBookmark } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../UI/Loading';

const BookmarkManager = ({ bookId, onClose, onSelectBookmark, currentCfi, renderer }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [note, setNote] = useState('');
  
  const { currentUser } = useAuth();
  
  // Load bookmarks
  useEffect(() => {
    async function fetchBookmarks() {
      try {
        const bookmarkData = await getBookBookmarks(currentUser.uid, bookId);
        setBookmarks(bookmarkData);
      } catch (err) {
        console.error('Error fetching bookmarks:', err);
        setError('Failed to load bookmarks');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBookmarks();
  }, [bookId, currentUser]);
  
  // Add a bookmark
  const handleAddBookmark = async () => {
    if (!currentCfi) return;
    
    try {
      setLoading(true);
      
      // Get text content at current location (for excerpt)
      let excerpt = '';
      if (renderer) {
        const range = renderer.getRange(currentCfi);
        if (range) {
          excerpt = range.toString().slice(0, 100) + '...';
        }
      }
      
      // Add bookmark
      const newBookmark = await addBookmark(
        currentUser.uid,
        bookId,
        currentCfi,
        note || excerpt || 'Bookmark'
      );
      
      // Update local state
      setBookmarks([...bookmarks, newBookmark]);
      setNote('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding bookmark:', err);
      setError('Failed to add bookmark');
    } finally {
      setLoading(false);
    }
  };
  
  // Remove a bookmark
  const handleRemoveBookmark = async (bookmarkId) => {
    try {
      setLoading(true);
      
      // Remove bookmark
      await removeBookmark(currentUser.uid, bookmarkId);
      
      // Update local state
      setBookmarks(bookmarks.filter(bookmark => bookmark.id !== bookmarkId));
    } catch (err) {
      console.error('Error removing bookmark:', err);
      setError('Failed to remove bookmark');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  return (
    <div className="bookmark-manager">
      <div className="bookmark-header">
        <h3>Bookmarks</h3>
        <button 
          className="btn btn-icon"
          onClick={onClose}
        >
          <FiX />
        </button>
      </div>
      
      <div className="bookmark-content">
        {loading && !showAddForm ? (
          <Loading />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : bookmarks.length === 0 && !showAddForm ? (
          <div className="empty-bookmarks">
            <p>No bookmarks yet</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Bookmark
            </button>
          </div>
        ) : (
          <div className="bookmark-list">
            {bookmarks.map(bookmark => (
              <div key={bookmark.id} className="bookmark-item">
                <div 
                  className="bookmark-details"
                  onClick={() => onSelectBookmark(bookmark.location)}
                >
                  <p className="bookmark-note">{bookmark.note}</p>
                  <span className="bookmark-date">
                    {formatDate(bookmark.createdAt)}
                  </span>
                </div>
                <button 
                  className="btn btn-icon delete-bookmark"
                  onClick={() => handleRemoveBookmark(bookmark.id)}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {showAddForm ? (
          <div className="add-bookmark-form">
            <h4>Add Bookmark</h4>
            <div className="form-group">
              <label htmlFor="bookmarkNote">Note (optional)</label>
              <textarea
                id="bookmarkNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for this bookmark"
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddBookmark}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Bookmark'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bookmark-actions">
            <button 
              className="btn btn-icon add-bookmark"
              onClick={() => setShowAddForm(true)}
            >
              <FiPlus />
              <span>Add Bookmark</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkManager;