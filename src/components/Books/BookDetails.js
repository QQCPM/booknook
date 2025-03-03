import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeart, FiBookOpen, FiShare2, FiTrash2, FiDownload } from 'react-icons/fi';
import { getBookById, deleteBook } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BookContext';
import Modal from '../UI/Modal';
import Loading from '../UI/Loading';

// Create a placeholder image URL instead of importing
const defaultCover = "https://via.placeholder.com/300x450/e9e9e9/909090?text=No+Cover";

const BookDetails = () => {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const { currentUser } = useAuth();
  const { removeBookFromState } = useBooks();
  const navigate = useNavigate();
  
  // Fetch book details
  useEffect(() => {
    async function fetchBook() {
      try {
        const bookData = await getBookById(bookId);
        setBook(bookData);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('Failed to load book details. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBook();
  }, [bookId]);
  
  // Handle book deletion
  const handleDeleteBook = async () => {
    try {
      setDeleteLoading(true);
      await deleteBook(bookId);
      removeBookFromState(bookId);
      navigate('/library');
    } catch (err) {
      console.error('Error deleting book:', err);
      setError('Failed to delete book. Please try again later.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return <Loading />;
  }
  
  if (error || !book) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Book not found'}</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/library')}
        >
          Return to Library
        </button>
      </div>
    );
  }
  
  // Check if user owns the book
  const isOwner = currentUser && book.userId === currentUser.uid;
  
  return (
    <div className="book-details-container">
      <div className="details-header">
        <button 
          className="back-button"
          onClick={() => navigate('/library')}
        >
          <FiArrowLeft />
          <span>Back to Library</span>
        </button>
      </div>
      
      <div className="book-details">
        <div className="book-cover-large">
          <img 
            src={book.coverURL || defaultCover} 
            alt={book.title} 
          />
        </div>
        
        <div className="book-info-large">
          <h1 className="book-title-large">{book.title}</h1>
          <h2 className="book-author-large">by {book.author}</h2>
          
          {book.description && (
            <div className="book-description">
              <h3>Description</h3>
              <p>{book.description}</p>
            </div>
          )}
          
          <div className="book-metadata">
            <div className="metadata-item">
              <span className="label">Added On</span>
              <span className="value">{formatDate(book.createdAt)}</span>
            </div>
            
            <div className="metadata-item">
              <span className="label">File Size</span>
              <span className="value">{((book.file?.size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            
            <div className="metadata-item">
              <span className="label">Read Count</span>
              <span className="value">{book.readCount || 0}</span>
            </div>
            
            {book.tags && book.tags.length > 0 && (
              <div className="book-tags">
                {book.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="book-actions-large">
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/reader/${bookId}`)}
            >
              <FiBookOpen />
              <span>Read Now</span>
            </button>
            
            <button className="btn btn-icon">
              <FiHeart />
            </button>
            
            <button className="btn btn-icon">
              <FiShare2 />
            </button>
            
            <button 
              className="btn btn-icon"
              onClick={() => window.open(book.file.downloadURL, '_blank')}
            >
              <FiDownload />
            </button>
            
            {isOwner && (
              <button 
                className="btn btn-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <FiTrash2 />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Book"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>{book.title}</strong>?</p>
          <p>This action cannot be undone.</p>
          
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-danger"
              onClick={handleDeleteBook}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookDetails;