import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="container">
        <div className="content">
          <h1 className="hotel-name">Mikjane Hotel</h1>
          <h2 className="title">
            Powered by<br />
            Ecstasy Geospatial Services
          </h2>
          <p className="description">
            Experience the future of hotel management with
            our comprehensive solution designed for luxury
            establishments.
          </p>

          <div className="buttons">
            <Link to="/login" className="button button-primary">
              <i className="fas fa-sign-in-alt"></i>
              Login to Dashboard
            </Link>
            <button className="button button-outline">
              <i className="fas fa-user-plus"></i>
              Request Access
            </button>
          </div>

          <div className="stats">
            <div className="stat">
              <i className="fas fa-shield-alt stat-icon"></i>
              <div className="stat-text">
                <span className="stat-label">Trusted by</span>
                <span className="stat-value">500+ Hotels</span>
              </div>
            </div>
            <div className="stat">
              <i className="fas fa-star stat-icon"></i>
              <div className="stat-text">
                <span className="stat-label">Rating</span>
                <span className="stat-value">4.9/5.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="image-section">
          <img src="/hero.jpg" alt="Luxury Hotel" className="w-full h-auto rounded-lg shadow-lg" />
          <div className="badge">
            ★★★★★ Luxury Hotel
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
