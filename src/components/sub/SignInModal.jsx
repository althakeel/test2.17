import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../../assets/styles/SignInModal.css";
import { useAuth } from "../../contexts/AuthContext";
import FacebookIcon from "../../assets/images/facebook.png";
import GoogleSignInButton from '../../components/sub/GoogleSignInButton';

// ===================== Alert Component =====================
const Alert = ({ children, onClose }) => (
  <div className="signin-error-alert">
    <div className="signin-error-content">{children}</div>
    <button onClick={onClose} className="signin-error-close" aria-label="Close alert">
      ×
    </button>
  </div>
);

// ===================== Parse WordPress Error =====================
const parseErrorMsg = (rawMsg) => {
  if (!rawMsg) return null;
  const linkMatch = rawMsg.match(/<a [^>]*>([^<]+)<\/a>/);
  if (linkMatch) {
    const linkText = linkMatch[1];
    const textOnly = rawMsg.replace(/<a[^>]*>[^<]*<\/a>/, "").replace(/<[^>]+>/g, "").trim();
    return (
      <>
        <strong>Error:</strong> {textOnly}{" "}
        <a
          href="https://store1920.com/lost-password"
          target="_blank"
          rel="noopener noreferrer"
          className="signin-lost-password-link"
        >
          {linkText}
        </a>
      </>
    );
  }
  return <>{rawMsg.replace(/<[^>]+>/g, "").trim()}</>;
};

