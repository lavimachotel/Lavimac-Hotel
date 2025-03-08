import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';

const AuthForm = ({ type = 'signup' }) => {
  const { login, signup } = useAuth();
  const history = useHistory();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const evaluatePasswordStrength = (password) => {
    let strength = 'Weak';
    const lengthCriteria = password.length >= 8;
    const numberCriteria = /[0-9]/.test(password);
    const specialCharCriteria = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const uppercaseCriteria = /[A-Z]/.test(password);

    const criteriaMet = [lengthCriteria, numberCriteria, specialCharCriteria, uppercaseCriteria].filter(Boolean).length;

    if (criteriaMet === 4) {
        strength = 'Strong';
    } else if (criteriaMet === 3) {
        strength = 'Medium';
    }

    return strength;
};

const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordStrength(evaluatePasswordStrength(newPassword));
};

  const validatePasswords = () => {
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === 'signup' && !validatePasswords()) {
      return;
    }
    if (type === 'signup') {
      try {
        const message = await signup(formData.email, formData.password, formData.fullName);
        alert(message); // Display success message
        history.push('/login'); // Redirect to login page
      } catch (error) {
        console.error('Error during sign up:', error);
        // Handle error (e.g., show error message)
      }
    } else {
      await login(formData.email, formData.password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] p-4">
      <div className="w-full max-w-md p-8 rounded-lg bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">
          {type === 'signup' ? 'Sign Up' : 'Welcome back'}
        </h1>
        <p className="text-gray-400 mb-8">
          {type === 'signup' 
            ? 'Create your account to get started with our hotel management system.'
            : 'Sign in to access your account and continue managing your hotel.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'signup' && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          {type === 'signup' ? (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Create a strong password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {passwordStrength && <p className="mt-2 text-sm text-gray-300">Strength: {passwordStrength}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Confirm your password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-500">{passwordError}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
          )}

          {type === 'signup' && (
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                required
              />
              <label htmlFor="terms" className="ml-3 text-sm text-gray-400">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,255,0.5)] hover:shadow-[0_0_25px_rgba(0,0,255,0.6)]"
          >
            {type === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          {type === 'signup' 
            ? 'Already have an account? '
            : "Don't have an account? "}
          <a 
            href={type === 'signup' ? '/login' : '/signup'} 
            className="text-blue-500 hover:text-blue-400"
          >
            {type === 'signup' ? 'Sign In' : 'Sign Up'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
