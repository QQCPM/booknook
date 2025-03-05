import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiImage, FiInfo, FiCheck, FiEdit } from 'react-icons/fi';
import { uploadBook } from '../../services/bookService';
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
    
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/epub+zip') {
      setError('Only EPUB files are supported');
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError('');
    
    // Extract metadata
    try {
      setIsMetadataLoading(true);
      setSuccess('');
      
      // Upload with a special flag to only extract metadata
      const response = await uploadBook(
        selectedFile,
        { metadataOnly: true },
        currentUser.uid,
        () => {}
      );
      
      // If metadata extraction was successful
      if (response && response.extractedMetadata) {
        const extractedData = response.extractedMetadata;
        
        // Set form fields from metadata
        if (extractedData.title) setTitle(extractedData.title);
        if (extractedData.author || extractedData.creator) {
          setAuthor(extractedData.author || extractedData.creator);
        }
        if (extractedData.description) setDescription(extractedData.description);
        if (extractedData.subjects && extractedData.subjects.length > 0) {
          setTags(extractedData.subjects.join(', '));
        }
        
        // Set cover if available
        if (response.coverURL) {
          setCoverImageUrl(response.coverURL);
        }
        
        setMetadataExtracted(true);
        setMetadataSource('EPUB File');
        setSuccess('Metadata successfully extracted from EPUB file');
      }
    } catch (err) {
      console.error('Metadata extraction error:', err);
      // Still set title from filename at minimum
      const filename = selectedFile.name.replace('.epub', '');
      setTitle(filename);
      setMetadataExtracted(false);
      setMetadataSource('Filename only');
      setError('Could not fully extract metadata from this EPUB. Basic information has been added from the filename.');
    } finally {
      setIsMetadataLoading(false);
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
      
      // Upload book
      const bookData = await uploadBook(
        file,
        {
          title,
          author,
          description,
          coverURL: coverImageUrl,
          tags: tagArray,
          private: isPrivate
        },
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
                className={`file-drop-zone ${file ? 'has-file' : ''} ${isMetadataLoading ? 'loading' : ''}`}
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
                    
                    <button 
                      type="button" 
                      className="remove-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileName('');
                        setMetadataExtracted(false);
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
              </div>
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
                  {metadataExtracted && tags && <span className="metadata-label"><FiInfo size={16} /> Auto-filled</span>}
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className={metadataExtracted && tags ? "metadata-field" : ""}
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
                <p>The information above was automatically extracted from your EPUB file. You can edit any field if needed.</p>
                <p>Additional data like ISBN, language, and publisher will be stored with your book to improve recommendations.</p>
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
    </div>
  );
};

export default BookUpload;