import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({ baseURL: API_URL, withCredentials: true });

// Add a request interceptor for adding auth token
client.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    // Get token from cookies
    const token = Cookies.get('access_token'); // Get token from cookies
    if (token) { // Set the header only if the token exists
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for handling errors
client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error);
      return Promise.reject(new Error('Request timeout. Please check your internet connection.'));
    }

    // if (error.response.status === 401 || error.response.status === 403 || error.response.status === 404) {
    //   console.error('Unauthorized:', error);
    //   const cookiesToRemove = ['connect.sid', 'user.id', 'user.email', 'XSRF-TOKEN'];

    //   // Remove all specified cookies
    //   cookiesToRemove.forEach(cookie => Cookies.remove(cookie));
    //   window.location.href = '/login';
    //   return Promise.reject(new Error('Unauthorized. Please check your credentials and try again.'));
    // }

    if (!error.response) {
      console.error('Network Error Details:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      return Promise.reject(new Error('Network error. Please check your internet connection and try again.'));
    }

    return Promise.reject(error);
  }
);

export default client; 