import { axios } from "./axios"; // Ensure correct import

// Function to display players in the list
const displayPlayers = async () => {
  document.getElementById("loading").style.display = "flex";

  try {
    // Fetching the top 9 players from the backend
    const response = await axios.get("/top9");
    const players = response.data.top9; // Assuming 'top9' is the key in the response

    // Fetch current user's rank data from the /user-rank endpoint
    const playerRankResponse = await axios.get("/user-rank");
    const userRank = playerRankResponse.data; // Assuming the response contains the current user rank

    // Insert players dynamically into the #players-list element
    const playersList = document.getElementById("players-list");
    const playersList1 = document.getElementById("players-list1");

    // Display top players
    players.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.classList.add("player");

      playerDiv.innerHTML = `
        <span class="rank">${player.rank}</span>
        <img src="${
          player.photo_url || "https://via.placeholder.com/40"
        }" alt="${player.username.charAt(0).toUpperCase()}" class="avatar">
        <div class="details">
          <div>${player.username}</div>
          <div class="stars">${player.score}</div>
        </div>
      `;

      playersList.appendChild(playerDiv);
    });

    // Get the current user data from Telegram WebApp
    const userData = window.Telegram.WebApp.initDataUnsafe;

    // Extract user data (e.g., username, first_name, last_name, and photo_url)
    const { id, username, first_name, last_name, photo_url } = userData.user;

    // Display current user's rank and avatar
    const currentUserDiv = document.createElement("div");
    currentUserDiv.classList.add("player");
    currentUserDiv.innerHTML = `
      <span class="rank">${userRank.rank}</span>
      <img src="${
        photo_url || "https://via.placeholder.com/40"
      }" alt="${username.charAt(0).toUpperCase()}" class="avatar">
      <div class="details">
        <div>${username || "Unknown"}</div>
        <div class="stars">Your Score: ${
          userRank.score
        }</div> <!-- Assuming score is 10 for now -->
      </div>
    `;

    playersList1.appendChild(currentUserDiv);
    document.getElementById("loading").style.display = "none";

    document.getElementById("container").style.display = "block";
  } catch (error) {
    console.error("Error fetching players:", error);
  }
};

// Call the function to display the players when the page is loaded
document.addEventListener("DOMContentLoaded", displayPlayers);
