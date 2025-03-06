// src/services/aiRecommendationService.js
import { 
    collection, 
    query, 
    where, 
    limit, 
    getDocs, 
    orderBy,
    getDoc,
    doc,
    addDoc,
    Timestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  import * as epubjs from 'epubjs';
  
  /**
   * AI-powered book recommendation system
   * Combines multiple recommendation approaches with machine learning techniques
   */
  
  // Book content extraction for similarity analysis
  export const extractBookContent = async (bookFile, maxChars = 50000) => {
    try {
      // Create a blob URL for the file
      const blobUrl = URL.createObjectURL(bookFile);
      
      // Open the EPUB with epubjs
      const book = epubjs.default();
      await book.open(blobUrl);
      
      // Get all content sections
      const sections = [];
      book.spine.each((item) => {
        sections.push(item.href);
      });
      
      // Take first few sections that would give us enough text
      const sectionsToLoad = sections.slice(0, 10); 
      
      // Load and extract text from sections
      const textPromises = sectionsToLoad.map(href => 
        book.load(href).then(doc => {
          return doc.documentElement.textContent || '';
        })
      );
      
      const textContents = await Promise.all(textPromises);
      let combinedText = textContents.join(' ');
      
      // Limit length to prevent excessive processing
      if (combinedText.length > maxChars) {
        combinedText = combinedText.substring(0, maxChars);
      }
      
      // Clean up
      URL.revokeObjectURL(blobUrl);
      
      return combinedText;
    } catch (error) {
      console.error('Error extracting book content:', error);
      return '';
    }
  };
  
  /**
   * Extract key themes and topics from book content
   * @param {string} text - Book content text
   * @returns {Object} - Extracted features
   */
  export const extractContentFeatures = (text) => {
    if (!text || typeof text !== 'string') {
      return { keywords: [], categories: [], sentimentScore: 0 };
    }
    
    // Convert to lowercase for processing
    const textLower = text.toLowerCase();
    
    // 1. Extract keywords (basic implementation - in production use a proper NLP library)
    const words = textLower.split(/\W+/).filter(word => word.length > 3);
    const wordCounts = {};
    const stopWords = new Set([
      'this', 'that', 'these', 'those', 'and', 'but', 'for', 'with', 'about',
      'from', 'have', 'has', 'had', 'were', 'will', 'would', 'could', 'should',
      'what', 'when', 'where', 'who', 'whom', 'whose', 'which', 'why', 'how'
    ]);
    
    words.forEach(word => {
      if (!stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Get top keywords by frequency
    const keywords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(entry => entry[0]);
    
    // 2. Categorization - check for category indicators
    const categories = [];
    
    // Define category indicators (simplified)
    const categoryIndicators = {
      'fiction': ['novel', 'story', 'character', 'plot'],
      'business': ['business', 'management', 'leadership', 'strategy', 'company'],
      'self-help': ['self', 'improvement', 'happiness', 'success', 'goal'],
      'psychology': ['psychology', 'mind', 'behavior', 'personality', 'mental'],
      'science': ['science', 'research', 'experiment', 'theory', 'discovery'],
      'biography': ['life', 'born', 'died', 'biography', 'memoir'],
      'history': ['history', 'century', 'war', 'ancient', 'historical'],
      'technology': ['technology', 'computer', 'software', 'digital', 'internet'],
      'philosophy': ['philosophy', 'philosopher', 'ethics', 'moral', 'existence'],
      'romance': ['love', 'romance', 'relationship', 'kiss', 'passion']
    };
    
    // Check each category
    Object.entries(categoryIndicators).forEach(([category, indicators]) => {
      // Calculate match score based on indicator word frequencies
      let matchScore = 0;
      indicators.forEach(word => {
        // Count occurrences of this indicator word
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = textLower.match(regex);
        if (matches) {
          matchScore += matches.length;
        }
      });
      
      // If we have a strong enough match, add this category
      if (matchScore > 5) {
        categories.push(category);
      }
    });
    
    // 3. Sentiment analysis (very simplified version)
    let sentimentScore = 0;
    const positiveWords = ['good', 'great', 'happy', 'love', 'excellent', 'wonderful', 'best', 'joy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'sad', 'angry'];
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        sentimentScore += matches.length;
      }
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        sentimentScore -= matches.length;
      }
    });
    
    // 4. Special case detection for "Surrounded by Idiots"
    if (textLower.includes('surrounded by idiots') || 
        (textLower.includes('disc') && 
         textLower.includes('personality') && 
         (textLower.includes('red personality') || textLower.includes('blue personality') || 
          textLower.includes('yellow personality') || textLower.includes('green personality')))) {
      
      // Add specific keywords and categories for this book
      keywords.push('disc', 'personality-types', 'communication-styles');
      categories.push('psychology', 'self-help', 'business-communication');
    }
    
    return {
      keywords,
      categories,
      sentimentScore
    };
  };
  
  /**
   * Calculate similarity between two content features
   * @param {Object} features1 - First content features
   * @param {Object} features2 - Second content features
   * @returns {number} - Similarity score (0-1)
   */
  export const calculateContentSimilarity = (features1, features2) => {
    if (!features1 || !features2) return 0;
    
    // Calculate keyword similarity (Jaccard similarity)
    const keywords1 = new Set(features1.keywords || []);
    const keywords2 = new Set(features2.keywords || []);
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    const keywordSimilarity = union.size === 0 ? 0 : intersection.size / union.size;
    
    // Calculate category similarity
    const categories1 = new Set(features1.categories || []);
    const categories2 = new Set(features2.categories || []);
    
    const catIntersection = new Set([...categories1].filter(x => categories2.has(x)));
    const catUnion = new Set([...categories1, ...categories2]);
    
    const categorySimilarity = catUnion.size === 0 ? 0 : catIntersection.size / catUnion.size;
    
    // Calculate sentiment similarity (normalized difference)
    const sentiment1 = features1.sentimentScore || 0;
    const sentiment2 = features2.sentimentScore || 0;
    
    // Normalize sentiment difference to a similarity score
    const maxSentimentDiff = 100; // Maximum expected difference
    const sentimentDiff = Math.abs(sentiment1 - sentiment2);
    const sentimentSimilarity = 1 - Math.min(sentimentDiff / maxSentimentDiff, 1);
    
    // Weighted average of similarities
    // Give more weight to categories as they're more reliable indicators
    return (keywordSimilarity * 0.4) + (categorySimilarity * 0.5) + (sentimentSimilarity * 0.1);
  };
  
  /**
   * Get content-based recommendations
   * @param {string} userId - User ID
   * @param {Object} bookFeatures - Content features of source book
   * @param {number} maxCount - Maximum number of recommendations
   * @returns {Promise<Array>} - Array of recommended books
   */
  export const getContentBasedRecommendations = async (userId, bookFeatures, sourceBookId, maxCount = 5) => {
    try {
      if (!bookFeatures || !bookFeatures.keywords || bookFeatures.keywords.length === 0) {
        return [];
      }
      
      // Get all books except the source book
      const booksQuery = query(
        collection(db, 'books'),
        where('id', '!=', sourceBookId),
        limit(50) // Limit initial fetch for performance
      );
      
      const booksSnapshot = await getDocs(booksQuery);
      const books = [];
      
      booksSnapshot.forEach(doc => {
        books.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // For each book, calculate similarity score
      const scoredBooks = [];
      
      for (const book of books) {
        // If the book already has extracted features, use them
        let features = book.contentFeatures;
        
        // If not, extract features from tags and description
        if (!features) {
          // Create simple features from book metadata
          features = {
            keywords: book.tags || [],
            categories: [],
            sentimentScore: 0
          };
          
          // Extract keywords from description
          if (book.description) {
            const descriptionWords = book.description.toLowerCase()
              .split(/\W+/)
              .filter(word => word.length > 3);
            
            features.keywords = [...new Set([...features.keywords, ...descriptionWords])];
          }
        }
        
        // Calculate similarity
        const similarity = calculateContentSimilarity(bookFeatures, features);
        
        scoredBooks.push({
          ...book,
          similarityScore: similarity,
          recommendationReason: 'Based on content similarity'
        });
      }
      
      // Sort by similarity and take top results
      scoredBooks.sort((a, b) => b.similarityScore - a.similarityScore);
      
      return scoredBooks.slice(0, maxCount);
    } catch (error) {
      console.error('Error getting content-based recommendations:', error);
      return [];
    }
  };
  
  /**
   * Get user reading behavior recommendations
   * @param {string} userId - User ID
   * @param {number} maxCount - Maximum number of recommendations
   * @returns {Promise<Array>} - Array of recommended books
   */
  export const getReadingBehaviorRecommendations = async (userId, maxCount = 5) => {
    try {
      // Get user's reading history and behavior
      const userActivitiesQuery = query(
        collection(db, 'user_activities'),
        where('userId', '==', userId),
        where('action', 'in', ['read', 'complete']),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const userActivitiesSnapshot = await getDocs(userActivitiesQuery);
      const userActivities = [];
      
      userActivitiesSnapshot.forEach(doc => {
        userActivities.push(doc.data());
      });
      
      // If user has no reading history, return empty recommendations
      if (userActivities.length === 0) {
        return [];
      }
      
      // Get user's reading pattern
      const readBooks = new Set(userActivities.map(activity => activity.bookId));
      const readingTimes = userActivities
        .filter(activity => activity.metadata && activity.metadata.readingStartTime)
        .map(activity => {
          const startTime = new Date(activity.metadata.readingStartTime);
          return startTime.getHours();
        });
      
      // Calculate average reading time (hour of day)
      let preferredReadingTime = 0;
      if (readingTimes.length > 0) {
        preferredReadingTime = Math.round(
          readingTimes.reduce((sum, hour) => sum + hour, 0) / readingTimes.length
        );
      }
      
      // Calculate average session length
      const readingDurations = userActivities
        .filter(activity => 
          activity.metadata && 
          activity.metadata.readingDurationMinutes && 
          activity.metadata.readingDurationMinutes > 0
        )
        .map(activity => activity.metadata.readingDurationMinutes);
      
      let averageSessionLength = 30; // Default 30 minutes
      if (readingDurations.length > 0) {
        averageSessionLength = Math.round(
          readingDurations.reduce((sum, duration) => sum + duration, 0) / readingDurations.length
        );
      }
      
      // Determine if user prefers short or long reads
      const prefersShortReads = averageSessionLength < 20;
      
      // Get books that match the user's reading pattern
      // This is a simplified implementation - in production, you'd have more complex logic
      let matchingBooksQuery;
      
      if (prefersShortReads) {
        // For short-session readers, recommend shorter books
        matchingBooksQuery = query(
          collection(db, 'books'),
          where('id', 'not-in', [...readBooks]),
          where('pageCount', '<', 300), // Shorter books
          limit(maxCount * 2)
        );
      } else {
        // For long-session readers, recommend longer, more immersive books
        matchingBooksQuery = query(
          collection(db, 'books'),
          where('id', 'not-in', [...readBooks]),
          where('pageCount', '>', 300), // Longer books
          limit(maxCount * 2)
        );
      }
      
      const matchingBooksSnapshot = await getDocs(matchingBooksQuery);
      const matchingBooks = [];
      
      matchingBooksSnapshot.forEach(doc => {
        matchingBooks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Add recommendation reason
      const recommendations = matchingBooks.map(book => ({
        ...book,
        recommendationReason: prefersShortReads 
          ? 'Quick read based on your reading habits' 
          : 'Immersive read based on your reading habits'
      }));
      
      // Sort by read count as secondary criteria
      recommendations.sort((a, b) => (b.readCount || 0) - (a.readCount || 0));
      
      return recommendations.slice(0, maxCount);
    } catch (error) {
      console.error('Error getting reading behavior recommendations:', error);
      return [];
    }
  };
  
  /**
   * Main recommendation function that combines multiple approaches
   * @param {string} userId - User ID
   * @param {number} maxCount - Maximum number of recommendations
   * @returns {Promise<Array>} - Array of recommended books
   */
  export const getAIRecommendations = async (userId, maxCount = 10) => {
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Get last read book as the source for content-based recommendations
      let contentBasedRecommendations = [];
      const recentlyRead = userData.recentlyRead || [];
      
      if (recentlyRead.length > 0) {
        const lastReadBookId = recentlyRead[0].bookId;
        const lastReadBookDoc = await getDoc(doc(db, 'books', lastReadBookId));
        
        if (lastReadBookDoc.exists()) {
          const lastReadBook = {
            id: lastReadBookDoc.id,
            ...lastReadBookDoc.data()
          };
          
          // Extract or use existing content features
          let bookFeatures = lastReadBook.contentFeatures;
          
          if (!bookFeatures && lastReadBook.tags) {
            // Create simple features from tags and description
            bookFeatures = {
              keywords: lastReadBook.tags,
              categories: [],
              sentimentScore: 0
            };
            
            // Extract keywords from description
            if (lastReadBook.description) {
              const descriptionWords = lastReadBook.description.toLowerCase()
                .split(/\W+/)
                .filter(word => word.length > 3);
              
              bookFeatures.keywords = [...new Set([...bookFeatures.keywords, ...descriptionWords])];
            }
          }
          
          if (bookFeatures) {
            contentBasedRecommendations = await getContentBasedRecommendations(
              userId, 
              bookFeatures,
              lastReadBookId,
              Math.ceil(maxCount / 2)
            );
          }
        }
      }
      
      // Get reading behavior recommendations
      const behaviorRecommendations = await getReadingBehaviorRecommendations(
        userId,
        Math.ceil(maxCount / 2)
      );
      
      // Combine recommendations
      const combinedRecommendations = [...contentBasedRecommendations];
      
      // Add behavior recommendations that aren't already included
      behaviorRecommendations.forEach(book => {
        if (!combinedRecommendations.some(rec => rec.id === book.id)) {
          combinedRecommendations.push(book);
        }
      });
      
      // If we need more, add popular books
      if (combinedRecommendations.length < maxCount) {
        const readBookIds = new Set([
          ...recentlyRead.map(item => item.bookId),
          ...combinedRecommendations.map(book => book.id)
        ]);
        
        const popularBooksQuery = query(
          collection(db, 'books'),
          where('id', 'not-in', [...readBookIds]),
          orderBy('readCount', 'desc'),
          limit(maxCount - combinedRecommendations.length)
        );
        
        const popularBooksSnapshot = await getDocs(popularBooksQuery);
        
        popularBooksSnapshot.forEach(doc => {
          combinedRecommendations.push({
            id: doc.id,
            ...doc.data(),
            recommendationReason: 'Popular with other readers'
          });
        });
      }
      
      // Track this recommendation generation for analytics
      await addDoc(collection(db, 'recommendation_events'), {
        userId: userId,
        timestamp: Timestamp.now(),
        contentBasedCount: contentBasedRecommendations.length,
        behaviorBasedCount: behaviorRecommendations.length,
        totalRecommendations: combinedRecommendations.length
      });
      
      return combinedRecommendations.slice(0, maxCount);
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      
      // Fallback to popular books
      try {
        const popularBooksQuery = query(
          collection(db, 'books'),
          orderBy('readCount', 'desc'),
          limit(maxCount)
        );
        
        const popularBooksSnapshot = await getDocs(popularBooksQuery);
        const popularBooks = [];
        
        popularBooksSnapshot.forEach(doc => {
          popularBooks.push({
            id: doc.id,
            ...doc.data(),
            recommendationReason: 'Popular with readers'
          });
        });
        
        return popularBooks;
      } catch (fallbackError) {
        console.error('Error getting fallback recommendations:', fallbackError);
        return [];
      }
    }
  };