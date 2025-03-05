// src/services/bookService.js
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
  orderBy,
  limit,
  arrayUnion,
  increment,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';
import * as epubjs from 'epubjs';

// EPUB Metadata Extraction Functions

/**
 * Extracts metadata from an EPUB file
 * @param {File} file - The EPUB file to extract metadata from
 * @returns {Promise<Object>} - A promise that resolves to the extracted metadata
 */
export const extractEpubMetadata = async (file) => {
  try {
    // Create a blob URL for the file
    const blobUrl = URL.createObjectURL(file);
    
    // Try to use epubjs to extract metadata
    try {
      const book = epubjs.default();
      await book.open(blobUrl);
      
      // Extract basic metadata
      const metadata = await book.loaded.metadata;
      
      // Extract ISBN, language, etc (rest of your existing code)
      // ...
      
      // Clean up
      URL.revokeObjectURL(blobUrl);
      return {
        // your metadata return object
      };
    } catch (epubError) {
      console.warn("EPUB parsing failed, using filename fallback:", epubError);
      
      // FALLBACK: Extract info from filename if possible
      const filename = file.name;
      let title = '';
      let author = '';
      
      // Try to extract title/author from filename patterns
      // Common pattern: "Author - Title.epub" or "Title - Author.epub"
      const parts = filename.replace('.epub', '').split(' - ');
      if (parts.length >= 2) {
        // Assume first part is author and second is title (most common)
        author = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
        
        // If title contains parentheses with a year, clean it up
        const yearMatch = title.match(/\((\d{4})\)/);
        if (yearMatch) {
          const year = yearMatch[1];
          // Clean up title
          title = title.replace(/\s*\(\d{4}\).*$/, '').trim();
        }
      } else {
        // Just use filename as title
        title = filename.replace('.epub', '').trim();
      }
      
      // Return basic metadata from filename
      return {
        title: title,
        author: author,
        description: null,
        isbn: null,
        language: null,
        publisher: null,
        publicationDate: null,
        rights: null,
        subjects: [],
        extractionMethod: 'filename'
      };
    }
  } catch (error) {
    console.error('Error extracting EPUB metadata:', error);
    // Return empty metadata so upload can continue
    return {
      title: file.name.replace('.epub', ''),
      author: '',
      description: null,
      isbn: null,
      language: null,
      publisher: null,
      publicationDate: null,
      rights: null,
      subjects: [],
      extractionMethod: 'error_fallback'
    };
  }
};

/**
 * Extracts the cover image from an EPUB file if available
 * @param {File} file - The EPUB file
 * @returns {Promise<string|null>} - A promise that resolves to the cover image URL or null
 */
export const extractEpubCover = async (file) => {
  try {
    // Create a blob URL for the file
    const blobUrl = URL.createObjectURL(file);
    
    // Open the EPUB file using epubjs
    const book = epubjs.default();
    await book.open(blobUrl);
    
    // Try to get the cover
    const coverUrl = await book.loaded.cover;
    
    if (coverUrl) {
      // Get the full cover URL
      const coverHref = book.archive.url(coverUrl);
      
      // Convert cover image to data URL
      const response = await fetch(coverHref);
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
    
    // Clean up
    URL.revokeObjectURL(blobUrl);
    
    return null;
  } catch (error) {
    console.error('Error extracting EPUB cover:', error);
    return null;
  }
};

// Book API Service Functions

/**
 * Fetches book information from Google Books API
 * @param {Object} params - Search parameters
 * @param {string} params.title - Book title
 * @param {string} params.author - Book author
 * @param {string} params.isbn - Book ISBN
 * @returns {Promise<Object|null>} - A promise that resolves to the book data or null if not found
 */
export const fetchBookFromGoogleBooks = async ({ title, author, isbn }) => {
  try {
    // Build search query
    let query = '';
    
    if (isbn) {
      // ISBN is the most precise search
      query = `isbn:${isbn}`;
    } else if (title && author) {
      // Use both title and author
      query = `intitle:"${title}" inauthor:"${author}"`;
    } else if (title) {
      // Fall back to title only
      query = `intitle:"${title}"`;
    } else if (author) {
      // Fall back to author only
      query = `inauthor:"${author}"`;
    } else {
      // No search parameters provided
      throw new Error('No search parameters provided');
    }
    
    // Fetch from Google Books API
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
    );
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.totalItems === 0 || !data.items || data.items.length === 0) {
      console.log('No books found in Google Books API');
      return null;
    }
    
    // Extract relevant information from the first result
    const bookData = data.items[0].volumeInfo;
    
    return {
      googleBooksId: data.items[0].id,
      title: bookData.title,
      authors: bookData.authors || [],
      description: bookData.description || '',
      categories: bookData.categories || [],
      averageRating: bookData.averageRating,
      ratingsCount: bookData.ratingsCount,
      publisher: bookData.publisher,
      publishedDate: bookData.publishedDate,
      pageCount: bookData.pageCount,
      thumbnail: bookData.imageLinks?.thumbnail || null,
      language: bookData.language,
      isbn: bookData.industryIdentifiers?.find(id => 
        id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )?.identifier || isbn,
      previewLink: bookData.previewLink,
      infoLink: bookData.infoLink,
      source: 'google_books'
    };
  } catch (error) {
    console.error('Error fetching from Google Books API:', error);
    return null;
  }
};

