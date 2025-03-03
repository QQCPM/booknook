import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification
  } from 'firebase/auth';
  import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
  import { auth, db } from './firebase';
  
  const googleProvider = new GoogleAuthProvider();
  
  // Sign up with email and password
  export const registerWithEmailAndPassword = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName,
        email,
        photoURL: user.photoURL || '',
        createdAt: new Date(),
        bookmarks: [],
        favoriteBooks: [],
        lastRead: {}
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  // Sign in with email and password
  export const loginWithEmailAndPassword = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw error;
    }
  };
  
  // Sign in with Google
  export const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      // If user document doesn't exist, create it
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL || '',
          createdAt: new Date(),
          bookmarks: [],
          favoriteBooks: [],
          lastRead: {}
        });
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  // Update user profile
  export const updateUserProfile = async (userData) => {
    try {
      const user = auth.currentUser;
      
      // Update auth profile
      if (userData.displayName || userData.photoURL) {
        await updateProfile(user, {
          displayName: userData.displayName || user.displayName,
          photoURL: userData.photoURL || user.photoURL
        });
      }
      
      // Update Firestore user document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date()
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  // Get user data from Firestore
  export const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data();
      } else {
        throw new Error("User document does not exist");
      }
    } catch (error) {
      throw error;
    }
  };
  
  // Sign out
  export const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };
  
  // Password reset
  export const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };
  
  // Email verification
  export const verifyEmail = async () => {
    try {
      const user = auth.currentUser;
      await sendEmailVerification(user);
    } catch (error) {
      throw error;
    }
  };