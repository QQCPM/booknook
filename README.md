BookNook - Your Personal EPUB Reader in the Cloud
BookNook is a web-based EPUB reader application that allows users to upload, store, and read their EPUB books online. It features a clean, intuitive interface with support for Apple Pencil note-taking, bookmarking, and progress tracking.

🚀 Features

User Authentication: Secure sign-up and login with email/password or Google account
Book Management: Upload, view, and organize your EPUB library
Advanced EPUB Reader:

Customizable reading experience (font size, night mode)
Progress tracking and synchronization across devices
Pagination and continuous scrolling options


Apple Pencil Support: Take handwritten notes directly on book pages
Note Management: View, edit, and navigate through your handwritten notes
Bookmarking: Mark and return to your favorite passages
Search Functionality: Find books quickly in your growing library
Responsive Design: Works seamlessly on desktop and mobile devices

💻 Technologies Used

Frontend:

React.js
react-router-dom for navigation
react-reader for EPUB rendering
react-icons for UI elements


Backend & Storage:

Firebase Authentication
Firestore Database
Firebase Storage for EPUB files and notes


Additional Libraries:

epubjs for EPUB parsing
uuid for generating unique identifiers



📋 Prerequisites

Node.js (v14.0.0 or later)
npm (v6.0.0 or later)
Firebase account
Modern web browser (Chrome, Firefox, Safari, Edge)

🔧 Installation & Setup

Clone the repository

bashCopygit clone https://github.com/yourusername/booknook.git
cd booknook

Install dependencies

bashCopynpm install

Set up Firebase


Create a Firebase project at Firebase Console
Enable Authentication (Email/Password and Google)
Create Firestore Database
Set up Storage
Get your Firebase config


Configure Environment Variables

Create a .env.local file in the root directory:
CopyREACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id

Configure Firebase Rules


Update Firestore rules to match those in firestore.rules
Update Storage rules to match those in storage.rules


Configure CORS for Firebase Storage

bashCopygsutil cors set cors-config.json gs://your-storage-bucket

Start the development server

bashCopynpm start
📚 Usage
Registration and Login

Create an account using email/password or sign in with Google
Verify your email address if you used email/password registration

Managing Your Library

Upload EPUB books using the "Add Book" button
Add metadata such as title, author, and cover image
View your books in grid or list view
Filter and search through your library

Reading Books

Click on a book to view details or start reading
Customize your reading experience with the settings button
Navigate using swipe, arrow keys, or on-screen controls
Toggle between light, sepia, and dark modes

Using Apple Pencil for Notes

While reading, tap the pencil icon to create handwritten notes
Use Apple Pencil to write or draw on the white canvas
Save your notes to revisit later
View all your notes by clicking the page icon in the top toolbar

📄 License
This project is licensed under the MIT License 
© 2025 BookNook. All rights reserved.
