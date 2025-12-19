// AuthPage.js
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification 
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, googleProvider, database } from '../firebase';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Load remembered email if exists
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear messages
    setError('');
    setSuccessMessage('');
    
    // Calculate password strength for signup
    if (name === 'password' && !isLogin) {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#e74c3c';
    if (passwordStrength <= 2) return '#e67e22';
    if (passwordStrength <= 3) return '#f1c40f';
    if (passwordStrength <= 4) return '#2ecc71';
    return '#27ae60';
  };

  const validateForm = () => {
    // Clear previous messages
    setError('');
    setSuccessMessage('');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation for signup
    if (!isLogin) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      
      if (!formData.displayName.trim()) {
        setError('Display name is required');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        // Remember email if checkbox is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setSuccessMessage('Login successful! Please verify your email address for full access.');
        }
        
        // Update user status in database on login
        await set(ref(database, `users/${userCredential.user.uid}`), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || formData.email.split('@')[0],
          photoURL: userCredential.user.photoURL || null,
          online: true,
          lastSeen: Date.now(),
          emailVerified: userCredential.user.emailVerified,
          lastLogin: Date.now()
        });
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        // Update profile with display name
        await updateProfile(userCredential.user, {
          displayName: formData.displayName.trim()
        });

        // Send email verification
        await sendEmailVerification(userCredential.user);
        setVerificationSent(true);
        setSuccessMessage('Account created! Please check your email to verify your account.');

        // Remember email if checkbox is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        }

        // Create user profile in database
        await set(ref(database, `users/${userCredential.user.uid}`), {
          uid: userCredential.user.uid,
          email: formData.email,
          displayName: formData.displayName.trim(),
          photoURL: userCredential.user.photoURL || null,
          online: true,
          lastSeen: Date.now(),
          emailVerified: false,
          createdAt: Date.now(),
          lastLogin: Date.now()
        });

        // Clear form after successful signup
        setFormData({
          email: formData.email, // Keep email if remember me is checked
          password: '',
          displayName: '',
          confirmPassword: ''
        });
        setPasswordStrength(0);
      }
    } catch (error) {
      // Handle specific error messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('Email already in use. Please try logging in or use a different email.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Use at least 6 characters with a mix of letters, numbers, and symbols.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email. Please sign up first.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again in a few minutes.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection.');
          break;
        default:
          setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Remember email if checkbox is checked
      if (rememberMe && user.email) {
        localStorage.setItem('rememberedEmail', user.email);
      }

      // Create or update user profile in database
      await set(ref(database, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL,
        online: true,
        lastSeen: Date.now(),
        emailVerified: user.emailVerified,
        provider: 'google',
        lastLogin: Date.now()
      });
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        switch (error.code) {
          case 'auth/popup-blocked':
            setError('Popup blocked by browser. Please allow popups for this site.');
            break;
          case 'auth/unauthorized-domain':
            setError('This domain is not authorized. Please contact support.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your internet connection.');
            break;
          default:
            setError(error.message || 'Failed to sign in with Google.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccessMessage('Password reset email sent! Check your inbox and spam folder.');
      setResetEmail('');
      setTimeout(() => {
        setShowResetPassword(false);
      }, 3000);
    } catch (error) {
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many reset attempts. Please try again later.');
          break;
        default:
          setError(error.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      confirmPassword: ''
    });
    setPasswordStrength(0);
    setError('');
    setSuccessMessage('');
    setVerificationSent(false);
  };

  // Reset password form
  if (showResetPassword) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <button 
            onClick={() => setShowResetPassword(false)}
            className="back-button"
            type="button"
            disabled={loading}
          >
            ← Back
          </button>
          
          <h2>Reset Password</h2>
          <p className="reset-instruction">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          
          <form onSubmit={handlePasswordReset} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={loading}
                autoFocus
              />
            </div>
            
            <div className="button-group">
              <button 
                type="submit" 
                className="auth-btn primary"
                disabled={loading || !resetEmail}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to continue to your account' : 'Join our community today'}
        </p>
        
        {verificationSent && (
          <div className="verification-notice">
            <p>✓ Verification email sent! Please check your inbox and spam folder.</p>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="Enter your display name"
                disabled={loading}
                maxLength="30"
                autoFocus={!isLogin}
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
              disabled={loading}
              autoFocus={isLogin}
            />
          </div>
          
          <div className="form-group">
            <label>Password {!isLogin && <span className="password-requirement">(min. 6 characters)</span>}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              minLength="6"
              disabled={loading}
            />
            
            {!isLogin && formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div 
                      key={level}
                      className="strength-segment"
                      style={{
                        backgroundColor: passwordStrength >= level 
                          ? getPasswordStrengthColor() 
                          : '#eee'
                      }}
                    />
                  ))}
                </div>
                <span className="strength-text">
                  {passwordStrength === 0 && 'Very Weak'}
                  {passwordStrength === 1 && 'Weak'}
                  {passwordStrength === 2 && 'Fair'}
                  {passwordStrength === 3 && 'Good'}
                  {passwordStrength === 4 && 'Strong'}
                  {passwordStrength >= 5 && 'Very Strong'}
                </span>
              </div>
            )}
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="Confirm your password"
                disabled={loading}
                minLength="6"
              />
            </div>
          )}
          
          <div className="form-options">
            {isLogin && (
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
            )}
            
            {isLogin && (
              <button 
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="link-btn"
                disabled={loading}
              >
                Forgot Password?
              </button>
            )}
          </div>
          
          <button 
            type="submit" 
            className="auth-btn primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {isLogin ? 'Signing in...' : 'Creating Account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="auth-btn google"
          disabled={loading}
          type="button"
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
        
        <div className="auth-switch">
          <span>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              resetForm();
            }}
            className="link-btn"
            disabled={loading}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
        
        <div className="auth-footer">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;