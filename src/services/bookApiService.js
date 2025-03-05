// src/services/bookApiService.js

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
   * Fetches book information from OpenLibrary API
   * @param {Object} params - Search parameters
   * @param {string} params.title - Book title
   * @param {string} params.author - Book author
   * @param {string} params.isbn - Book ISBN
   * @returns {Promise<Object|null>} - A promise that resolves to the book data or null if not found
   */
  export const fetchBookFromOpenLibrary = async ({ title, author, isbn }) => {
    try {
      let url;
      
      if (isbn) {
        // Search by ISBN
        url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`OpenLibrary API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        const bookKey = `ISBN:${isbn}`;
        
        if (!data[bookKey]) {
          return null;
        }
        
        const bookData = data[bookKey];
        
        return {
          title: bookData.title,
          authors: bookData.authors?.map(author => author.name) || [],
          publisher: bookData.publishers?.[0]?.name || '',
          publishedDate: bookData.publish_date,
          thumbnail: bookData.cover?.medium || null,
          source: 'open_library',
          isbn: isbn,
        };
      } else {
        // Search by title and author
        let query = '';
        
        if (title && author) {
          query = `title:${encodeURIComponent(title)} author:${encodeURIComponent(author)}`;
        } else if (title) {
          query = `title:${encodeURIComponent(title)}`;
        } else if (author) {
          query = `author:${encodeURIComponent(author)}`;
        } else {
          throw new Error('No search parameters provided');
        }
        
        url = `https://openlibrary.org/search.json?q=${query}&limit=1`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`OpenLibrary API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.numFound === 0 || !data.docs || data.docs.length === 0) {
          return null;
        }
        
        const bookData = data.docs[0];
        
        return {
          title: bookData.title,
          authors: bookData.author_name || [],
          publisher: bookData.publisher?.[0] || '',
          publishedDate: bookData.first_publish_year?.toString() || '',
          thumbnail: bookData.cover_i ? 
            `https://covers.openlibrary.org/b/id/${bookData.cover_i}-M.jpg` : null,
          source: 'open_library',
          isbn: bookData.isbn?.[0] || null,
        };
      }
    } catch (error) {
      console.error('Error fetching from OpenLibrary API:', error);
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
      
      // Try Google Books first
      const googleData = await fetchBookFromGoogleBooks(searchParams);
      
      // Try OpenLibrary as fallback
      const openLibraryData = !googleData ? await fetchBookFromOpenLibrary(searchParams) : null;
      
      // Combine data, prioritizing external sources
      const enrichedData = {
        // Base data from extraction
        ...extractedMetadata,
        
        // Override with Google Books data if available
        ...(googleData || {}),
        
        // Add OpenLibrary data if Google Books failed
        ...((!googleData && openLibraryData) ? openLibraryData : {}),
        
        // Keep track of metadata sources
        metadataSources: [
          'epub_extraction',
          ...(googleData ? ['google_books'] : []),
          ...(openLibraryData ? ['open_library'] : [])
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