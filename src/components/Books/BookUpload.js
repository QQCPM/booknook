// src/components/Books/BookUpload.js (UPDATED)
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiImage, FiInfo, FiCheck, FiEdit, FiCpu, FiLoader } from 'react-icons/fi';
import { uploadBook } from '../../services/bookService';
import { extractEnhancedMetadata } from '../../services/aiMetadataService';
import { extractContentFeatures } from '../../services/aiRecommendationService';
import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BookContext';
import Alert from '../UI/Alert';
import Loading from '../UI/Loading';

const BookUpload = () => {
  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Metadata state
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [metadataExtracted, setMetadataExtracted] = useState(false);
  const [metadataSource, setMetadataSource] = useState(null);
  const [extractionMethods, setExtractionMethods] = useState([]);
  const [contentFeatures, setContentFeatures] = useState(null);
  
  // AI analysis state
  const [isAiAnalysisEnabled, setIsAiAnalysisEnabled] = useState(true);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);
  const [detectedContentType, setDetectedContentType] = useState(null);
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  
  const { currentUser } = useAuth();
  const { addBookToState, setError: setContextError } = useBooks();
  const navigate = useNavigate();

  // Handle file selection
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      if (selectedFile.type !== 'application/epub+zip') {
        setError('Only EPUB files are supported');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
      
      // Reset state
      setMetadataExtracted(false);
      setMetadataSource(null);
      setExtractionMethods([]);
      setAiAnalysisComplete(false);
      setDetectedContentType(null);
      
      // Extract metadata using our enhanced AI service
      try {
        setIsMetadataLoading(true);
        setSuccess('');
        
        const metadata = await extractEnhancedMetadata(selectedFile);
        
        if (metadata) {
          // Update form fields with extracted metadata
          setTitle(metadata.title || selectedFile.name.replace('.epub', ''));
          setAuthor(metadata.author || 'Unknown Author');
          setDescription(metadata.description || '');
          
          // Set cover image if available
          if (metadata.coverBlob) {
            const reader = new FileReader();
            reader.onloadend = () => setCoverImageUrl(reader.result);
            reader.readAsDataURL(metadata.coverBlob);
          } else if (metadata.existingCoverURL) {
            setCoverImageUrl(metadata.existingCoverURL);
          }
          
          // Set tags if available
          if (metadata.tags && metadata.tags.length > 0) {
            setTags(metadata.tags.join(', '));
          }
          
          // Track extraction methods for analytics
          setExtractionMethods(metadata.extractionMethods || ['basic']);
          
          // Determine metadata source for UI display
          if (metadata.extractionMethods) {
            if (metadata.extractionMethods.includes('ai_content_analysis')) {
              setMetadataSource('AI content analysis');
            } else if (metadata.extractionMethods.includes('epub_metadata')) {
              setMetadataSource('EPUB metadata');
            } else if (metadata.extractionMethods.includes('google_books_isbn') || 
                      metadata.extractionMethods.includes('google_books_title')) {
              setMetadataSource('Google Books');
            } else if (metadata.extractionMethods.includes('internal_db_match')) {
              setMetadataSource('BookNook database');
            } else {
              setMetadataSource('automated extraction');
            }
          } else {
            setMetadataSource('basic extraction');
          }
          
          setMetadataExtracted(true);
          setSuccess('Metadata extracted successfully');
          
          // If AI analysis is enabled, also analyze content
          if (isAiAnalysisEnabled) {
            await analyzeBookContent(selectedFile);
          }
        }
      } catch (err) {
        console.error('Metadata extraction error:', err);
        setError('Error extracting metadata. Basic information will be used.');
      } finally {
        setIsMetadataLoading(false);
      }
    }
  };
  
  // Analyze book content for better recommendations
  const analyzeBookContent = async (bookFile) => {
    try {
      setIsAiAnalyzing(true);
      
      // Read a portion of the book for analysis
      const blobUrl = URL.createObjectURL(bookFile);
      const book = window.ePub(blobUrl);
      
      // Get first few sections
      const sections = [];
      let i = 0;
      book.spine.each((item) => {
        if (i < 5) sections.push(item.href);
        i++;
      });
      
      // Extract text from sections
      const textPromises = sections.map(href => 
        book.load(href).then(doc => {
          return doc.documentElement.textContent || '';
        })
      );
      
      const textContents = await Promise.all(textPromises);
      const sampleText = textContents.join(' ').substring(0, 50000); // First 50K chars
      
      // Extract content features
      const features = extractContentFeatures(sampleText);
      setContentFeatures(features);
      
      // Identify content type based on categories
      if (features.categories.length > 0) {
        setDetectedContentType(features.categories[0]);
      }
      
      // Clean up
      URL.revokeObjectURL(blobUrl);
      
      setAiAnalysisComplete(true);
      
      // Update tags based on AI analysis if we don't have tags yet
      if ((!tags || tags.length === 0) && features.keywords.length > 0) {
        // Add top 5 keywords as tags
        const topKeywords = features.keywords.slice(0, 5);
        setTags(topKeywords.join(', '));
      }
      
    } catch (err) {
      console.error('Content analysis error:', err);
      // Non-critical, so don't show error to user
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Handle cover image selection
  const handleCoverImageChange = (e) => {
    const selectedImage = e.target.files[0];
    
    if (selectedImage) {
      if (!selectedImage.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      setCoverImageUrl(URL.createObjectURL(selectedImage));
      setError('');
    }
  };

  // Handle form submission
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a book title');
      return;
    }
    
    if (!author.trim()) {
      setError('Please enter an author name');
      return;
    }
    
    if (!file) {
      setError('Please select an EPUB file to upload');
      return;
    }
    
    try {
      setLoading(true);
      
      // Process tags
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Prepare metadata object with AI-extracted information
      const metadataObj = {
        title,
        author,
        description,
        coverURL: coverImageUrl,
        tags: tagArray,
        private: isPrivate,
        extractionMethods: extractionMethods,
        contentFeatures: contentFeatures,
        aiAnalysisComplete: aiAnalysisComplete
      };
      
      // Add detected content type if available
      if (detectedContentType) {
        metadataObj.detectedContentType = detectedContentType;
      }
      
      // Upload book
      const bookData = await uploadBook(
        file,
        metadataObj,
        currentUser.uid,
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // Add book to state
      addBookToState(bookData);
      
      // Navigate to book details
      navigate(`/books/${bookData.id}`);
    } catch (err) {
      console.error('Book upload error:', err);
      setError('Failed to upload book. Please try again.');
      setContextError('Book upload failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>Upload a New Book</h2>
        <p>Upload your EPUB files to read them online</p>
      </div>
      
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      
      <form onSubmit={handleUpload}>
        <div className="upload-grid">
          <div className="upload-form">
            {/* File upload first - so metadata can be extracted */}
            <div className="file-upload mb-4">
              <h3>EPUB File</h3>
              <div 
                className={`file-drop-zone ${file ? 'has-file' : ''} ${isMetadataLoading || isAiAnalyzing ? 'loading' : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".epub"
                  hidden
                />
                
                {!file ? (
                  <div className="file-placeholder">
                    <FiUpload size={48} />
                    <p className="mt-2">Click to select EPUB file</p>
                    <small className="text-muted">Metadata will be automatically extracted</small>
                  </div>
                ) : isMetadataLoading ? (
                  <div className="file-loading">
                    <Loading />
                    <p className="mt-2">Extracting metadata...</p>
                  </div>
                ) : isAiAnalyzing ? (
                  <div className="file-loading">
                    <div className="ai-analyzing">
                      <FiCpu size={24} color="#4361ee" />
                      <div className="loader-pulse"></div>
                    </div>
                    <p className="mt-2">AI analyzing content...</p>
                  </div>
                ) : (
                  <div className="file-info">
                    <p className="file-name">{fileName}</p>
                    <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    {metadataExtracted && (
                      <div className="metadata-badge">
                        <FiCheck className="text-success" />
                        <span>Metadata extracted from {metadataSource}</span>
                      </div>
                    )}
                    
                    {aiAnalysisComplete && (
                      <div className="ai-analysis-badge">
                        <FiCpu className="text-primary" />
                        <span>AI content analysis complete</span>
                        {detectedContentType && (
                          <span className="content-type-badge">
                            Detected: {detectedContentType}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <button 
                      type="button" 
                      className="remove-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileName('');
                        setMetadataExtracted(false);
                        setAiAnalysisComplete(false);
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
              </div>
              
              {/* AI analysis toggle */}
              {file && !isMetadataLoading && (
                <div className="ai-toggle">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isAiAnalysisEnabled}
                      onChange={(e) => setIsAiAnalysisEnabled(e.target.checked)}
                    />
                    <span>Enable AI content analysis for better recommendations</span>
                    
                    <button 
                      type="button"
                      className="info-button-small"
                      title="AI analyzes your book's content to provide better recommendations and automatically detect genres"
                    >
                      <FiInfo size={14} />
                    </button>
                  </label>
                </div>
              )}
            </div>
          
            <div className="book-metadata">
              <div className="form-group">
                <label htmlFor="title">
                  Book Title
                  {metadataExtracted && <span className="metadata-label"><FiInfo size={16} /> Auto-filled</span>}
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  required
                  className={metadataExtracted ? "metadata-field" : ""}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="author">
                  Author
                  {metadataExtracted && <span className="metadata-label"><FiInfo size={16} /> Auto-filled</span>}
                </label>
                <input
                  type="text"
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  required
                  className={metadataExtracted ? "metadata-field" : ""}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">
                  Description
                  {metadataExtracted && description && <span className="metadata-label"><FiInfo size={16} /> Auto-filled</span>}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter book description"
                  rows={4}
                  className={metadataExtracted && description ? "metadata-field" : ""}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="tags">
                  Tags
                  {aiAnalysisComplete && contentFeatures && contentFeatures.keywords.length > 0 && 
                    <span className="metadata-label"><FiCpu size={16} /> AI-suggested</span>}
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className={aiAnalysisComplete && contentFeatures ? "ai-field" : ""}
                />
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <span>Private (Only visible to you)</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="upload-visuals">
            <div className="cover-upload">
              <h3>Book Cover</h3>
              <div 
                className="cover-preview"
                onClick={() => coverInputRef.current.click()}
              >
                {coverImageUrl ? (
                  <>
                    <img src={coverImageUrl} alt="Book cover preview" />
                    {metadataExtracted && (
                      <div className="cover-source-badge">
                        <FiCheck className="text-success" />
                        <span>Extracted from {metadataSource}</span>
                      </div>
                    )}
                    <button 
                      type="button" 
                      className="remove-cover"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverImageUrl('');
                      }}
                    >
                      <FiX />
                    </button>
                    <button
                      type="button"
                      className="edit-cover"
                      onClick={(e) => {
                        e.stopPropagation();
                        coverInputRef.current.click();
                      }}
                    >
                      <FiEdit />
                    </button>
                  </>
                ) : (
                  <div className="cover-placeholder">
                    <FiImage size={48} />
                    <p className="mt-2">Click to add cover</p>
                    <small className="text-muted">Or let it be extracted from EPUB</small>
                  </div>
                )}
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverImageChange}
                  accept="image/*"
                  hidden
                />
              </div>
            </div>
            
            {metadataExtracted && (
              <div className="metadata-info-box">
                <h4><FiInfo /> About Metadata</h4>
                <p>The information above was automatically extracted from your EPUB file using AI and metadata analysis.</p>
                <p>You can edit any field if needed.</p>
                {extractionMethods.length > 0 && (
                  <div className="extraction-methods">
                    <p>Extraction methods used:</p>
                    <ul>
                      {extractionMethods.map((method, index) => (
                        <li key={index}>{method.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {aiAnalysisComplete && contentFeatures && (
              <div className="ai-analysis-box">
                <h4><FiCpu /> AI Content Analysis</h4>
                <p>Our AI analyzed your book's content to provide better recommendations.</p>
                
                {contentFeatures.categories.length > 0 && (
                  <div className="content-categories">
                    <p>Detected categories:</p>
                    <div className="category-tags">
                      {contentFeatures.categories.map((category, index) => (
                        <span className="category-tag" key={index}>{category}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {contentFeatures.keywords.length > 0 && (
                  <div className="content-keywords">
                    <p>Top keywords:</p>
                    <div className="keyword-cloud">
                      {contentFeatures.keywords.slice(0, 10).map((keyword, index) => (
                        <span 
                          className="keyword-tag" 
                          key={index}
                          style={{ 
                            fontSize: `${Math.max(12, 14 - index * 0.5)}px`,
                            opacity: Math.max(0.6, 1 - index * 0.05)
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {loading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p>{uploadProgress.toFixed(0)}% uploaded</p>
          </div>
        )}
        
        <div className="upload-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/library')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !file}
          >
            {loading ? 'Uploading...' : 'Upload Book'}
          </button>
        </div>
      </form>
      
      {/* Additional styles for new components */}
      <style jsx>{`
        .ai-field {
          border-left: 3px solid #4361ee !important;
          background-color: rgba(67, 97, 238, 0.05);
        }
        
        .ai-toggle {
          margin-top: 10px;
          display: flex;
          align-items: center;
        }
        
        .info-button-small {
          background: none;
          border: none;
          color: #4361ee;
          padding: 0;
          margin-left: 4px;
          cursor: pointer;
        }
        
        .ai-analyzing {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .loader-pulse {
          width: 40px;
          height: 4px;
          background-color: #4361ee;
          border-radius: 2px;
          margin-top: 8px;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        
        .ai-analysis-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 14px;
          color: #4361ee;
        }
        
        .content-type-badge {
          background-color: #4361ee;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          margin-left: 6px;
        }
        
        .ai-analysis-box {
          margin-top: 20px;
          padding: 16px;
          background-color: rgba(67, 97, 238, 0.05);
          border-radius: 8px;
          border-left: 3px solid #4361ee;
        }
        
        .ai-analysis-box h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: #4361ee;
        }
        
        .content-categories,
        .content-keywords {
          margin-top: 12px;
        }
        
        .category-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        
        .category-tag {
          background-color: #4361ee;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .keyword-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
        }
        
        .keyword-tag {
          background-color: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .extraction-methods {
          margin-top: 12px;
        }
        
        .extraction-methods ul {
          margin-top: 4px;
          padding-left: 20px;
          font-size: 12px;
        }
        
        .extraction-methods li {
          margin-bottom: 2px;
        }
      `}</style>
  </div>
  );
};

export default BookUpload;