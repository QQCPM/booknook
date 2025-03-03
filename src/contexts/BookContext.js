import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserBooks } from '../services/bookService';

const BookContext = createContext();

export function useBooks() {
  return useContext(BookContext);
}

export function BookProvider({ children }) {
  const { currentUser } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch books whenever the user changes
  useEffect(() => {
    async function fetchBooks() {
      if (currentUser) {
        try {
          setLoading(true);
          const userBooks = await getUserBooks(currentUser.uid);
          setBooks(userBooks);
          setError('');
        } catch (err) {
          console.error('Error fetching books:', err);
          setError('Error fetching your book library. Please try again later.');
        } finally {
          setLoading(false);
        }
      } else {
        setBooks([]);
        setLoading(false);
      }
    }

    fetchBooks();
  }, [currentUser]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Add a book to the local state
  const addBookToState = (book) => {
    setBooks(prevBooks => [book, ...prevBooks]);
  };

  // Update a book in the local state
  const updateBookInState = (updatedBook) => {
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === updatedBook.id ? { ...book, ...updatedBook } : book
      )
    );
  };

  // Remove a book from the local state
  const removeBookFromState = (bookId) => {
    setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
  };

  // Refresh the book list
  const refreshBooks = async () => {
    if (currentUser) {
      try {
        setLoading(true);
        const userBooks = await getUserBooks(currentUser.uid);
        setBooks(userBooks);
        setError('');
      } catch (err) {
        console.error('Error refreshing books:', err);
        setError('Error refreshing your book library. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
  };

  const value = {
    books,
    loading,
    error,
    setError,
    addBookToState,
    updateBookInState,
    removeBookFromState,
    refreshBooks
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
}