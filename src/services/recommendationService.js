// src/services/recommendationService.js
import { 
    collection, 
    query, 
    where, 
    limit, 
    getDocs, 
    orderBy,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    arrayUnion,
    increment,
    Timestamp
  } from 'firebase/firestore';
  import { db } from './firebase';
  
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
        timestamp: Timestamp.now(),
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
          timestamp: Timestamp.now()
        });
        
        // We'll recalculate average rating in a separate function
        // or using a Cloud Function trigger
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
            { bookId, timestamp: Timestamp.now() },
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
  
  /**
   * Gets book recommendations based on collaborative filtering
   * @param {string} userId - User ID
   * @param {number} maxResults - Maximum number of recommendations to return
   * @returns {Promise<Array>} - A promise that resolves to an array of recommended books
   */
  export const getCollaborativeRecommendations = async (userId, maxResults = 5) => {
    try {
      // 1. Get user's reading history
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const recentlyRead = userData.recentlyRead || [];
      
      if (recentlyRead.length === 0) {
        return []; // Not enough data for collaborative filtering
      }
      
      // 2. Get books the user has read
      const userBookIds = recentlyRead.map(item => item.bookId);
      
      // 3. Find users who read the same books
      const similarUsersBooks = [];
      
      // For each book the user has read, find other users who read it
      for (const bookId of userBookIds) {
        const activitiesQuery = query(
          collection(db, 'user_activities'),
          where('bookId', '==', bookId),
          where('userId', '!=', userId),
          where('action', 'in', ['read', 'complete']),
          limit(50)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        // Get user IDs who read this book
        const similarUserIds = new Set();
        activitiesSnapshot.forEach(doc => {
          similarUserIds.add(doc.data().userId);
        });
        
        // For each similar user, get books they've read that our user hasn't
        for (const similarUserId of similarUserIds) {
          const userActivitiesQuery = query(
            collection(db, 'user_activities'),
            where('userId', '==', similarUserId),
            where('action', 'in', ['read', 'complete']),
            limit(20)
          );
          
          const userActivitiesSnapshot = await getDocs(userActivitiesQuery);
          
          userActivitiesSnapshot.forEach(doc => {
            const data = doc.data();
            if (!userBookIds.includes(data.bookId)) {
              similarUsersBooks.push(data.bookId);
            }
          });
        }
      }
      
      // 4. Count frequency of each book to find most common recommendations
      const bookFrequency = {};
      similarUsersBooks.forEach(bookId => {
        bookFrequency[bookId] = (bookFrequency[bookId] || 0) + 1;
      });
      
      // Sort by frequency
      const recommendedBookIds = Object.entries(bookFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxResults)
        .map(entry => entry[0]);
      
      // 5. Fetch book details for recommended books
      const recommendedBooks = [];
      
      for (const bookId of recommendedBookIds) {
        const bookDoc = await getDoc(doc(db, 'books', bookId));
        if (bookDoc.exists()) {
          recommendedBooks.push({
            id: bookDoc.id,
            ...bookDoc.data()
          });
        }
      }
      
      return recommendedBooks;
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      return [];
    }
  };
  
  /**
   * Gets book recommendations based on content similarity
   * @param {string} userId - User ID
   * @param {number} maxResults - Maximum number of recommendations to return
   * @returns {Promise<Array>} - A promise that resolves to an array of recommended books
   */
  export const getContentBasedRecommendations = async (userId, maxResults = 5) => {
    try {
      // 1. Get user's reading history
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const recentlyRead = userData.recentlyRead || [];
      
      if (recentlyRead.length === 0) {
        return []; // Not enough data
      }
      
      // 2. Get details of recently read books
      const recentBooks = [];
      for (const item of recentlyRead.slice(0, 5)) { // Consider last 5 books at most
        const bookDoc = await getDoc(doc(db, 'books', item.bookId));
        if (bookDoc.exists()) {
          recentBooks.push({
            id: bookDoc.id,
            ...bookDoc.data()
          });
        }
      }
      
      // 3. Extract key attributes for matching
      const authors = new Set();
      const categories = new Set();
      const publishers = new Set();
      
      recentBooks.forEach(book => {
        // Add author
        if (book.author) {
          authors.add(book.author);
        }
        if (book.authors && Array.isArray(book.authors)) {
          book.authors.forEach(author => authors.add(author));
        }
        
        // Add categories
        if (book.categories && Array.isArray(book.categories)) {
          book.categories.forEach(category => categories.add(category));
        }
        
        // Add publisher
        if (book.publisher) {
          publishers.add(book.publisher);
        }
      });
      
      // 4. Query for similar books
      const recommendedBooks = [];
      const userBookIds = recentlyRead.map(item => item.bookId);
      
      // Try to match by author first
      if (authors.size > 0) {
        for (const author of authors) {
          const authorQuery = query(
            collection(db, 'books'),
            where('author', '==', author),
            // Ensure we don't recommend books the user has already read
            where('id', 'not-in', userBookIds),
            limit(5)
          );
          
          const authorSnapshot = await getDocs(authorQuery);
          authorSnapshot.forEach(doc => {
            recommendedBooks.push({
              id: doc.id,
              ...doc.data(),
              recommendationReason: `By the same author: ${author}`
            });
          });
        }
      }
      
      // If we need more recommendations, try matching by category
      if (recommendedBooks.length < maxResults && categories.size > 0) {
        // Convert Set to Array for Firebase query
        const categoryArray = Array.from(categories);
        const categoryQuery = query(
          collection(db, 'books'),
          where('categories', 'array-contains-any', categoryArray.slice(0, 10)),
          // Ensure we don't recommend books the user has already read
          where('id', 'not-in', userBookIds),
          limit(maxResults - recommendedBooks.length)
        );
        
        const categorySnapshot = await getDocs(categoryQuery);
        categorySnapshot.forEach(doc => {
          // Check if we already added this book
          if (!recommendedBooks.some(book => book.id === doc.id)) {
            const bookData = doc.data();
            const matchedCategories = bookData.categories?.filter(cat => 
              categories.has(cat)
            ) || [];
            
            recommendedBooks.push({
              id: doc.id,
              ...bookData,
              recommendationReason: `Similar category: ${matchedCategories.join(', ')}`
            });
          }
        });
      }
      
      // 5. If we still need more, get popular books
      if (recommendedBooks.length < maxResults) {
        const popularQuery = query(
          collection(db, 'books'),
          where('id', 'not-in', [...userBookIds, ...recommendedBooks.map(book => book.id)]),
          orderBy('readCount', 'desc'),
          limit(maxResults - recommendedBooks.length)
        );
        
        const popularSnapshot = await getDocs(popularQuery);
        popularSnapshot.forEach(doc => {
          recommendedBooks.push({
            id: doc.id,
            ...doc.data(),
            recommendationReason: 'Popular among readers'
          });
        });
      }
      
      return recommendedBooks.slice(0, maxResults);
    } catch (error) {
      console.error('Error getting content-based recommendations:', error);
      return [];
    }
  };
  
  /**
   * Gets combined book recommendations for a user
   * @param {string} userId - User ID
   * @param {number} maxResults - Maximum number of recommendations to return
   * @returns {Promise<Array>} - A promise that resolves to an array of recommended books
   */
  export const getRecommendations = async (userId, maxResults = 10) => {
    try {
      // Get both types of recommendations
      const [collaborativeRecs, contentRecs] = await Promise.all([
        getCollaborativeRecommendations(userId, Math.ceil(maxResults / 2)),
        getContentBasedRecommendations(userId, Math.ceil(maxResults / 2))
      ]);
      
      // Combine recommendations, avoiding duplicates
      const recommendations = [...collaborativeRecs];
      
      // Add content-based recommendations that aren't already included
      for (const book of contentRecs) {
        if (!recommendations.some(rec => rec.id === book.id)) {
          recommendations.push(book);
        }
        
        if (recommendations.length >= maxResults) {
          break;
        }
      }
      
      // If we still need more, get popular books
      if (recommendations.length < maxResults) {
        const userBookIds = recommendations.map(book => book.id);
        
        const popularQuery = query(
          collection(db, 'books'),
          where('id', 'not-in', userBookIds),
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
      return [];
    }
  };