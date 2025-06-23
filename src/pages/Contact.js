import React from 'react';

const Contact = () => (
  <div className="contact-page container">
    <h1>Contact Us</h1>
    <p>If you have questions or feedback, send us a message below.</p>
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input id="name" type="text" placeholder="Your name" />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
      </div>
      <div className="form-group">
        <label htmlFor="message">Message</label>
        <textarea id="message" placeholder="Your message" />
      </div>
      <button type="submit" className="btn btn-primary">Send Message</button>
    </form>
  </div>
);

export default Contact;
