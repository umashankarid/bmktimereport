import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Trainer authentication service
 */
class TrainerAuthService {
  constructor() {
    this.token = localStorage.getItem('trainerToken');
    this.trainer = JSON.parse(localStorage.getItem('trainer')) || null;
  }

  /**
   * Register a new trainer
   */
  async register(trainerName, email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/trainer/register`, {
        trainer_name: trainerName,
        email,
        password
      });

      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration error: ' + error.message
      };
    }
  }

  /**
   * Login trainer
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/trainer/login`, {
        email,
        password
      });

      if (response.data.success) {
        this.token = response.data.token;
        this.trainer = response.data.trainer;

        // Store in localStorage
        localStorage.setItem('trainerToken', this.token);
        localStorage.setItem('trainer', JSON.stringify(this.trainer));

        // Set default header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

        return {
          success: true,
          trainer: this.trainer
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
   * Check if trainer is authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.trainer;
  }

  /**
   * Get current trainer
   */
  getTrainer() {
    return this.trainer;
  }

  /**
   * Get auth token
   */
  getToken() {
    return this.token;
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    this.trainer = null;
    localStorage.removeItem('trainerToken');
    localStorage.removeItem('trainer');
    delete axios.defaults.headers.common['Authorization'];
  }
}

export default new TrainerAuthService();
