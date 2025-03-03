import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserData } from '../services/authService';
import Loading from '../components/UI/Loading';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDataFromFirestore = await getUserData(user.uid);
          setUserData(userDataFromFirestore);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Error fetching user data. Please try again later.');
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Update user data when it changes
  const updateUserState = async () => {
    if (currentUser) {
      try {
        const userDataFromFirestore = await getUserData(currentUser.uid);
        setUserData(userDataFromFirestore);
      } catch (err) {
        console.error('Error updating user data:', err);
        setError('Error updating user data. Please try again later.');
      }
    }
  };

  const value = {
    currentUser,
    userData,
    error,
    setError,
    updateUserState
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <Loading /> : children}
    </AuthContext.Provider>
  );
}