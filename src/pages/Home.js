import React from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiCloud, FiSmartphone, FiShield } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();
  
  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Your Books, Anywhere</h1>
          <p>
            Upload, store, and read your EPUB books online. 
            Access your personal library on any device, anytime.
          </p>
          {currentUser ? (
            <Link to="/library" className="btn btn-primary btn-large">
              Go to My Library
            </Link>
          ) : (
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary btn-large">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary btn-large">
                Sign In
              </Link>
            </div>
          )}
        </div>
        <div className="hero-image">
          {/* Use a div with background styling instead of an image */}
          <div 
            style={{
              width: '100%',
              height: '300px',
              backgroundColor: '#e9e9e9',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#909090'
            }}
          >
            <FiBookOpen size={48} />
          </div>
        </div>
      </section>
      
      <section className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FiBookOpen />
            </div>
            <h3>EPUB Reader</h3>
            <p>
              Read your books directly in your browser with our 
              beautiful and customizable EPUB reader.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <FiCloud />
            </div>
            <h3>Cloud Storage</h3>
            <p>
              Store your books securely in the cloud and access 
              them from anywhere, anytime.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <FiSmartphone />
            </div>
            <h3>Responsive Design</h3>
            <p>
              Enjoy a seamless reading experience on any device – 
              desktop, tablet, or mobile.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <FiShield />
            </div>
            <h3>Secure Access</h3>
            <p>
              Sign in securely with your Google account or email 
              and password.
            </p>
          </div>
        </div>
      </section>
      
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Build Your Digital Library?</h2>
          <p>
            Join BookNook today and start your personal digital library.
          </p>
          {currentUser ? (
            <Link to="/upload" className="btn btn-primary btn-large">
              Upload Your First Book
            </Link>
          ) : (
            <Link to="/signup" className="btn btn-primary btn-large">
              Create an Account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;