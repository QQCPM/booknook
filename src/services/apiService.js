// src/services/apiService.js
import axios from 'axios';

// Cache storage
const apiCache = {
  googleBooks: new Map(),
  nytBooks: new Map()
};

// Cache validity (in milliseconds)
const CACHE_VALIDITY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Make API requests with caching and error handling
 */
export const apiRequest = async (endpoint, params = {}, cacheKey = null, cacheDuration = CACHE_VALIDITY) => {
  try {
    // Check cache if a cacheKey is provided
    if (cacheKey) {
      const cacheItem = apiCache[endpoint]?.get(cacheKey);
      
      if (cacheItem && (Date.now() - cacheItem.timestamp < cacheDuration)) {
        console.log(`Using cached data for ${endpoint}:${cacheKey}`);
        return cacheItem.data;
      }
    }
    
    // Make the actual API request
    const response = await axios.get(endpoint, { params });
    
    // Cache the response if needed
    if (cacheKey) {
      if (!apiCache[endpoint]) {
        apiCache[endpoint] = new Map();
      }
      
      apiCache[endpoint].set(cacheKey, {
        timestamp: Date.now(),
        data: response.data
      });
    }
    
    return response.data;
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Make Google Books API request with caching
 */
export const googleBooksRequest = async (query, params = {}) => {
  const endpoint = 'https://www.googleapis.com/books/v1/volumes';
  const apiKey = process.env.REACT_APP_GOOGLE_BOOKS_API_KEY;
  
  // Prepare complete parameters
  const completeParams = {
    ...params,
    q: query
  };
  
  if (apiKey) {
    completeParams.key = apiKey;
  }
  
  // Generate cache key
  const cacheKey = `${query}_${JSON.stringify(params)}`;
  
  return apiRequest(endpoint, completeParams, cacheKey);
};

/**
 * Make NYT Books API request with caching
 */
export const nytBooksRequest = async (list = 'combined-print-and-e-book-fiction') => {
  const endpoint = `https://api.nytimes.com/svc/books/v3/lists/current/${list}.json`;
  const apiKey = process.env.REACT_APP_NYT_API_KEY;
  
  if (!apiKey) {
    throw new Error('NYT API key is required but not provided in environment variables');
  }
  
  const params = {
    'api-key': apiKey
  };
  
  return apiRequest(endpoint, params, list);
};