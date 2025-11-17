import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import GoogleIcon from "../../assets/images/search.png";

const GoogleSignInButton = React.forwardRef(({ onLogin }, ref) => {
  const { login } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      console.log("🔵 Starting Google Sign-In...");

      // Clear any existing popup operations
      await auth.currentUser; // Ensure auth is ready

      // Step 1 — Firebase Login Popup
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      console.log("✅ Firebase user:", firebaseUser.email);

      // Extract essential user data
      const userData = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
        firebase_uid: firebaseUser.uid,
        photo_url: firebaseUser.photoURL,
      };

      // Step 2 — Send to WordPress for Account Sync + Login
      console.log("🔵 Syncing with WordPress...");
      const res = await axios.post(
        "https://db.store1920.com/wp-json/custom/v1/google-login",
        userData
      );

      console.log("✅ WordPress response:", res.data);

      // The backend ALWAYS returns correct WP user_id
      const userInfo = {
        id: res.data.user_id,        // IMPORTANT (WP ID)
        email: res.data.email,
        name: res.data.name,
        token: res.data.token,
        image: res.data.photo,       // For navbar
        firebaseUid: userData.firebase_uid,
      };

      // Save to context + localStorage
      login(userInfo);
      onLogin?.(userInfo);

      // 🎉 Show success message if orders were linked
      if (res.data.linked_orders > 0) {
        console.log(`🎉 Linked ${res.data.linked_orders} past orders to your account!`);
      }

      console.log("🎉 Google Login Success!");

    } catch (err) {
      console.error("❌ Google Sign-In Error:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response?.data
      });

      // Ignore internal Firebase assertion errors (happens during normal operation)
      if (err.message?.includes('INTERNAL ASSERTION FAILED') || 
          err.message?.includes('Pending promise')) {
        console.log('⚠️ Firebase internal error (can be ignored)');
        return;
      }

      let msg = "Google sign-in failed.";
      
      // Firebase errors
      if (err.code === "auth/popup-closed-by-user") {
        msg = "Sign-in cancelled.";
      } else if (err.code === "auth/popup-blocked") {
        msg = "Pop-up blocked. Please enable pop-ups for this site.";
      } else if (err.code === "auth/cancelled-popup-request") {
        msg = "Another sign-in popup is already open.";
      } else if (err.code?.startsWith("auth/")) {
        msg = `Firebase error: ${err.message}`;
      } 
      // WordPress API errors
      else if (err.response?.data?.message) {
        msg = `WordPress error: ${err.response.data.message}`;
      } else if (err.response?.status === 404) {
        msg = "WordPress endpoint not found. Please check backend setup.";
      } else if (err.message && !err.message.includes('INTERNAL')) {
        msg = `Error: ${err.message}`;
      }

      // Only show alert for real errors
      if (msg !== "Google sign-in failed.") {
        alert(msg);
      }
    }
  };

  return (
    <button ref={ref} onClick={handleGoogleSignIn}>
      <img
        src={GoogleIcon}
        alt="Google Sign-In"
      />
    </button>
  );
});

GoogleSignInButton.displayName = 'GoogleSignInButton';

export default GoogleSignInButton;