// ===================== Main Component =====================
const SignInModal = ({ isOpen, onClose, onLogin, autoTriggerGoogle = false }) => {
  const { login } = useAuth();
  const googleButtonRef = useRef(null); // AUTO GOOGLE LOGIN

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const FRONTEND_URL = "https://store1920.com";
  const WP_API = "https://db.store1920.com/wp-json";

  // ===================== AUTO GOOGLE POPUP =====================
  // Only auto-trigger if explicitly requested (not for checkout suggestion popup)
  useEffect(() => {
    if (isOpen && autoTriggerGoogle) {
      // Slight delay so modal fully renders
      setTimeout(() => {
        if (googleButtonRef.current) {
          googleButtonRef.current.click();
        }
      }, 700);
    }
  }, [isOpen, autoTriggerGoogle]);

  // ===================== Handlers =====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleForgotPassword = () => {
    onClose();
    window.location.href = `${FRONTEND_URL}/lost-password`;
  };

  // ===================== Validation =====================
  const validateRegister = () => {
    if (!formData.name.trim()) return setErrorMsg("Name is required"), false;
    if (!formData.email.trim()) return setErrorMsg("Email is required"), false;
    // Phone is optional
    if (!formData.password) return setErrorMsg("Password is required"), false;
    if (formData.password !== formData.confirmPassword)
      return setErrorMsg("Passwords do not match"), false;
    setErrorMsg(null);
    return true;
  };

  const validateLogin = () => {
    if (!formData.email.trim()) return setErrorMsg("Email is required"), false;
    if (!formData.password) return setErrorMsg("Password is required"), false;
    setErrorMsg(null);
    return true;
  };

  // ===================== API Calls =====================
  const registerUser = async () => {
    if (!validateRegister()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Use custom WordPress endpoint (no OTP, no WooCommerce)
      console.log('🔵 Registering user...', { email: formData.email, name: formData.name });
      const res = await axios.post(`${WP_API}/custom/v1/register-no-otp`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || '',
      });
      console.log('✅ Registration response:', res.data);

      // Auto-login immediately after registration - try with email first, then username
      try {
        console.log('🔵 Auto-logging in with email:', formData.email);
        let loginRes;
        
        // Try login with email
        try {
          loginRes = await axios.post(`${WP_API}/custom/v1/login-no-otp`, {
            username: formData.email,
            password: formData.password,
          });
        } catch (emailLoginErr) {
          // If email login fails, try with username
          console.log('🔵 Email login failed, trying with username:', res.data.username);
          loginRes = await axios.post(`${WP_API}/custom/v1/login-no-otp`, {
            username: res.data.username,
            password: formData.password,
          });
        }
        
        console.log('✅ Login response:', loginRes.data);

        if (loginRes.data?.token) {
          const lastLogin = new Date().toISOString();
          const userInfo = {
            name: formData.name,
            image: "",
            token: loginRes.data.token,
            id: res.data.user_id || res.data.id,
            email: formData.email,
            user: res.data,
            lastLogin: lastLogin,
          };
          
          console.log('✅ Logging in user:', userInfo);
          
          // Login and save to localStorage
          login(userInfo);
          localStorage.setItem("userId", String(userInfo.id));
          localStorage.setItem("email", userInfo.email);
          localStorage.setItem("token", userInfo.token);
          localStorage.setItem("lastLogin", lastLogin);
          
          // Clear form
          setFormData({
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            phone: "",
          });
          
          // Show success message briefly then close
          setErrorMsg("✅ Welcome to Store1920! Your account has been created.");
          
          setTimeout(() => {
            onLogin?.(userInfo);
            onClose();
          }, 1000);
          
          setLoading(false);
          return;
        } else {
          throw new Error('No token received from login');
        }
      } catch (loginErr) {
        console.error('❌ Auto-login failed:', loginErr);
        console.error('Login error details:', loginErr.response?.data);
        
        // If auto-login fails completely, show success but ask to sign in
        setErrorMsg("✅ Registration successful! Please sign in with your email and password.");
        setIsRegister(false);
        setFormData({
          name: "",
          email: formData.email,
          password: "",
          confirmPassword: "",
          phone: "",
        });
        setLoading(false);
        return;
      }

      // This should not be reached if auto-login succeeds
      setIsRegister(false);
      setFormData({
        name: "",
        email: formData.email,
        password: "",
        confirmPassword: "",
        phone: "",
      });
      setErrorMsg(null);
      setTimeout(() => {
        setErrorMsg("✅ Registration successful! Please sign in.");
      }, 100);
      setLoading(false);
      return;

      /* DISABLED AUTO-LOGIN DUE TO OTP PLUGIN
      // Now login with the new account
      console.log('🔵 Logging in with:', formData.email);
      const loginRes = await axios.post(`${WP_API}/jwt-auth/v1/token`, {
        username: formData.email,
        password: formData.password,
      });
      console.log('✅ Login response:', loginRes.data);

      if (loginRes.data?.token) {
        const lastLogin = new Date().toISOString();
        const userInfo = {
          name: formData.name,
          image: "",
          token: loginRes.data.token,
          id: res.data.user_id || res.data.id,
          email: formData.email,
          user: res.data,
          lastLogin: lastLogin,
        };
        login(userInfo);
        localStorage.setItem("userId", userInfo.id);
        localStorage.setItem("email", userInfo.email);
        localStorage.setItem("token", userInfo.token);
        localStorage.setItem("lastLogin", lastLogin);
        onLogin?.(userInfo);
        onClose();
      } else {
        setErrorMsg("Login failed after registration");
      }
      */
    } catch (err) {
      console.error('❌ Registration/Login Error:', err);
      console.error('Response data:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.response?.data?.code || err.message || "Registration failed";
      setErrorMsg(parseErrorMsg(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async () => {
    if (!validateLogin()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Use custom login endpoint to bypass OTP
      const res = await axios.post(`${WP_API}/custom/v1/login-no-otp`, {
        username: formData.email,
        password: formData.password,
      });

      if (res.data?.token) {
        const lastLogin = new Date().toISOString();
        const userInfo = {
          name: res.data.user_display_name || formData.email,
          image: "",
          token: res.data.token,
          id: res.data.user_id || res.data.id,
          email: formData.email,
          user: res.data,
          lastLogin: lastLogin,
        };

        login(userInfo);
        localStorage.setItem("userId", userInfo.id);
        localStorage.setItem("email", userInfo.email);
        localStorage.setItem("token", userInfo.token);
        localStorage.setItem("lastLogin", lastLogin);
        onLogin?.(userInfo);
        onClose();
      } else {
        setErrorMsg("Invalid login credentials");
      }
    } catch (err) {
      // Check if it's the OTP error
      const errorMsg = err.response?.data?.message || err.response?.data?.code || "Login failed";
      
      if (errorMsg.includes('OTP') || errorMsg.includes('otp')) {
        setErrorMsg("⚠️ Email login temporarily unavailable. Please use Google Sign-In below.");
      } else {
        setErrorMsg(parseErrorMsg(errorMsg));
      }
    } finally {
      setLoading(false);
    }
  };

  // ===================== Social Login (WordPress Nextend) =====================
  const handleSocialLogin = (provider) => {
    const baseUrl = "https://db.store1920.com/wp-login.php?loginSocial=";
    window.location.href = `${baseUrl}${provider}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    isRegister ? registerUser() : loginUser();
  };

  if (!isOpen) return null;

  // ===================== Render =====================
  return (
    <>
      <div 
        className="signin-modal-overlay" 
        onClick={autoTriggerGoogle ? undefined : onClose}
        style={{ cursor: autoTriggerGoogle ? 'default' : 'pointer' }}
      />
      <div className="signin-modal-container" role="dialog" aria-modal="true">
        {!autoTriggerGoogle && (
          <button className="signin-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        )}

        <div className="signin-modal-header">
          <div style={{ 
            background: autoTriggerGoogle ? '#FFE5E5' : '#FFF3E0', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '12px',
            textAlign: 'center',
            fontSize: '14px',
            color: autoTriggerGoogle ? '#C62828' : '#E65100',
            fontWeight: autoTriggerGoogle ? '600' : 'normal'
          }}>
            {autoTriggerGoogle ? (
              <>🔐 <strong>Sign in required to proceed with checkout</strong></>
            ) : (
              <>💡 <strong>Sign in to save your address</strong></>
            )}
          </div>
          
          <h2 className="signin-modal-title">Sign in / Register</h2>
          <div className="signin-security">🔒 All data will be encrypted</div>

          <div className="signin-benefits">
            <div className="benefit-item">
              🚚 Free shipping <span className="benefit-subtext">Special for you</span>
            </div>
            <div className="benefit-item">
              ↩ Free returns <span className="benefit-subtext">Up to 90 days</span>
            </div>
          </div>
        </div>

        <form className="signin-modal-form" onSubmit={handleSubmit} noValidate>
          {errorMsg && <Alert onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

          {isRegister && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="signin-modal-input"
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number (Optional)"
                value={formData.phone}
                onChange={handleChange}
                className="signin-modal-input"
              />
            </>
          )}

          <input
            type="text"
            name="email"
            placeholder="Email or phone number"
            value={formData.email}
            onChange={handleChange}
            className="signin-modal-input"
            required
          />

          {!isRegister && (
            <>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="signin-modal-input"
                required
              />
              <div className="signin-show-password">
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  Show password
                </label>
              </div>
            </>
          )}

          {isRegister && (
            <>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="signin-modal-input"
                required
              />
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="signin-modal-input"
                required
              />
              <div className="signin-show-password">
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  Show password
                </label>
              </div>
            </>
          )}

          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Register" : "Continue"}
          </button>
        </form>

        {!isRegister && (
          <div className="signin-forgot-password-text" onClick={handleForgotPassword}>
            Trouble signing in?
          </div>
        )}

        <div className="signin-divider">
          <span>Or continue with</span>
        </div>

        <div className="signin-social-icons">

          {/* Auto-click target */}
          <GoogleSignInButton
            ref={googleButtonRef}
            onClose={onClose}
            onLogin={(userInfo) => {
              onLogin?.(userInfo);
            }}
          />

          {/* Facebook and Apple Pay buttons hidden */}
        </div>

        <div className="signin-terms">
          By continuing, you agree to our{" "}
          <a href="/terms-0f-use">Terms</a> and <a href="/privacy-policy">Privacy Policy</a>.
        </div>

        <div className="signin-toggle-text">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="signin-toggle-link"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="signin-toggle-link"
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SignInModal;
