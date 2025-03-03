import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Upload EPUB file to Firebase Storage
export const uploadEpub = async (file, userId, onProgress) => {
  try {
    // Create a unique file name
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `books/${userId}/${fileName}`;
    
    // Create storage reference
    const storageRef = ref(storage, filePath);
    
    // Upload file with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle errors
          reject(error);
        },
        async () => {
          // Get download URL and resolve promise when complete
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            fileName,
            filePath,
            downloadURL,
            size: file.size,
            type: file.type
          });
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

// Add book metadata to Firestore
export const addBook = async (bookData, userId) => {
  try {
    const bookRef = await addDoc(collection(db, 'books'), {
      ...bookData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return { id: bookRef.id, ...bookData };
  } catch (error) {
    throw error;
  }
};

// Complete book upload process (file + metadata)
export const uploadBook = async (file, metadata, userId, onProgress) => {
  try {
    // Upload EPUB file
    const fileData = await uploadEpub(file, userId, onProgress);
    
    // Add book to Firestore
    const bookData = await addBook({
      title: metadata.title,
      author: metadata.author,
      description: metadata.description,
      coverURL: metadata.coverURL || '',
      tags: metadata.tags || [],
      file: fileData,
      readCount: 0,
      averageRating: 0,
      ratings: [],
      private: metadata.private || false
    }, userId);
    
    return bookData;
  } catch (error) {
    throw error;
  }
};

// Get user's books
export const getUserBooks = async (userId) => {
  try {
    const q = query(
      collection(db, 'books'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const books = [];
    
    querySnapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    
    return books;
  } catch (error) {
    throw error;
  }
};

// Get book details
export const getBookById = async (bookId) => {
  try {
    const bookDoc = await getDoc(doc(db, 'books', bookId));
    
    if (bookDoc.exists()) {
      return { id: bookDoc.id, ...bookDoc.data() };
    } else {
      throw new Error('Book not found');
    }
  } catch (error) {
    throw error;
  }
};

// Update book details
export const updateBook = async (bookId, bookData) => {
  try {
    const bookRef = doc(db, 'books', bookId);
    
    await updateDoc(bookRef, {
      ...bookData,
      updatedAt: new Date()
    });
    
    return { id: bookId, ...bookData };
  } catch (error) {
    throw error;
  }
};

// Delete book
export const deleteBook = async (bookId) => {
  try {
    // Get book data to retrieve file path
    const bookData = await getBookById(bookId);
    
    // Delete file from Storage
    if (bookData.file && bookData.file.filePath) {
      const storageRef = ref(storage, bookData.file.filePath);
      await deleteObject(storageRef);
    }
    
    // Delete book document from Firestore
    await deleteDoc(doc(db, 'books', bookId));
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Track book read progress
export const updateReadProgress = async (bookId, userId, progress) => {
  try {
    // Update user's last read info
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    
    if (userData.exists()) {
      const lastRead = userData.data().lastRead || {};
      
      await updateDoc(userRef, {
        lastRead: {
          ...lastRead,
          [bookId]: {
            progress,
            timestamp: new Date()
          }
        }
      });
    }
    
    // Increment book read count if it's a new read
    const bookRef = doc(db, 'books', bookId);
    const bookData = await getDoc(bookRef);
    
    if (bookData.exists()) {
      await updateDoc(bookRef, {
        readCount: bookData.data().readCount + 1
      });
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Add bookmark
export const addBookmark = async (userId, bookId, location, note) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    
    if (userData.exists()) {
      const bookmarks = userData.data().bookmarks || [];
      const newBookmark = {
        id: uuidv4(),
        bookId,
        location,
        note,
        createdAt: new Date()
      };
      
      await updateDoc(userRef, {
        bookmarks: [...bookmarks, newBookmark]
      });
      
      return newBookmark;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw error;
  }
};

// Get all bookmarks for a book
export const getBookBookmarks = async (userId, bookId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const bookmarks = userDoc.data().bookmarks || [];
      return bookmarks.filter(bookmark => bookmark.bookId === bookId)
                     .sort((a, b) => a.location - b.location);
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

// Remove bookmark
export const removeBookmark = async (userId, bookmarkId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    
    if (userData.exists()) {
      const bookmarks = userData.data().bookmarks || [];
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
      
      await updateDoc(userRef, {
        bookmarks: updatedBookmarks
      });
      
      return true;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw error;
  }
};

// Search for books
export const searchBooks = async (searchTerm, userId) => {
  try {
    // Get all user's books first (Firebase doesn't support text search directly)
    const userBooks = await getUserBooks(userId);
    
    // Filter books based on search term
    const filteredBooks = userBooks.filter(book => {
      const title = book.title.toLowerCase();
      const author = book.author.toLowerCase();
      const description = book.description ? book.description.toLowerCase() : '';
      const term = searchTerm.toLowerCase();
      
      return title.includes(term) || author.includes(term) || description.includes(term);
    });
    
    return filteredBooks;
  } catch (error) {
    throw error;
  }
};

// Get popular books (based on read count)
export const getPopularBooks = async (maxResults = 10) => {
  try {
    const q = query(
      collection(db, 'books'),
      where('private', '==', false),
      orderBy('readCount', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const books = [];
    
    querySnapshot.forEach((doc) => {
      if (books.length < maxResults) {
        books.push({ id: doc.id, ...doc.data() });
      }
    });
    
    return books;
  } catch (error) {
    throw error;
  }
};