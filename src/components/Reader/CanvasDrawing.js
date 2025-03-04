import React, { useRef, useEffect, useState } from 'react';
import { FiX, FiSave } from 'react-icons/fi';

/**
 * Component for drawing notes with Apple Pencil
 */
const CanvasDrawing = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  initialImage,
  pageInfo,
  hasExistingNote
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(2);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Initialize canvas when component mounts
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      // Set canvas dimensions to match window
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Set up drawing context
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      contextRef.current = ctx;
      
      // If we have existing content, load it
      if (initialImage) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = initialImage;
      } else {
        // Clear canvas for new note
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen, initialImage, currentColor, currentWidth]);
  
  // Stop if not visible
  if (!isOpen) return null;
  
  // Drawing functions
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
  
  // Save current drawing
  const saveDrawing = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    onSave(imageData);
    setUnsavedChanges(false);
  };
  
  // Clear the canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUnsavedChanges(true);
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white', // White paper for drawing
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Toolbar */}
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
            onClick={onClose}
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
          
          <h3 style={{ margin: 0 }}>Notes for {pageInfo}</h3>
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
          
          {/* Delete button (only show if note exists already) */}
          {hasExistingNote && (
            <button
              onClick={onDelete}
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
  );
};

export default CanvasDrawing;