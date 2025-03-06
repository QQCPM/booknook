// src/components/Books/BookRecommendations.js (UPDATED)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiInfo, FiLoader, FiAward } from 'react-icons/fi';
import { getAIRecommendations } from '../../services/aiRecommendationService';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../UI/Loading';

const defaultCover = "https://via.placeholder.com/200x300/e9e9e9/909090?text=No+Cover";

const BookRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendationType, setRecommendationType] = useState('ai'); // 'ai' or 'basic'
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Get AI-powered recommendations
        let recommendedBooks = [];
        
        if (recommendationType === 'ai') {
          recommendedBooks = await getAIRecommendations(currentUser.uid, 10);
          
          // If AI recommendations failed or returned empty, fall back to basic recommendations
          if (recommendedBooks.length === 0) {
            setRecommendationType('basic');
            // This would call your existing getBookRecommendations function
            // recommendedBooks = await getBookRecommendations(currentUser.uid, 10);
          }
        } else {
          // This would call your existing getBookRecommendations function
          // recommendedBooks = await getBookRecommendations(currentUser.uid, 10);
        }
        
        setRecommendations(recommendedBooks);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [currentUser, recommendationType]);
  
  // Switch between recommendation types
  const toggleRecommendationType = () => {
    setRecommendationType(prev => prev === 'ai' ? 'basic' : 'ai');
  };
  
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
        <h3>
          {recommendationType === 'ai' ? (
            <>
              <FiAward style={{ color: '#4361ee', marginRight: '8px' }} />
              AI-Powered Recommendations
            </>
          ) : (
            'Recommended for You'
          )}
        </h3>
        <div className="recommendations-controls">
          <button 
            className="recommendations-toggle"
            onClick={toggleRecommendationType}
            title={`Switch to ${recommendationType === 'ai' ? 'basic' : 'AI-powered'} recommendations`}
          >
            {recommendationType === 'ai' ? 'Switch to Basic' : 'Switch to AI'}
          </button>
          <button 
            className="info-button"
            title={
              recommendationType === 'ai' 
                ? "AI analyzes book content, your reading habits, and preferences to suggest personalized recommendations" 
                : "These recommendations are based on your reading history and other users with similar preferences"
            }
          >
            <FiInfo />
          </button>
        </div>
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
              {book.similarityScore && book.similarityScore > 0.7 && (
                <div className="similarity-badge" title="High match based on content analysis">
                  {Math.round(book.similarityScore * 100)}% Match
                </div>
              )}
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
      
      {/* Add some CSS for the new styles */}
      <style jsx>{`
        .recommendations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .recommendations-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .recommendations-toggle {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .recommendations-toggle:hover {
          background-color: #e0e0e0;
        }
        
        .similarity-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background-color: rgba(67, 97, 238, 0.9);
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .recommendation-reason {
          display: block;
          font-size: 12px;
          color: #666;
          margin-top: 4px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default BookRecommendations;