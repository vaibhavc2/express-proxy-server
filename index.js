const express = require("express");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const port = 3000;

const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;
const TMDB_TOKEN = process.env.TMDB_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

// Enable CORS for all origins (adjust as needed for production)
app.use(cors());

// Enable helmet for additional security measures
app.use(helmet());

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.redirect("/health");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    statusCode: 200,
    status: "OK",
    message: "Proxy server is running and healthy.",
  });
});

// Proxy TMDB requests
app.use("/tmdb/*", async (req, res) => {
  const endpoint = req.originalUrl.replace("/tmdb/", ""); // Get the endpoint from the URL
  if (!isProd)
    console.log(
      `Making request to TMDB API: https://api.themoviedb.org/3/${endpoint}`
    ); // Debug log

  // Configure the HTTPS proxy agent
  const httpsAgent = new HttpsProxyAgent(
    `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}`
  );

  try {
    const response = await axios({
      method: "GET",
      url: `https://api.themoviedb.org/3/${endpoint}`, // TMDB API URL
      params: {
        // api_key: TMDB_API_KEY, // Ensure you include the API key in the params
        ...req.query, // Forward any query parameters from the client
      },
      headers: {
        ...(TMDB_TOKEN ? { Authorization: `Bearer ${TMDB_TOKEN}` } : {}), // Add token if provided
        Accept: "application/json",
      },
      // data: req.body, // Forward the request body (for POST/PUT requests)
      // httpsAgent, // Use the proxy agent here
    });

    res.status(response.status).send(response.data); // Return only the response data
  } catch (error) {
    // Improved error handling
    console.error("Error fetching data from TMDB: ", {
      message: error.message,
      status: error.response ? error.response.status : "No response",
      statusText: error.response ? error.response.statusText : "No status text",
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || "Failed to fetch data from TMDB API",
    });
  }
});

// Start the server
app.listen(port, () => {
  if (!isProd)
    console.log(`Proxy server is running on http://localhost:${port}`);
});
