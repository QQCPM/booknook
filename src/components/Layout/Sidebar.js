import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import Loading from '../UI/Loading';

const Sidebar = ({ book, onClose, onSelectChapter }) => {
  const [toc, setToc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Load table of contents
  useEffect(() => {
    async function loadToc() {
      try {
        // Get navigation items from the book
        const nav = await book.navigation.get();
        
        // If no TOC, try to use spine items
        if (!nav.toc || nav.toc.length === 0) {
          const items = [];
          book.spine.each((item) => {
            items.push({
              href: item.href,
              label: item.label || item.href
            });
          });
          setToc(items);
        } else {
          setToc(nav.toc);
        }
      } catch (err) {
        console.error('Error loading table of contents:', err);
        setError('Failed to load table of contents');
      } finally {
        setLoading(false);
      }
    }
    
    loadToc();
  }, [book]);
  
  // Flatten nested TOC for easier display
  const flattenToc = (items, level = 0) => {
    let flat = [];
    items.forEach(item => {
      flat.push({ ...item, level });
      if (item.subitems && item.subitems.length > 0) {
        flat = flat.concat(flattenToc(item.subitems, level + 1));
      }
    });
    return flat;
  };
  
  const flatToc = flattenToc(toc);
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Contents</h3>
        <button 
          className="btn btn-icon"
          onClick={onClose}
        >
          <FiX />
        </button>
      </div>
      
      <div className="sidebar-content">
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : flatToc.length === 0 ? (
          <div className="empty-toc">
            <p>No table of contents available</p>
          </div>
        ) : (
          <ul className="toc-list">
            {flatToc.map((item, index) => (
              <li 
                key={index}
                className={`toc-item level-${item.level}`}
              >
                <button
                  className="toc-link"
                  onClick={() => onSelectChapter(item.href)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Sidebar;