import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiGrid, FiList } from 'react-icons/fi';
import { useBooks } from '../../contexts/BookContext';
import BookCard from './BookCard';
import Loading from '../UI/Loading';

const BookLibrary = () => {
  const { books, loading, error } = useBooks();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filter, setFilter] = useState('all'); // 'all', 'reading', 'favorite'
  
  const navigate = useNavigate();

  const filteredBooks = books.filter(book => {
    // Search filter
    const matchesSearch = 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    let matchesFilter = false;
    if (filter === 'all') {
      matchesFilter = true;
    } else if (filter === 'reading' && book.readCount > 0) {
      matchesFilter = true;
    } else if (filter === 'favorite' && book.isFavorite) {
      matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="library-container">
      <div className="library-header">
        <h2>My Library</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
        >
          <FiPlus />
          <span>Add Book</span>
        </button>
      </div>
      
      <div className="library-controls">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="view-controls">
          <button
            className={`view-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`view-btn ${filter === 'reading' ? 'active' : ''}`}
            onClick={() => setFilter('reading')}
          >
            Reading
          </button>
          <button
            className={`view-btn ${filter === 'favorite' ? 'active' : ''}`}
            onClick={() => setFilter('favorite')}
          >
            Favorites
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <FiGrid />
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <FiList />
          </button>
        </div>
      </div>
      
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-library">
          <div className="empty-message">
            {searchTerm ? (
              <>
                <h3>No books found</h3>
                <p>Try a different search term</p>
              </>
            ) : (
              <>
                <h3>Your library is empty</h3>
                <p>Start by adding your first book</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/upload')}
                >
                  <FiPlus />
                  <span>Add Book</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={`book-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {filteredBooks.map(book => (
            <BookCard
              key={book.id}
              book={book}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookLibrary;