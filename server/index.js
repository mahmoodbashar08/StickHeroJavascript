const express = require("express");
const bodyParser = require("body-parser");
const db = require("./database");
const CryptoJS = require("crypto-js");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

// Replace with your bot's token
const botToken = process.env.TELEGRAM_BOT_TOKEN;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const userId = (token) => {
  const initData = new URLSearchParams(token);
  const user = JSON.parse(decodeURIComponent(initData.get("user")));

  const { id, username, first_name, last_name, photo_url } = user;
  return {
    id,
    username,
    first_name,
    last_name,
    photo_url,
  };
};

const verifyTelegramWebAppData = (telegramInitData) => {
  const initData = new URLSearchParams(telegramInitData);
  const hash = initData.get("hash");
  const dataToCheck = [];

  initData.sort();
  initData.forEach(
    (val, key) => key !== "hash" && dataToCheck.push(`${key}=${val}`)
  );

  const secret = CryptoJS.HmacSHA256(botToken, "WebAppData");
  const _hash = CryptoJS.HmacSHA256(dataToCheck.join("\n"), secret).toString(
    CryptoJS.enc.Hex
  );

  return hash === _hash;
};

app.post("/auth/me", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the 'Authorization' header

  const isValid = verifyTelegramWebAppData(token);

  if (!isValid) {
    return res
      .status(403)
      .json({ authenticated: false, message: "Invalid data" });
  }

  const initData = new URLSearchParams(token);
  const user = JSON.parse(decodeURIComponent(initData.get("user")));

  const { id, username, first_name, last_name } = user;

  // Check if the user exists in the database
  const query = `SELECT * FROM users WHERE telegram_id = ?`;

  db.get(query, [id], (err, existingUser) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res
        .status(500)
        .json({ authenticated: false, message: "Database error" });
    }

    if (!existingUser) {
      // User not found, insert the user into the database
      const insertQuery = `INSERT INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)`;

      db.run(
        insertQuery,
        [id, username, first_name, last_name],
        function (err) {
          if (err) {
            console.error("Error inserting new user:", err);
            return res
              .status(500)
              .json({ authenticated: false, message: "Error adding new user" });
          }

          console.log(`New user added with ID: ${id}`);
          res.json({
            authenticated: true,
            user: { id, username, first_name, last_name },
          });
        }
      );
    } else {
      console.log(`User already exists with ID: ${id}`);
      res.json({ authenticated: true, user: existingUser });
    }
  });
});

app.get("/userScore", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the 'Authorization' header
  const { id, username, first_name, last_name, photo_url } = userId(token);
  if (id) {
    const query = "SELECT * FROM users WHERE telegram_id = ?";
    db.all(query, [(telegram_id = id)], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error fetching top users", details: err.message });
      }

      res.json({ user: rows });
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

// **Endpoint 2: Save or Update User's Score**
app.post("/userScore", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the 'Authorization' header
  const { id, username, first_name, last_name, photo_url } = userId(token);
  const { score } = req.body;

  const query = "UPDATE users SET score = ? WHERE telegram_id = ?";
  db.run(query, [score, id], function (err) {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error updating score", details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "Score updated successfully" });
  });
});

// Get user by Telegram ID
app.get("/user/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;

  const query = `
        SELECT id, telegram_id, username, first_name, last_name, score
        FROM users
        WHERE telegram_id = ?
    `;
  db.get(query, [telegram_id], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching user", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(row);
  });
});

app.get("/top9", async (req, res) => {
  const query =
    "SELECT telegram_id, username, first_name, last_name, score FROM users ORDER BY score DESC LIMIT 9";

  db.all(query, [], async (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching top users", details: err.message });
    }

    // Function to get profile photo URL for a user
    const getProfilePicture = async (userId) => {
      try {
        const response = await axios.get(
          `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}`
        );
        const profilePhotos = response.data.result.photos;
        if (profilePhotos && profilePhotos.length > 0) {
          const photoFileId = profilePhotos[0][0].file_id;
          const fileResponse = await axios.get(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${photoFileId}`
          );
          const filePath = fileResponse.data.result.file_path;
          return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        }
        return null; // No profile picture found
      } catch (error) {
        console.error("Error fetching profile picture:", error);
        return null; // If there's an error, return null
      }
    };

    // Add rank and profile picture URL to each user
    const top9WithRank = await Promise.all(
      rows.map(async (row, index) => {
        const profilePictureUrl = await getProfilePicture(row.telegram_id);
        return {
          rank: index + 1, // Ranking starts at 1
          telegram_id: row.telegram_id,
          username: row.username,
          first_name: row.first_name,
          last_name: row.last_name,
          score: row.score,
          photo_url: profilePictureUrl, // Add profile picture URL
        };
      })
    );

    res.json({ top9: top9WithRank });
  });
});

// **Endpoint 5: Get User's Rank**
app.get("/user-rank", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the 'Authorization' header
  const { id, username, first_name, last_name, photo_url } = userId(token);

  // Get the user's score
  const userQuery = "SELECT score FROM users WHERE telegram_id = ?";
  db.get(userQuery, [id], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Error fetching score", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate the rank based on the score
    const rankQuery = "SELECT COUNT(*) AS rank FROM users WHERE score > ?";
    db.get(rankQuery, [row.score], (err, rankRow) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error fetching rank", details: err.message });
      }
      res.json({ rank: rankRow.rank + 1, score: row.score });
    });
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
