import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';
import { uploadBook } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import { useBooks } from '../../contexts/BookContext';
import Alert from '../UI/Alert';

const BookUpload = () => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  
  const { currentUser } = useAuth();
  const { addBookToState, setError: setContextError } = useBooks();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      if (selectedFile.type !== 'application/epub+zip') {
        setError('Only EPUB files are supported');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const handleCoverImageChange = (e) => {
    const selectedImage = e.target.files[0];
    
    if (selectedImage) {
      if (!selectedImage.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      setCoverImage(selectedImage);
      setCoverImageUrl(URL.createObjectURL(selectedImage));
      setError('');
    }
  };

  const handleTagsChange = (e) => {
    setTags(e.target.value);
  };

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
      
      // Upload cover image if provided
      let coverURL = '';
      if (coverImage) {
        // In a real app, we would upload the cover image to Firebase Storage
        // and get a download URL. For simplicity, we'll skip this step.
        coverURL = coverImageUrl;
      }
      
      // Upload book
      const bookData = await uploadBook(
        file,
        {
          title,
          author,
          description,
          coverURL,
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
      
      <form onSubmit={handleUpload}>
        <div className="upload-grid">
          <div className="upload-form">
            <div className="form-group">
              <label htmlFor="title">Book Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter book title"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="author">Author</label>
              <input
                type="text"
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Enter author name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter book description"
                rows={4}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={handleTagsChange}
                placeholder="Enter tags separated by commas"
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
          
          <div className="upload-visuals">
            <div className="cover-upload">
              <label>Book Cover</label>
              <div 
                className="cover-preview"
                onClick={() => coverInputRef.current.click()}
              >
                {coverImageUrl ? (
                  <>
                    <img src={coverImageUrl} alt="Book cover preview" />
                    <button 
                      type="button" 
                      className="remove-cover"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverImage(null);
                        setCoverImageUrl('');
                      }}
                    >
                      <FiX />
                    </button>
                  </>
                ) : (
                  <div className="cover-placeholder">
                    <FiImage size={48} />
                    <p>Click to add cover</p>
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
            
            <div className="file-upload">
              <label>EPUB File</label>
              <div 
                className={`file-drop-zone ${file ? 'has-file' : ''}`}
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
                    <p>Click to select EPUB file</p>
                    <small>Only .epub files are supported</small>
                  </div>
                ) : (
                  <div className="file-info">
                    <p className="file-name">{fileName}</p>
                    <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button 
                      type="button" 
                      className="remove-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileName('');
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
              </div>
            </div>
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