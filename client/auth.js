import { axios } from "./axios"; // Use ES module import

const checkAuthentication = async () => {
  try {
    // Extract initData from Telegram WebApp

    // Send initData to the server for validation using Authorization header
    const response = await axios.post("/auth/me", {});
    const result = response.data;
    if (!result.authenticated) {
      // Redirect the user if not authenticated
      window.location.href = "/unauthorized.html";
    } else {
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    // Redirect on error for safety
    // window.location.href = "/notfound.html";
  }
};

// Run the authentication check
checkAuthentication();
