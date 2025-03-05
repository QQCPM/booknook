// src/components/Books/BookRecommendations.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiInfo } from 'react-icons/fi';
import { getBookRecommendations } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../UI/Loading';

const defaultCover = "https://via.placeholder.com/200x300/e9e9e9/909090?text=No+Cover";

const BookRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const recommendedBooks = await getBookRecommendations(currentUser.uid, 10);
        setRecommendations(recommendedBooks);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [currentUser]);
  
  if (loading) {
    return (
      <div className="recommendations-loading">
        <Loading />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="recommendations-error">
        <p>{error}</p>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return (
      <div className="recommendations-empty">
        <p>No recommendations available yet. Try reading more books!</p>
      </div>
    );
  }
  
  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h3>Recommended for You</h3>
        <button 
          className="info-button"
          title="These recommendations are based on your reading history and other users with similar preferences"
        >
          <FiInfo />
        </button>
      </div>
      
      <div className="recommendations-grid">
        {recommendations.map(book => (
          <div 
            key={book.id} 
            className="recommendation-card"
            onClick={() => navigate(`/books/${book.id}`)}
          >
            <div className="recommendation-cover">
              <img 
                src={book.coverURL || book.thumbnail || defaultCover} 
                alt={book.title} 
              />
            </div>
            <div className="recommendation-info">
              <h4 className="recommendation-title">{book.title}</h4>
              <p className="recommendation-author">
                {book.author || (book.authors && book.authors.join(', '))}
              </p>
              {book.recommendationReason && (
                <span className="recommendation-reason">
                  {book.recommendationReason}
                </span>
              )}
            </div>
            <button className="btn btn-primary btn-sm">
              <FiBookOpen />
              <span>Read</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookRecommendations;