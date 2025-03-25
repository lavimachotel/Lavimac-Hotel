import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useUser } from '../context/UserContext';

function LandingPage() {
  const { setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  // Function to login as admin or manager
  const handleLogin = (role) => {
    setCurrentUser({
      id: `demo-${role}-id`,
      email: `${role}@example.com`,
      role: role,
      fullName: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      position: role === 'admin' ? 'Administrator' : 'Hotel Manager',
      department: 'Management',
      contactNumber: '123-456-7890',
      avatar_url: null
    });

    // Redirect to the appropriate page
    if (role === 'admin') {
      navigate('/admin/access-control');
    } else if (role === 'manager') {
      navigate('/manager/access-control');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="landing-page dark:bg-black light:bg-gray-100 relative">
      <div className="container">
        <div className="content">
          <h1 className="hotel-name dark:text-primary light:text-primary">Mikjane Hotel</h1>
          <h2 className="title dark:text-white light:text-gray-900">
            Powered by<br />
            Ecstasy Geospatial Services
          </h2>
          <p className="description dark:text-gray-300 light:text-gray-700">
            Experience the future of hotel management with
            our comprehensive solution designed for luxury
            establishments.
          </p>

          <div className="buttons">
            <Link to="/login" className="button button-primary dark:shadow-[0_0_15px_rgba(0,0,255,0.5)] dark:hover:shadow-[0_0_25px_rgba(0,0,255,0.6)] light:shadow-[0_0_15px_rgba(0,0,255,0.3)] light:hover:shadow-[0_0_25px_rgba(0,0,255,0.4)]">
              <i className="fas fa-sign-in-alt"></i>
              Login to Dashboard
            </Link>
            <Link to="/request-access" className="button button-outline">
              <i className="fas fa-user-plus"></i>
              Request Access
            </Link>
          </div>

          <div className="stats">
            <div className="stat dark:bg-gray-900 light:bg-white">
              <i className="fas fa-shield-alt stat-icon dark:text-blue-400 light:text-blue-600"></i>
              <div className="stat-text">
                <span className="stat-label dark:text-gray-400 light:text-gray-600">Trusted by</span>
                <span className="stat-value dark:text-white light:text-gray-900">10+ Hotels</span>
              </div>
            </div>
            <div className="stat dark:bg-gray-900 light:bg-white">
              <i className="fas fa-star stat-icon dark:text-yellow-400 light:text-yellow-600"></i>
              <div className="stat-text">
                <span className="stat-label dark:text-gray-400 light:text-gray-600">Rating</span>
                <span className="stat-value dark:text-white light:text-gray-900">4.9/5.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="image-section">
          <img src="/hero.jpg" alt="Luxury Hotel" className="w-full h-auto rounded-lg shadow-lg" />
          <div className="badge dark:bg-black dark:bg-opacity-80 light:bg-white light:bg-opacity-80 dark:text-white light:text-gray-900">
            ★★★★★ Luxury Hotel
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 z-10">
        <ThemeToggle className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 light:bg-gray-200 light:hover:bg-gray-300" />
      </div>
    </div>
  );
}

export default LandingPage;
