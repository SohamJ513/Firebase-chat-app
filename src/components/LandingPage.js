import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/auth?mode=login');
  };

  const handleSignup = () => {
    navigate('/auth?mode=signup');
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <nav>
            <div className="logo">
              <i className="fas fa-comment-dots"></i>
              <span>SparkChat</span>
            </div>
            <div className="nav-links">
              <a href="#features">Features</a>
              <a href="#about">About</a>
              <button className="btn btn-primary" onClick={handleLogin}>
                Get Started
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Real-time Chat Built with Firebase</h1>
            <p>Experience seamless communication with our modern chat application. Built with Firebase for real-time messaging, authentication, and cloud storage.</p>
            
            <div className="hero-buttons">
              <button className="btn btn-primary" onClick={handleLogin}>
                <i className="fas fa-sign-in-alt"></i> Start Chatting Now
              </button>
              <button className="btn btn-secondary" onClick={() => document.getElementById('features').scrollIntoView()}>
                Learn More
              </button>
            </div>
            
            <div className="hero-features">
              <div className="feature">
                <i className="fas fa-bolt"></i>
                <span>Real-time messaging</span>
              </div>
              <div className="feature">
                <i className="fas fa-shield-alt"></i>
                <span>Firebase Authentication</span>
              </div>
              <div className="feature">
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Cloudinary image uploads</span>
              </div>
              <div className="feature">
                <i className="fas fa-bell"></i>
                <span>Push notifications</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="chat-preview">
              <div className="chat-preview-header">
                <h3>SparkChat</h3>
                <p>Real-time messaging • Firebase Authentication • Cloudinary uploads</p>
              </div>
              
              <div className="chat-preview-features">
                <span className="chat-feature-tag">Real-time</span>
                <span className="chat-feature-tag">Secure</span>
                <span className="chat-feature-tag">Fast</span>
              </div>
              
              <div className="chat-header">
                <div className="chat-header-info">
                  <i className="fas fa-user-circle"></i>
                  <div>
                    <h3>IT_18_Soham Jathar</h3>
                    <p>Last seen 16th ago</p>
                  </div>
                </div>
                <i className="fas fa-ellipsis-v"></i>
              </div>
              
              <div className="chat-body">
                <div className="message message-received">
                  <div className="message-text">I'm good, just working on my Firebase chat app</div>
                  <div className="message-time">12:28 am</div>
                </div>
                
                <div className="message message-sent">
                  <div className="message-text">That's awesome! Firebase is perfect for real-time apps</div>
                  <div className="message-time">12:30 am</div>
                </div>
                
                <div className="message message-received">
                  <div className="message-text">Yeah, the authentication and Firestore work great together</div>
                  <div className="message-time">10:00 am</div>
                </div>
                
                <div className="message message-sent">
                  <div className="message-text">Have you implemented push notifications yet?</div>
                  <div className="message-time">10:30 am</div>
                </div>
              </div>
              
              <div className="message-input">
                <input type="text" placeholder="Type a message..." value="Thanks for the help!" readOnly />
                <button><i className="fas fa-paper-plane"></i></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-title">
            <h2>Powerful Features</h2>
            <p>Our chat application comes with all the modern features you need</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>Real-Time Chat</h3>
              <p>Instant message delivery powered by Firebase Realtime Database.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-user-lock"></i>
              </div>
              <h3>Secure Authentication</h3>
              <p>Firebase Authentication with email/password and Google OAuth.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-image"></i>
              </div>
              <h3>Image Sharing</h3>
              <p>Upload and share images seamlessly with Cloudinary integration.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Group Chats</h3>
              <p>Create groups for team collaboration or social circles.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-bell"></i>
              </div>
              <h3>Push Notifications</h3>
              <p>Get notified of new messages with Firebase Cloud Messaging.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-microphone"></i>
              </div>
              <h3>Voice Messages</h3>
              <p>Send voice recordings with our built-in voice recorder.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section className="auth-section" id="auth">
        <div className="container">
          <h2>Ready to Start Chatting?</h2>
          <p>Join thousands of users enjoying seamless communication.</p>
          
          <div className="auth-buttons">
            <button className="btn btn-primary" onClick={handleLogin}>
              <i className="fas fa-sign-in-alt"></i> Login to Your Account
            </button>
            <button className="btn btn-secondary" onClick={handleSignup}>
              <i className="fas fa-user-plus"></i> Create New Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-col">
              <h3>SparkChat</h3>
              <p>A modern chat application built with Firebase, React, and Cloudinary.</p>
            </div>
            
            <div className="footer-col">
              <h3>Technologies</h3>
              <ul>
                <li><a href="#">Firebase Authentication</a></li>
                <li><a href="#">Firestore Database</a></li>
                <li><a href="#">Cloudinary</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h3>Project</h3>
              <ul>
                <li><a href="#">Components</a></li>
                <li><a href="#">Firebase Config</a></li>
                <li><a href="#">Utilities</a></li>
              </ul>
            </div>
          </div>
          
          <div className="copyright">
            <p>© 2023 SparkChat | Created by Soham Jathar</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;