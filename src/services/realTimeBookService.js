// src/services/realTimeBookService.js
import axios from 'axios';
import { db } from './firebase';
import { collection, query, where, orderBy, limit, addDoc, Timestamp } from 'firebase/firestore';

// Cache for new releases to reduce API calls
let newReleasesCache = {
  timestamp: null,
  data: []
};

/**
 * Fetch trending and new release books from multiple sources
 */
export const fetchNewReleases = async (maxResults = 20) => {
  // Use cache if less than 24 hours old
  const now = new Date();
  if (newReleasesCache.timestamp && 
      (now - newReleasesCache.timestamp) < 24 * 60 * 60 * 1000 && 
      newReleasesCache.data.length > 0) {
    return newReleasesCache.data;
  }
  
  try {
    // Get books from multiple sources in parallel
    const [nytBooks, googleBooks] = await Promise.all([
      fetchNYTBestsellers(),
      fetchRecentGoogleBooks()
    ]);
    
    // Combine and deduplicate books
    const combinedBooks = deduplicateBooks([...nytBooks, ...googleBooks]);
    
    // Update cache
    newReleasesCache = {
      timestamp: now,
      data: combinedBooks
    };
    
    // Store in Firestore for analysis
    await storeNewReleasesInFirestore(combinedBooks);
    
    return combinedBooks;
  } catch (error) {
    console.error('Error fetching new releases:', error);
    
    // Return cache even if expired in case of error
    if (newReleasesCache.data.length > 0) {
      return newReleasesCache.data;
    }
    
    return [];
  }
};

/**
 * Fetch books from NYT Bestseller Lists
 */
async function fetchNYTBestsellers() {
  try {
    const response = await axios.get(
      'https://api.nytimes.com/svc/books/v3/lists/current/combined-print-and-e-book-fiction.json',
      {
        params: {
          'api-key': process.env.REACT_APP_NYT_API_KEY
        }
      }
    );
    
    // Transform to our book format
    return response.data.results.books.map(book => ({
      title: book.title,
      author: book.author,
      description: book.description,
      coverURL: book.book_image,
      publisher: book.publisher,
      isbn: book.primary_isbn13,
      publicationDate: null, // NYT doesn't provide this
      source: 'nyt_bestseller',
      rankInfo: {
        rank: book.rank,
        weeksOnList: book.weeks_on_list,
      },
      isNewRelease: book.weeks_on_list <= 4 // Consider it new if on list less than a month
    }));
  } catch (error) {
    console.error('Error fetching NYT bestsellers:', error);
    return [];
  }
}

/**
 * Fetch recent books from Google Books API
 */
async function fetchRecentGoogleBooks() {
  try {
    // Calculate date 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const dateString = threeMonthsAgo.toISOString().split('T')[0];
    
    const response = await axios.get(
      'https://www.googleapis.com/books/v1/volumes',
      {
        params: {
          q: `publishedDate:>${dateString}`,
          orderBy: 'newest',
          maxResults: 40
        }
      }
    );
    
    // Transform to our book format
    return response.data.items.map(item => {
      const volumeInfo = item.volumeInfo;
      return {
        title: volumeInfo.title,
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown',
        description: volumeInfo.description || '',
        coverURL: volumeInfo.imageLinks?.thumbnail || null,
        publisher: volumeInfo.publisher,
        isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || null,
        publicationDate: volumeInfo.publishedDate,
        source: 'google_books',
        isNewRelease: true
      };
    });
  } catch (error) {
    console.error('Error fetching Google books:', error);
    return [];
  }
}

/**
 * Remove duplicate books from multiple sources
 */
function deduplicateBooks(books) {
  const uniqueBooks = new Map();
  
  books.forEach(book => {
    const key = `${book.title.toLowerCase()}-${book.author.toLowerCase()}`;
    
    if (!uniqueBooks.has(key) || book.source === 'nyt_bestseller') {
      uniqueBooks.set(key, book);
    }
  });
  
  return Array.from(uniqueBooks.values());
}

/**
 * Store new releases in Firestore for analysis and faster retrieval
 */
async function storeNewReleasesInFirestore(books) {
  try {
    // Store in a new_releases collection
    const batch = db.batch();
    const newReleasesRef = collection(db, 'new_releases');
    
    books.forEach(book => {
      const docRef = doc(newReleasesRef);
      batch.set(docRef, {
        ...book,
        addedAt: Timestamp.now()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error storing new releases:', error);
  }
}