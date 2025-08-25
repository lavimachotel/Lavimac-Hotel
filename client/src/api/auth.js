const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const authApi = {
  signup: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Signup failed');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  getUser: async () => {
    try {
      // In a full version, this would get user data from the database
      throw new Error('No authentication system implemented');
    } catch (error) {
      throw error;
    }
  },
};
