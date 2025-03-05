// src/services/epubMetadataService.js
import * as epubjs from 'epubjs';

/**
 * Extracts metadata from an EPUB file
 * @param {File} file - The EPUB file to extract metadata from
 * @returns {Promise<Object>} - A promise that resolves to the extracted metadata
 */
export const extractEpubMetadata = async (file) => {
  try {
    // Create a blob URL for the file
    const blobUrl = URL.createObjectURL(file);
    
    // Open the EPUB file using epubjs
    const book = epubjs.default();
    await book.open(blobUrl);
    
    // Extract basic metadata
    const metadata = await book.loaded.metadata;
    
    // Extract ISBN (often in identifiers)
    let isbn = null;
    if (metadata.identifier) {
      // Try to find ISBN in the identifier
      let identifiers = Array.isArray(metadata.identifier) 
        ? metadata.identifier 
        : [metadata.identifier];
      
      // Look for ISBN in identifiers
      for (let id of identifiers) {
        if (typeof id === 'string') {
          const isbnMatch = id.match(/(?:ISBN[:-]?1[03]?)?(?=[-0-9X]{13}$|[-0-9X]{17}$|[-0-9X]{10}$)[-0-9X]+/i);
          if (isbnMatch) {
            isbn = isbnMatch[0].replace(/[^0-9X]/g, '');
            break;
          }
        }
      }
    }
    
    // Extract language
    const language = metadata.language || null;
    
    // Extract publisher
    const publisher = metadata.publisher || null;
    
    // Extract publication date
    const pubDate = metadata.pubdate || metadata.date || null;
    
    // Clean up
    URL.revokeObjectURL(blobUrl);
    
    // Return formatted metadata
    return {
      title: metadata.title || null,
      creator: metadata.creator || null,
      author: metadata.creator || null,  // Alias for creator
      description: metadata.description || null,
      isbn: isbn,
      language: language,
      publisher: publisher,
      publicationDate: pubDate,
      rights: metadata.rights || null,
      subjects: metadata.subject ? (Array.isArray(metadata.subject) ? metadata.subject : [metadata.subject]) : [],
      rawMetadata: metadata
    };
  } catch (error) {
    console.error('Error extracting EPUB metadata:', error);
    throw new Error('Failed to extract metadata from EPUB file');
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