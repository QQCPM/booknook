import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader } from 'react-reader';
import { FiArrowLeft, FiSettings, FiSun, FiMoon, FiFileText, FiList, 
         FiEdit, FiX, FiSave } from 'react-icons/fi';
import { getBookById, updateReadProgress } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Loading from '../UI/Loading';

const EpubReader = () => {
  const { bookId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Refs
  const renditionRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  
  // Book data state
  const [book, setBook] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reader state
  const [nightMode, setNightMode] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [showToc, setShowToc] = useState(false);
  const [rendition, setRendition] = useState(null);
  const [progress, setProgress] = useState(0);

  // Notes functionality state
  const [notes, setNotes] = useState({});
  const [showCanvas, setShowCanvas] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [hasNoteAtLocation, setHasNoteAtLocation] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(2);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Fetch book data and notes
  useEffect(() => {
    async function fetchBook() {
      try {
        setLoading(true);
        const bookData = await getBookById(bookId);
        setBook(bookData);
        
        // Set initial location if available
        if (bookData.lastLocation) {
          setLocation(bookData.lastLocation);
        }
        
        // Fetch notes for this book
        if (currentUser) {
          try {
            const notesRef = doc(db, 'users', currentUser.uid, 'bookNotes', bookId);
            const notesDoc = await getDoc(notesRef);
            
            if (notesDoc.exists()) {
              setNotes(notesDoc.data().notes || {});
            }
          } catch (err) {
            console.error('Error fetching notes:', err);
            // Continue even if notes fail to load
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('Failed to load book. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchBook();
  }, [bookId, currentUser]);
  
  // Initialize canvas when showing
  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      contextRef.current = ctx;
      
      // If we have a note for this location, load it
      if (location && notes[location]) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = notes[location];
      } else {
        // Clear canvas for new note
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showCanvas, currentColor, currentWidth, location, notes]);
  
  // Check if current location has a note
  useEffect(() => {
    if (location && notes) {
      setHasNoteAtLocation(!!notes[location]);
    } else {
      setHasNoteAtLocation(false);
    }
  }, [location, notes]);
  
  // Handle location changes
  const handleLocationChanged = (epubcifi) => {
    setLocation(epubcifi);
    
    // Calculate progress
    if (rendition && rendition.book) {
      try {
        const percentage = rendition.book.locations.percentageFromCfi(epubcifi);
        const progressPercent = Math.floor(percentage * 100);
        setProgress(progressPercent);
        
        // Save progress to database
        if (currentUser) {
          updateReadProgress(bookId, currentUser.uid, progressPercent, epubcifi)
            .catch(err => console.error('Error updating progress:', err));
        }
      } catch (err) {
        console.error('Error calculating progress:', err);
      }
    }
  };
  
  // Get rendition
  const getRendition = (rendition) => {
    setRendition(rendition);
    renditionRef.current = rendition;
    
    // Apply theme
    if (nightMode) {
      rendition.themes.register('night', {
        body: { 
          background: '#333', 
          color: '#fff' 
        }
      });
      rendition.themes.select('night');
    }
    
    // Apply font size
    rendition.themes.fontSize(`${fontSize}%`);
  };
  
  // Toggle night mode
  const toggleNightMode = () => {
    setNightMode(!nightMode);
    
    if (rendition) {
      if (!nightMode) {
        rendition.themes.register('night', {
          body: { 
            background: '#333', 
            color: '#fff' 
          }
        });
        rendition.themes.select('night');
      } else {
        rendition.themes.select('default');
      }
    }
  };
  
  // Change font size
  const changeFontSize = (size) => {
    setFontSize(size);
    if (rendition) {
      rendition.themes.fontSize(`${size}%`);
    }
  };
  
  // Canvas drawing functions
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setUnsavedChanges(true);
  };
  
  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };
  
  const draw = ({ nativeEvent }) => {
    if (!isDrawing) {
      return;
    }
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };
  
  // For touch devices (iPad with Apple Pencil)
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setUnsavedChanges(true);
  };
  
  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };
  
  const handleTouchEnd = (e) => {
    e.preventDefault();
    contextRef.current.closePath();
    setIsDrawing(false);
  };
  
  // Save the current drawing
  const saveDrawing = async () => {
    if (!currentUser || !location) return;
    
    try {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/png');
      
      // Update notes state
      const updatedNotes = { ...notes, [location]: imageData };
      setNotes(updatedNotes);
      
      // Save to Firebase
      const notesRef = doc(db, 'users', currentUser.uid, 'bookNotes', bookId);
      const notesDoc = await getDoc(notesRef);
      
      if (notesDoc.exists()) {
        await updateDoc(notesRef, {
          notes: updatedNotes
        });
      } else {
        await setDoc(notesRef, {
          notes: updatedNotes
        });
      }
      
      setUnsavedChanges(false);
      setHasNoteAtLocation(true);
      
      // Close canvas after saving
      setShowCanvas(false);
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save your note. Please try again.');
    }
  };
  
  // Clear the canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUnsavedChanges(true);
  };
  
  // Delete note at current location
  const deleteCurrentNote = async () => {
    if (!currentUser || !location || !notes[location]) return;
    
    try {
      // Remove from notes state
      const updatedNotes = { ...notes };
      delete updatedNotes[location];
      setNotes(updatedNotes);
      
      // Update in Firebase
      const notesRef = doc(db, 'users', currentUser.uid, 'bookNotes', bookId);
      await updateDoc(notesRef, {
        notes: updatedNotes
      });
      
      setHasNoteAtLocation(false);
      clearCanvas();
      setShowCanvas(false);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete your note. Please try again.');
    }
  };
  
  // Navigate to specific note location
  const navigateToNote = (cfi) => {
    if (renditionRef.current) {
      renditionRef.current.display(cfi);
      setShowNotesPanel(false);
    }
  };
  
  if (loading) {
    return <Loading />;
  }
  
  if (error || !book || !book.file || !book.file.downloadURL) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Book not found'}</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/library')}
        >
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      height: '100vh', 
      backgroundColor: nightMode ? '#1a1a1a' : '#f8f8f8' 
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: nightMode ? '#333' : 'white',
        color: nightMode ? 'white' : 'black',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => navigate(`/books/${bookId}`)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
              padding: '8px',
              marginRight: '12px'
            }}
          >
            <FiArrowLeft size={20} />
          </button>
          
          <div>
            <h2 style={{ margin: 0, fontSize: '16px' }}>{book.title}</h2>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>{book.author}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setShowToc(!showToc)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            <FiList size={20} />
          </button>
          
          <button
            onClick={() => setShowNotesPanel(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              position: 'relative'
            }}
          >
            <FiFileText size={20} />
            {Object.keys(notes).length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#4361ee',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {Object.keys(notes).length}
              </span>
            )}
          </button>
          
          <button
            onClick={toggleNightMode}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            {nightMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
          
          <button
            onClick={() => changeFontSize(fontSize - 10)}
            disabled={fontSize <= 80}
            style={{
              background: 'none',
              border: 'none',
              cursor: fontSize <= 80 ? 'not-allowed' : 'pointer',
              color: 'inherit',
              opacity: fontSize <= 80 ? 0.5 : 1
            }}
          >
            A-
          </button>
          
          <button
            onClick={() => changeFontSize(fontSize + 10)}
            disabled={fontSize >= 150}
            style={{
              background: 'none',
              border: 'none',
              cursor: fontSize >= 150 ? 'not-allowed' : 'pointer',
              color: 'inherit',
              opacity: fontSize >= 150 ? 0.5 : 1
            }}
          >
            A+
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div style={{
        height: '4px',
        backgroundColor: '#eee',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          height: '100%',
          backgroundColor: '#4361ee',
          width: `${progress}%`
        }} />
      </div>
      
      {/* Reader */}
      <div style={{ height: 'calc(100vh - 65px)', position: 'relative' }}>
        <ReactReader
          url={book.file.downloadURL}
          title={book.title}
          location={location}
          locationChanged={handleLocationChanged}
          getRendition={getRendition}
          showToc={showToc}
          tocChanged={toc => console.log('Toc changed to:', toc)}
          epubOptions={{
            flow: 'paginated',
            manager: 'default'
          }}
          swipeable={true}
          styles={{
            container: {
              backgroundColor: nightMode ? '#1a1a1a' : '#f8f8f8'
            },
            tocArea: {
              backgroundColor: nightMode ? '#333' : 'white'
            },
            tocButton: {
              color: nightMode ? 'white' : 'black'
            }
          }}
        />
        
        {/* Note indicator (always show blue dot for pages with notes) */}
        {hasNoteAtLocation && (
          <div 
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: '#4361ee',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            onClick={() => setShowCanvas(true)}
          >
            <FiFileText size={18} />
          </div>
        )}
        
        {/* Write button - ALWAYS visible regardless of whether there's a note */}
        <button
          onClick={() => setShowCanvas(true)}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: nightMode ? '#555' : 'white',
            color: nightMode ? 'white' : '#333',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <FiEdit size={24} />
        </button>
      </div>
      
      {/* Status info */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '16px',
        color: nightMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        fontSize: '12px'
      }}>
        {progress}% completed
      </div>
      
      {/* Notes Panel */}
      {showNotesPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '320px',
          backgroundColor: nightMode ? '#333' : 'white',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          color: nightMode ? 'white' : 'black'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid',
            borderColor: nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0 }}>Notes ({Object.keys(notes).length})</h3>
            <button
              onClick={() => setShowNotesPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer'
              }}
            >
              <FiX size={24} />
            </button>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px'
          }}>
            {Object.keys(notes).length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: nightMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
              }}>
                <FiFileText size={40} style={{ marginBottom: '10px' }} />
                <p>No notes yet</p>
                <p>Tap the pencil icon while reading to add notes</p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {Object.entries(notes).map(([loc, imageData]) => {
                  // Try to get a percentage location for display
                  let locationDisplay = "Unknown";
                  try {
                    if (rendition && rendition.book) {
                      const percent = rendition.book.locations.percentageFromCfi(loc);
                      locationDisplay = `Page ${Math.floor(percent * 100)}%`;
                    }
                  } catch (err) {
                    // If we can't calculate it, use a generic label
                    locationDisplay = "Page marker";
                  }
                  
                  return (
                    <div 
                      key={loc}
                      style={{
                        backgroundColor: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        borderLeft: '4px solid #4361ee'
                      }}
                      onClick={() => navigateToNote(loc)}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 'bold' }}>{locationDisplay}</span>
                        <div style={{
                          backgroundColor: '#4361ee',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%'
                        }} />
                      </div>
                      
                      <div style={{
                        width: '100%',
                        height: '100px',
                        backgroundColor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={imageData} 
                          alt="Note preview" 
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Drawing canvas overlay */}
      {showCanvas && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white', // White paper as per requirement
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Canvas toolbar */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setShowCanvas(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#333'
                }}
              >
                <FiX size={24} />
              </button>
              
              <h3 style={{ margin: 0 }}>Notes for Page {progress}%</h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Color selector */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {['#000000', '#ff0000', '#0000ff', '#008000'].map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      setCurrentColor(color);
                      if (contextRef.current) {
                        contextRef.current.strokeStyle = color;
                      }
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: currentColor === color ? '2px solid #4361ee' : '1px solid #ddd',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
              
              {/* Line width selector */}
              <select
                value={currentWidth}
                onChange={(e) => {
                  const width = Number(e.target.value);
                  setCurrentWidth(width);
                  if (contextRef.current) {
                    contextRef.current.lineWidth = width;
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              >
                <option value="1">Thin</option>
                <option value="2">Medium</option>
                <option value="4">Thick</option>
                <option value="8">Very Thick</option>
              </select>
              
              {/* Clear button */}
              <button
                onClick={clearCanvas}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
              
              {hasNoteAtLocation && (
                <button
                  onClick={deleteCurrentNote}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff4757',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              )}
              
              {/* Save button */}
              <button
                onClick={saveDrawing}
                disabled={!unsavedChanges}
                style={{
                  padding: '6px 12px',
                  backgroundColor: unsavedChanges ? '#4361ee' : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: unsavedChanges ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FiSave size={16} />
                <span>Save</span>
              </button>
            </div>
          </div>
          
          {/* Canvas for drawing */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={finishDrawing}
            onMouseMove={draw}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              flex: 1,
              touchAction: 'none',  // Important for preventing scrolling while drawing
              cursor: 'crosshair'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EpubReader;