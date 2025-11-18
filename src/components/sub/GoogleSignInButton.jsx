import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import axios from "axios";
import GoogleIcon from "../../assets/images/search.png";

const GoogleSignInButton = React.forwardRef(({ onLogin, onClose }, ref) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    // Prevent multiple clicks
    if (isLoading) {
      console.log('⏳ Sign-in already in progress...');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("🔵 Starting Google Sign-In...");

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
      console.log("🔵 Sending data:", userData);
      
      const res = await axios.post(
        "https://db.store1920.com/wp-json/custom/v1/google-login",
        userData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log("✅ WordPress response:", res.data);

      // The backend ALWAYS returns correct WP user_id
      const lastLogin = new Date().toISOString();
      const userInfo = {
        id: res.data.user_id,        // IMPORTANT (WP ID)
        email: res.data.email,
        name: res.data.name,
        token: res.data.token,
        image: res.data.photo,       // For navbar
        firebaseUid: userData.firebase_uid,
        billing: res.data.billing,   // Address data
        shipping: res.data.shipping, // Address data
        lastLogin: lastLogin,
      };

      // Save to context + localStorage
      login(userInfo);
      localStorage.setItem('lastLogin', lastLogin);
      
      // Save addresses to localStorage for checkout
      if (res.data.billing || res.data.shipping) {
        // Helper function to parse phone number
        const parsePhone = (phone) => {
          if (!phone) return { prefix: '50', number: '' };
          
          // Remove +971 if present
          let cleaned = phone.replace(/^\+971/, '').replace(/\D/g, '');
          
          // If exactly 7 digits, assume it's just the number without prefix (legacy data)
          if (cleaned.length === 7) {
            return { prefix: '50', number: cleaned };
          }
          
          // If 9 digits, first 2 are prefix, last 7 are number
          if (cleaned.length === 9) {
            return {
              prefix: cleaned.slice(0, 2),
              number: cleaned.slice(2)
            };
          }
          
          // Default fallback
          return {
            prefix: cleaned.slice(0, 2) || '50',
            number: cleaned.slice(2) || cleaned
          };
        };

        const billingPhone = parsePhone(res.data.billing?.phone);
        const shippingPhone = parsePhone(res.data.shipping?.phone);

        const checkoutData = {
          billing: {
            first_name: res.data.billing?.first_name || '',
            last_name: res.data.billing?.last_name || '',
            full_name: `${res.data.billing?.first_name || ''} ${res.data.billing?.last_name || ''}`.trim(),
            email: res.data.billing?.email || res.data.email,
            street: res.data.billing?.address_1 || '',
            apartment: res.data.billing?.address_2 || '',
            city: res.data.billing?.city || '',
            state: res.data.billing?.state || '',
            postal_code: res.data.billing?.postcode || '',
            country: res.data.billing?.country || 'AE',
            phone_number: billingPhone.number,
            phone_prefix: billingPhone.prefix,
          },
          shipping: {
            first_name: res.data.shipping?.first_name || '',
            last_name: res.data.shipping?.last_name || '',
            full_name: `${res.data.shipping?.first_name || ''} ${res.data.shipping?.last_name || ''}`.trim(),
            email: res.data.email,
            street: res.data.shipping?.address_1 || '',
            apartment: res.data.shipping?.address_2 || '',
            city: res.data.shipping?.city || '',
            state: res.data.shipping?.state || '',
            postal_code: res.data.shipping?.postcode || '',
            country: res.data.shipping?.country || 'AE',
            phone_number: shippingPhone.number || billingPhone.number,
            phone_prefix: shippingPhone.prefix || billingPhone.prefix,
          },
        };
        
        // Only save if there's actual address data
        if (checkoutData.shipping.street || checkoutData.billing.street) {
          localStorage.setItem('checkoutAddressData', JSON.stringify(checkoutData));
          console.log('✅ Saved addresses to localStorage for checkout');
        }
      }
      
      // 🎉 Show success message with toast
      const linkedOrders = res.data.linked_orders || 0;
      const successMsg = linkedOrders > 0 
        ? `Welcome back! We found ${linkedOrders} order${linkedOrders > 1 ? 's' : ''} linked to your account.`
        : `Welcome, ${res.data.name}! You're successfully signed in.`;
      
      showToast(successMsg, 'success', 5000);

      console.log("🎉 Google Login Success!");

      // Call onLogin callback first
      if (onLogin) {
        onLogin(userInfo);
      }

      // Auto-close the sign-in modal with a small delay to ensure state updates
      setTimeout(() => {
        if (onClose) {
          console.log("🔵 Closing sign-in modal...");
          onClose();
        }
      }, 300);

    } catch (err) {
      console.error("❌ Google Sign-In Error:", err);

      // Silently ignore these common/harmless errors
      if (err.message?.includes('INTERNAL ASSERTION FAILED') || 
          err.message?.includes('Pending promise') ||
          err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request') {
        console.log('⚠️ User closed popup or Firebase internal error (ignoring)');
        return;
      }

      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response?.data
      });

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
      } else if (err.message === 'Network Error') {
        msg = "Cannot connect to WordPress. Please check:\n1. CORS is enabled on db.store1920.com\n2. WordPress is accessible\n3. Your internet connection";
        console.error("🔴 CORS or Network issue detected");
      } else if (err.message && !err.message.includes('INTERNAL')) {
        msg = `Error: ${err.message}`;
      }

      // Only show alert for real errors
      if (msg !== "Google sign-in failed.") {
        alert(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      ref={ref} 
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      style={{ 
        opacity: isLoading ? 0.6 : 1, 
        cursor: isLoading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
    >
      {isLoading ? (
        <>
          <span>⏳</span>
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <img
            src={GoogleIcon}
            alt="Google"
            style={{ width: '20px', height: '20px' }}
          />
          <span>Sign in with Google</span>
        </>
      )}
    </button>
  );
});

GoogleSignInButton.displayName = 'GoogleSignInButton';

export default GoogleSignInButton;
