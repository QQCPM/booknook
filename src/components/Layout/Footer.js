import React from 'react';
import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiMail } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>BookNook</h3>
            <p>Your personal online library for EPUB books.</p>
          </div>
          
          <div className="footer-section">
            <h3>Links</h3>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/library">Library</Link></li>
              <li><Link to="/upload">Upload</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Connect</h3>
            <div className="social-links">
              {/* Fixed links with proper URLs */}
              <a href="https://github.com" className="social-link" target="_blank" rel="noopener noreferrer">
                <FiGithub />
              </a>
              <a href="https://twitter.com" className="social-link" target="_blank" rel="noopener noreferrer">
                <FiTwitter />
              </a>
              <a href="mailto:info@booknook.com" className="social-link">
                <FiMail />
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} BookNook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;