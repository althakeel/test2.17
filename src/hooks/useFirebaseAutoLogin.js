import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../utils/firebase";
import axios from "axios";

// Global flag to prevent duplicate syncs
let isCurrentlySyncing = false;
let lastSyncedUser = null;

const useFirebaseAutoLogin = (onLogin) => {
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // Only initialize once per app lifecycle
    if (hasInitialized.current) {
      console.log('⏭️ Firebase auth already initialized, skipping...');
      return;
    }
    hasInitialized.current = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Skip if already syncing or already synced this user
        if (isCurrentlySyncing) {
          console.log('⏳ Sync already in progress, skipping...');
          return;
        }
        
        if (lastSyncedUser === firebaseUser.uid) {
          console.log('✅ User already synced:', firebaseUser.email);
          return;
        }
        
        console.log('🔄 Firebase user detected:', firebaseUser.email);
        isCurrentlySyncing = true;
        
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
          lastSyncedUser = userData.firebaseUid;
          console.log('✅ Auto-login successful with WordPress sync');
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
          lastSyncedUser = userData.firebaseUid;
          console.log('✅ Auto-login successful with Firebase only');
        } finally {
          isCurrentlySyncing = false;
        }
      } else {
        console.log('❌ No Firebase user detected');
        isCurrentlySyncing = false;
        lastSyncedUser = null;
      }
    });

    return () => unsubscribe();
  }, [onLogin]);
};

export default useFirebaseAutoLogin;
