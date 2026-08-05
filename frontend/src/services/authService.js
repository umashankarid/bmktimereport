import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Authentication service for managing admin login and session
 */
class AuthService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.admin = JSON.parse(localStorage.getItem('admin')) || null;
  }

  /**
   * Login with admin credentials
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @return {Promise} Login response
   */
  async login(username, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        this.token = response.data.token;
        this.admin = response.data.admin;

        // Store in localStorage
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('admin', JSON.stringify(this.admin));

        // Set default header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

        return {
          success: true,
          admin: this.admin
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Login failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login error: ' + error.message
      };
    }
  }

  /**
   * Setup Google Sheets connection
   * @param {string} sheetId - Google Sheet ID
   * @param {File} credentialsFile - Service account JSON file
   * @return {Promise} Setup response
   */
  async setupGoogleSheets(sheetId, credentialsFile) {
    try {
      const formData = new FormData();
      formData.append('sheet_id', sheetId);
      formData.append('credentials', credentialsFile);

      const response = await axios.post(
        `${API_URL}/auth/setup-sheets`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Setup failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Setup error: ' + error.message
      };
    }
  }

  /**
   * Check if user is authenticated
   * @return {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.admin;
  }

  /**
   * Get current admin
   * @return {Object} Admin object or null
   */
  getAdmin() {
    return this.admin;
  }

  /**
   * Get auth token
   * @return {string} Auth token or null
   */
  getToken() {
    return this.token;
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    this.admin = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('admin');
    delete axios.defaults.headers.common['Authorization'];
  }

  /**
   * Check if setup is complete
   * @return {Promise} Setup status
   */
  async checkSetupStatus() {
    try {
      const response = await axios.get(
        `${API_URL}/auth/setup-status`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Export singleton instance
export default new AuthService();
