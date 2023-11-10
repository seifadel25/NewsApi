const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI; // Use environment variable for MongoDB URI
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let collection; // Declare collection variable in outer scope

async function startServer() {
    try {
      await client.connect();
      collection = client.db("NewsDB").collection("NewsCollection");
      app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
    } catch (err) {
      console.error('Database connection failed', err);
      process.exit(1);
    }
  }
  
  startServer();
  

app.get("/api/news", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Format current date as 'YYYY-MM-DD'

    const cachedData = await collection.findOne({ cacheKey: today });
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);

    if (cachedData && cachedData.timestamp > thirtyMinutesAgo) {
      return res.json(cachedData.data);
    } else {
      const newData = await fetchDataFromAPI(); // Make sure this function is defined and fetches data from the API
      await collection.updateOne(
        { cacheKey: today },
        { $set: { data: newData, timestamp: new Date() } },
        { upsert: true }
      );

      return res.json(newData);
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

function modifyUrl(url) {
    if (url.includes('.com')) {
      return url.replace('.com', '.com.');
    } else if (url.includes('.net')) {
      return url.replace('.net', '.net.');
    }
    return url;
  }

async function fetchDataFromAPI() {
  // Implement the logic to fetch data from the API
  const options = {
    method: "GET",
    url: "https://arabic-news-api.p.rapidapi.com/aljazeera",
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": "arabic-news-api.p.rapidapi.com",
    },
  };
  const response = await axios.request(options);
  const articles = response.data.results
    .filter((article) => article.headline.trim() !== "")
    .slice(0, 10);

  const modifiedArticles = articles.map(article => {
    if (article.url) {
      article.url = modifyUrl(article.url);
    }
    if (article.image) {
      article.image = modifyUrl(article.image);
    }
    return article;
  });

  return modifiedArticles;
}
