import React from 'react';
import { FiX, FiFileText } from 'react-icons/fi';

/**
 * Component to display a panel of all notes for a book
 */
const NotesPanel = ({ 
  isOpen, 
  onClose, 
  notes, 
  onSelectNote, 
  nightMode,
  rendition 
}) => {
  if (!isOpen) return null;

  return (
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
          onClick={onClose}
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
                  onClick={() => onSelectNote(loc)}
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
  );
};

export default NotesPanel;