/**
 * Enriches book metadata by combining data from multiple sources
 * @param {Object} extractedMetadata - Metadata extracted from EPUB
 * @returns {Promise<Object>} - A promise that resolves to the enriched book data
 */
export const enrichBookMetadata = async (extractedMetadata) => {
  try {
    // Use extracted metadata for the search
    const searchParams = {
      title: extractedMetadata.title,
      author: extractedMetadata.author || extractedMetadata.creator,
      isbn: extractedMetadata.isbn
    };
    
    // Try Google Books
    const googleData = await fetchBookFromGoogleBooks(searchParams);
    
    // Combine data, prioritizing extracted metadata but adding Google Books data
    const enrichedData = {
      // Base data from extraction
      ...extractedMetadata,
      
      // Add data from Google Books if available
      ...(googleData || {}),
      
      // Keep track of metadata sources
      metadataSources: [
        'epub_extraction',
        ...(googleData ? ['google_books'] : [])
      ]
    };
    
    return enrichedData;
  } catch (error) {
    console.error('Error enriching book metadata:', error);
    // Return original metadata if enrichment fails
    return {
      ...extractedMetadata,
      metadataSources: ['epub_extraction']
    };
  }
};

// Activity Tracking for Recommendations

/**
 * Tracks user reading activity for recommendation purposes
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID 
 * @param {string} action - Action type (view, read, complete, etc.)
 * @param {Object} metadata - Additional metadata about the action
 */
export const trackUserActivity = async (userId, bookId, action, metadata = {}) => {
  try {
    // Add activity to user_activities collection
    await addDoc(collection(db, 'user_activities'), {
      userId,
      bookId,
      action, // e.g., 'view', 'read', 'complete', 'bookmark', 'rate'
      timestamp: new Date(),
      metadata // e.g., progress, rating, timeSpentSeconds, etc.
    });
    
    // Update book-specific activity counters
    const bookRef = doc(db, 'books', bookId);
    const updateData = {};
    
    // Increment appropriate counter based on action
    if (action === 'view') {
      updateData.viewCount = increment(1);
    } else if (action === 'read') {
      updateData.readCount = increment(1);
    } else if (action === 'complete') {
      updateData.completionCount = increment(1);
    } else if (action === 'rate' && metadata.rating) {
      // Update ratings array
      updateData.ratings = arrayUnion({
        userId,
        rating: metadata.rating,
        timestamp: new Date()
      });
    }
    
    // Only update if we have counters to increment
    if (Object.keys(updateData).length > 0) {
      await updateDoc(bookRef, updateData);
    }
    
    // Update user reading history
    const userRef = doc(db, 'users', userId);
    const userData = await getDoc(userRef);
    
    if (userData.exists()) {
      // Add book to recently read list if not already there
      const recentlyRead = userData.data().recentlyRead || [];
      const bookExists = recentlyRead.some(item => item.bookId === bookId);
      
      if (!bookExists && (action === 'read' || action === 'complete')) {
        // Add to beginning, limit to 20 items
        const updatedRecentlyRead = [
          { bookId, timestamp: new Date() },
          ...recentlyRead.slice(0, 19)
        ];
        
        await updateDoc(userRef, {
          recentlyRead: updatedRecentlyRead
        });
      }
    }
  } catch (error) {
    console.error('Error tracking user activity:', error);
    throw error;
  }
};

// Core Book Service Functions

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


