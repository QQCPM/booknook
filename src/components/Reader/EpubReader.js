import React from 'react';
import { ReactReader } from 'react-reader';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getBookById } from '../../services/bookService';
import { FiArrowLeft } from 'react-icons/fi';
import Loading from '../UI/Loading';

const EpubReader = () => {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchBook() {
      try {
        setLoading(true);
        const bookData = await getBookById(bookId);
        setBook(bookData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('Failed to load book');
        setLoading(false);
      }
    }
    
    fetchBook();
  }, [bookId]);

  if (loading) return <Loading />;
  if (error || !book || !book.file || !book.file.downloadURL) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Book not found'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/library')}>
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <button 
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          padding: '8px',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer'
        }}
        onClick={() => navigate(`/books/${bookId}`)}
      >
        <FiArrowLeft size={24} />
      </button>
      
      <ReactReader
        url={book.file.downloadURL}
        title={book.title}
        location={"epubcfi(/6/2[cover]!/6)"}
        getRendition={(rendition) => {
          rendition.themes.fontSize('120%');
        }}
      />
    </div>
  );
};

export default EpubReader;