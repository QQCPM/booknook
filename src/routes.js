import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/Auth/PrivateRoute';

// Public pages
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';

// Protected pages
import BookLibrary from './components/Books/BookLibrary';
import BookDetails from './components/Books/BookDetails';
import BookUpload from './components/Books/BookUpload';
import Profile from './components/Auth/Profile';
import EpubReader from './components/Reader/EpubReader';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Protected routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/library" element={<BookLibrary />} />
        <Route path="/books/:bookId" element={<BookDetails />} />
        <Route path="/upload" element={<BookUpload />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reader/:bookId" element={<EpubReader />} />
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;