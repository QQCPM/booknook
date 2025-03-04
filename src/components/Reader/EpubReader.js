import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader } from 'react-reader';
import { FiArrowLeft, FiSettings, FiSun, FiMoon, FiFileText, FiList } from 'react-icons/fi';
import { getBookById, updateReadProgress } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Loading from '../UI/Loading';

// Import our custom components
import NotesPanel from './NotesPanel';
import NoteButton from './NoteButton';
import CanvasDrawing from './CanvasDrawing';

const EpubReader = () => {
  const { bookId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Refs
  const renditionRef = useRef(null);
  
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
  
  // Handle saving a drawing
  const saveDrawing = async (imageData) => {
    if (!currentUser || !location) return;
    
    try {
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
      
      setHasNoteAtLocation(true);
      setShowCanvas(false);
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save your note. Please try again.');
    }
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
      setShowCanvas(false);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete your note. Please try again.');
    }
  };
  
  // Navigate to a specific note
  const navigateToNote = (cfi) => {
    if (renditionRef.current) {
      renditionRef.current.display(cfi);
      setShowNotesPanel(false); // Close the panel after navigating
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
          
          <button
            onClick={() => {}}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            <FiSettings size={20} />
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
        
        {/* Note button component */}
        <NoteButton 
          onClick={() => setShowCanvas(true)}
          hasNote={hasNoteAtLocation}
          nightMode={nightMode}
        />
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
      
      {/* Drawing canvas component */}
      {showCanvas && (
        <CanvasDrawing 
          isOpen={showCanvas}
          onClose={() => setShowCanvas(false)}
          onSave={saveDrawing}
          onDelete={deleteCurrentNote}
          initialImage={notes[location]}
          pageInfo={`Page ${progress}%`}
          hasExistingNote={hasNoteAtLocation}
        />
      )}
      
      {/* Notes panel component */}
      <NotesPanel 
        isOpen={showNotesPanel}
        onClose={() => setShowNotesPanel(false)}
        notes={notes}
        onSelectNote={navigateToNote}
        nightMode={nightMode}
        rendition={rendition}
      />
    </div>
  );
};

export default EpubReader;