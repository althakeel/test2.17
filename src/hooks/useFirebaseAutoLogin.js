import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../utils/firebase";
import axios from "axios";

const useFirebaseAutoLogin = (onLogin) => {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Firebase user detected:', firebaseUser.email);
        
        // Extract user details from Firebase
        const userData = {
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          firebaseUid: firebaseUser.uid,
          photoURL: firebaseUser.photoURL,
        };

        try {
          // Try to sync with WordPress
          const res = await axios.post(
            "https://db.store1920.com/wp-json/custom/v1/google-login",
            {
              email: userData.email,
              name: userData.name,
              firebase_uid: userData.firebaseUid,
              photo_url: userData.photoURL,
            }
          );

          const userInfo = {
            id: res.data.id || res.data.user_id,
            name: userData.name,
            email: userData.email,
            token: res.data.token,
            image: userData.photoURL,
            photoURL: userData.photoURL,
            firebaseUid: userData.firebaseUid,
          };

          localStorage.setItem("token", userInfo.token);
          localStorage.setItem("userId", userInfo.id);
          localStorage.setItem("email", userInfo.email);

          onLogin?.(userInfo);
          console.log('Auto-login successful with WordPress sync');
        } catch (error) {
          console.warn('WordPress sync failed, using Firebase data only:', error);
          
          // Fallback: use Firebase data only
          const userInfo = {
            id: userData.firebaseUid,
            name: userData.name,
            email: userData.email,
            token: 'firebase-only',
            image: userData.photoURL,
            photoURL: userData.photoURL,
            firebaseUid: userData.firebaseUid,
          };

          localStorage.setItem("userId", userInfo.id);
          localStorage.setItem("email", userInfo.email);
          localStorage.setItem("token", userInfo.token);

          onLogin?.(userInfo);
          console.log('Auto-login successful with Firebase only');
        }
      } else {
        console.log('No Firebase user detected');
      }
    });

    return () => unsubscribe();
  }, [onLogin]);
};

export default useFirebaseAutoLogin;
