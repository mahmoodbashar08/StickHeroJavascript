// userScore.js
import { axios } from "./axios";

export const getScore = async () => {
  try {
    const response = await axios.get("/userScore"); // Fetch user score from backend
    // Assuming response.data.user is an array, and you want the score of the first item
    const score = response.data.user[0]?.score || 0; // Safely access score
    return score;
  } catch (error) {
    console.error("Error fetching score:", error);
    return 0; // Return a default score in case of error
  }
};

export const setScore = async (score) => {
  try {
    await axios.post("/userScore", { score }); // Post score to the server
  } catch (error) {
    console.error("Error setting score:", error);
  }
};
