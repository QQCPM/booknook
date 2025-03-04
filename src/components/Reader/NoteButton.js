import React from 'react';
import { FiEdit, FiFileText } from 'react-icons/fi';

/**
 * Component for the floating note button
 */
const NoteButton = ({ onClick, hasNote, nightMode, position = 'bottom' }) => {
  return (
    <>
      {/* Always show the pencil button at the bottom */}
      <button
        onClick={onClick}
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
      
      {/* Show note indicator if this page has a note */}
      {hasNote && (
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
          onClick={onClick}
        >
          <FiFileText size={18} />
        </div>
      )}
    </>
  );
};

export default NoteButton;