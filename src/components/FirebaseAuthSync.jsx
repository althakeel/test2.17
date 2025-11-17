// Component to sync Firebase authentication state with app
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useFirebaseAutoLogin from '../hooks/useFirebaseAutoLogin';

const FirebaseAuthSync = () => {
  const { login } = useAuth();
  
  // Firebase auto-login - keeps user logged in across browser sessions
  useFirebaseAutoLogin(login);
  
  return null; // This component doesn't render anything
};

export default FirebaseAuthSync;