export const uploadBook = async (file, metadata, userId, onProgress) => {
  try {
    // Initialize metadata and cover variables
    let extractedMetadata = null;
    let coverURL = '';
    let bookTitle = '';
    let bookAuthor = '';
    let bookDescription = '';
    
    // STEP 1: Try to extract metadata first
    try {
      onProgress(10);
      
      // Extract basic info from filename if all else fails
      const filename = file.name;
      const filenameInfo = extractInfoFromFilename(filename);
      bookTitle = filenameInfo.title;
      bookAuthor = filenameInfo.author;
      
      // Try to extract metadata from EPUB
      try {
        extractedMetadata = await extractEpubMetadata(file);
        if (extractedMetadata) {
          bookTitle = extractedMetadata.title || bookTitle;
          bookAuthor = extractedMetadata.author || bookAuthor;
          bookDescription = extractedMetadata.description || '';
          console.log("Extracted metadata successfully:", extractedMetadata);
        }
      } catch (metadataError) {
        console.warn("Metadata extraction failed:", metadataError);
        // Continue with file name-based info
      }
      
      onProgress(40);
      
      // Try to extract cover
      try {
        coverURL = await extractEpubCover(file);
      } catch (coverErr) {
        console.warn("Cover extraction failed:", coverErr);
      }
      
      onProgress(50);
      
      // Use provided metadata if available, fallback to extracted
      bookTitle = metadata.title || bookTitle || filename.replace('.epub', '');
      bookAuthor = metadata.author || bookAuthor || 'Unknown Author';
      bookDescription = metadata.description || bookDescription || '';
      
    } catch (extractionError) {
      console.error("Extraction phase failed:", extractionError);
      // Continue with upload anyway, using basic metadata
    }
    
    // STEP 2: Upload the file
    onProgress(60);
    console.log("Starting file upload to Firebase storage...");
    
    try {
      // Upload the EPUB file to Firebase Storage
      const fileData = await uploadEpub(file, userId, progress => {
        onProgress(60 + progress * 0.2); // Map progress to 60-80%
      });
      
      onProgress(80);
      console.log("File uploaded successfully:", fileData);
      
      // STEP 3: Create the Firestore document
      console.log("Creating Firestore record with metadata:", {
        title: bookTitle,
        author: bookAuthor
      });
      
      // Create directly with addDoc to avoid any issues with the addBook function
      const bookCollection = collection(db, 'books');
      const bookRef = await addDoc(bookCollection, {
        title: bookTitle,
        author: bookAuthor,
        description: bookDescription,
        coverURL: metadata.coverURL || coverURL || '',
        tags: metadata.tags || [],
        file: fileData,
        userId: userId,
        readCount: 0,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        ratings: [],
        private: metadata.private || false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create the full book object
      const bookData = {
        id: bookRef.id,
        title: bookTitle,
        author: bookAuthor,
        description: bookDescription,
        coverURL: metadata.coverURL || coverURL || '',
        tags: metadata.tags || [],
        file: fileData,
        userId: userId,
        readCount: 0,
        completionCount: 0,
        averageRating: 0,
        ratings: [],
        private: metadata.private || false
      };
      
      onProgress(95);
      console.log("Book record created successfully with ID:", bookRef.id);
      
      // Track activity
      try {
        await trackUserActivity(userId, bookRef.id, 'upload', {
          fileSize: file.size,
          fileType: file.type
        });
      } catch (err) {
        console.warn("Activity tracking failed (non-critical):", err);
      }
      
      onProgress(100);
      return bookData;
      
    } catch (uploadError) {
      console.error("Upload phase failed:", uploadError);
      throw new Error(`Failed to upload book: ${uploadError.message}`);
    }
  } catch (error) {
    console.error("Book upload failed:", error);
    throw error;
  }
};
function extractInfoFromFilename(filename) {
  filename = filename.replace('.epub', '');
  
  // Try to extract author and title from filename patterns
  let title = filename;
  let author = 'Unknown Author';
  
  // Common pattern: "Author - Title" or "Title - Author"
  const parts = filename.split(' - ');
  if (parts.length >= 2) {
    // Assume first part is author and second is title (most common)
    author = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
    
    // Clean up title if it has a year or publisher
    title = title.replace(/\s*\(\d{4}\).*$/, '').trim();
  }
  
  return { title, author };
}

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
export const updateReadProgress = async (bookId, userId, progress, cfiLocation) => {
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
            cfiLocation,
            timestamp: new Date()
          }
        }
      });
    }
    
    // Track activity for recommendations
    try {
      await trackUserActivity(userId, bookId, 'read', {
        progress,
        timestamp: new Date()
      });
      
      // If progress is 100%, also track completion
      if (progress >= 100) {
        await trackUserActivity(userId, bookId, 'complete', {
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('Error tracking read activity:', err);
      // Continue even if tracking fails
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
      
      // Track bookmark activity
      try {
        await trackUserActivity(userId, bookId, 'bookmark', {
          location,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Error tracking bookmark activity:', err);
      }
      
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
      orderBy('readCount', 'desc'),
      limit(maxResults)
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

// Recommendation Functions

/**
 * Gets similar books based on author or genre
 * @param {string} bookId - Book ID to find similar books for
 * @param {number} maxResults - Maximum number of recommendations to return
 * @returns {Promise<Array>} - A promise that resolves to an array of similar books
 */
export const getSimilarBooks = async (bookId, maxResults = 5) => {
  try {
    // Get the source book
    const sourceBook = await getBookById(bookId);
    
    if (!sourceBook) {
      throw new Error('Book not found');
    }
    
    // Get books by the same author
    let similarBooks = [];
    
    if (sourceBook.author) {
      const authorQuery = query(
        collection(db, 'books'),
        where('author', '==', sourceBook.author),
        where('id', '!=', bookId),
        limit(maxResults)
      );
      
      const authorSnapshot = await getDocs(authorQuery);
      authorSnapshot.forEach(doc => {
        similarBooks.push({
          id: doc.id,
          ...doc.data(),
          similarityReason: `By the same author: ${sourceBook.author}`
        });
      });
    }
    
    // If we need more books, check tags/categories
    if (similarBooks.length < maxResults && sourceBook.tags && sourceBook.tags.length > 0) {
      // Get at most 10 tags to avoid query limitations
      const tagsToQuery = sourceBook.tags.slice(0, 10);
      
      const tagsQuery = query(
        collection(db, 'books'),
        where('tags', 'array-contains-any', tagsToQuery),
        where('id', '!=', bookId),
        limit(maxResults - similarBooks.length)
      );
      
      const tagsSnapshot = await getDocs(tagsQuery);
      tagsSnapshot.forEach(doc => {
        // Avoid duplicates
        if (!similarBooks.some(book => book.id === doc.id)) {
          similarBooks.push({
            id: doc.id,
            ...doc.data(),
            similarityReason: 'Similar genre or category'
          });
        }
      });
    }
    
    return similarBooks;
  } catch (error) {
    console.error('Error getting similar books:', error);
    return [];
  }
};

/**
 * Gets personalized book recommendations for a user
 * @param {string} userId - User ID
 * @param {number} maxResults - Maximum number of recommendations to return
 * @returns {Promise<Array>} - A promise that resolves to an array of recommended books
 */
export const getBookRecommendations = async (userId, maxResults = 10) => {
  try {
    // 1. Get user's reading history
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const lastRead = userData.lastRead || {};
    const recentlyRead = Object.keys(lastRead).slice(0, 3); // Consider last 3 books
    
    if (recentlyRead.length === 0) {
      // If no reading history, return popular books
      return getPopularBooks(maxResults);
    }
    
    // 2. Get similar books for each recently read book
    const recommendationPromises = recentlyRead.map(bookId => 
      getSimilarBooks(bookId, Math.ceil(maxResults / recentlyRead.length))
    );
    
    const similarBooksResults = await Promise.all(recommendationPromises);
    
    // 3. Flatten and deduplicate recommendations
    const recommendationMap = new Map();
    
    similarBooksResults.forEach(books => {
      books.forEach(book => {
        if (!recommendationMap.has(book.id) && !recentlyRead.includes(book.id)) {
          recommendationMap.set(book.id, book);
        }
      });
    });
    
    const recommendations = Array.from(recommendationMap.values());
    
    // 4. If we don't have enough recommendations, add popular books
    if (recommendations.length < maxResults) {
      const existingIds = [...recommendations.map(book => book.id), ...recentlyRead];
      
      const popularQuery = query(
        collection(db, 'books'),
        where('private', '==', false),
        where('id', 'not-in', existingIds),
        orderBy('readCount', 'desc'),
        limit(maxResults - recommendations.length)
      );
      
      const popularSnapshot = await getDocs(popularQuery);
      popularSnapshot.forEach(doc => {
        recommendations.push({
          id: doc.id,
          ...doc.data(),
          recommendationReason: 'Popular among readers'
        });
      });
    }
    
    return recommendations.slice(0, maxResults);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    // Fallback to popular books
    return getPopularBooks(maxResults);
  }
};