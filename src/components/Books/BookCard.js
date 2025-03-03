import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiClock, FiBook } from 'react-icons/fi';

// Create a placeholder image URL instead of importing
const defaultCover = "https://via.placeholder.com/200x300/e9e9e9/909090?text=No+Cover";

const BookCard = ({ book, viewMode }) => {
  const navigate = useNavigate();
  
  // In a real app, you'd have functionality to toggle favorite status
  const isFavorite = book.isFavorite || false;
  
  // Format date
  const createdAt = book.createdAt ? new Date(book.createdAt.toDate()) : new Date();
  const formattedDate = createdAt.toLocaleDateString();
  
  // Handle missing cover image
  const coverURL = book.coverURL || defaultCover;
  
  // Calculate reading progress
  const progress = book.progress || 0;
  
  const handleCardClick = () => {
    navigate(`/books/${book.id}`);
  };
  
  if (viewMode === 'list') {
    return (
      <div className="book-card list" onClick={handleCardClick}>
        <div className="book-cover">
          <img src={coverURL} alt={book.title} />
        </div>
        <div className="book-info">
          <h3 className="book-title">{book.title}</h3>
          <p className="book-author">by {book.author}</p>
          
          <div className="book-meta">
            {progress > 0 && (
              <div className="book-progress">
                <FiClock />
                <span>{Math.round(progress)}% read</span>
              </div>
            )}
            
            <div className="book-read-count">
              <FiBook />
              <span>{book.readCount || 0} reads</span>
            </div>
          </div>
        </div>
        <div className="book-actions">
          {isFavorite && (
            <span className="favorite-badge">
              <FiHeart className="filled" />
            </span>
          )}
          <span className="book-date">{formattedDate}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="book-card" onClick={handleCardClick}>
      <div className="book-cover">
        <img src={coverURL} alt={book.title} />
        {isFavorite && (
          <span className="favorite-badge">
            <FiHeart className="filled" />
          </span>
        )}
        {progress > 0 && (
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">by {book.author}</p>
      </div>
    </div>
  );
};

export default BookCard;