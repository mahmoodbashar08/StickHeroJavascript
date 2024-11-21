import Axios from "axios";
import storage from "./storage";

function authRequestInterceptor(config) {
  const token = storage.getToken(); // Retrieve the token from your storage
  if (token) {
    // Add the token to the Authorization header
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`, // Using Bearer token format
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true", // Add ngrok-skip-browser-warning header
    };
  } else {
    // If no token, set empty Authorization header
    config.headers = {
      ...config.headers,
      Authorization: ``,
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
    };
  }

  return config; // Return the modified config
}

export const axios = Axios.create({
  baseURL: "https://4fv0hkkm-3000.euw.devtunnels.ms",
});

// Add the interceptor to include the token in request headers
axios.interceptors.request.use(authRequestInterceptor);
