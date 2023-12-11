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
let collection, EnCollection; // Declare collection variable in outer scope

async function startServer() {
  try {
    await client.connect();
    collection = client.db("NewsDB").collection("NewsCollection");
    EnCollection = client.db("NewsDB").collection("EnNews");
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Database connection failed", err);
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
  if (url.includes(".com")) {
    return url.replace(".com", ".com.");
  } else if (url.includes(".net")) {
    return url.replace(".net", ".net.");
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

  const modifiedArticles = articles.map((article) => {
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
setInterval(fetchAndStoreData, 30 * 60 * 1000); // 30 minutes

async function fetchAndStoreData() {
  try {
    const data = await fetchDataFromAPI();
    await EnCollection.deleteMany({});
    await collection.insertOne({
      timestamp: new Date(),
      data: data,
    });
    console.log("Data fetched and stored:", new Date());
  } catch (error) {
    console.error("Error fetching or storing data:", error);
  }
}
//////////////////////////English News/////////////////////////////
app.get("/api/EnNews", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Format current date as 'YYYY-MM-DD'

    const cachedData = await EnCollection.findOne({ cacheKey: today });
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);

    if (cachedData && cachedData.timestamp > thirtyMinutesAgo) {
      return res.json(cachedData.data);
    } else {
      const newData = await fetchDataFromAPI2(); // Make sure this function is defined and fetches data from the API
      await EnCollection.updateOne(
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

async function fetchDataFromAPI2() {
  // Implement the logic to fetch data from the API
  const options = {
    method: "POST",
    url: "https://newsnow.p.rapidapi.com/newsv2",
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY, // Use environment variable for security
      "X-RapidAPI-Host": "newsnow.p.rapidapi.com",
    },
    data: {
      query: "Palestine",
      page: 1,
      time_bounded: false,
      from_date: "01/02/2023",
      to_date: "05/06/2021",
      location: "",
      category: "",
      source: "",
    },
  };

  // Making the POST request
  const response = await axios.request(options);
  const articles = response.data.news
    .filter((article) => article.title.trim() !== "")
    .slice(0, 15);

  const modifiedArticles = articles.map((article) => {
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
async function fetchAndStoreData2() {
  try {
    const data = await fetchDataFromAPI2();
    await EnCollection.deleteMany({});
    await EnCollection.insertOne({
      timestamp: new Date(),
      data: data,
    });

    console.log("Data fetched, previous data deleted, and new data stored:", new Date());
  } catch (error) {
    console.error("Error fetching or storing data:", error);
  }
}

// app.get("/api/EnNews", async (req, res) => {
//   try {
//     // New fetch request configuration
//     const options = {
//       method: 'POST',
//       url: 'https://newsnow.p.rapidapi.com/newsv2',
//       headers: {
//         'content-type': 'application/json',
//         'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, // Use environment variable for security
//         'X-RapidAPI-Host': 'newsnow.p.rapidapi.com'
//       },
//       data: {
//         query: 'Palestine',
//         page: 1,
//         time_bounded: false,
//         from_date: '01/02/2023',
//         to_date: '05/06/2021',
//         location: '',
//         category: '',
//         source: ''
//       }
//     };

//     // Making the POST request
//     const response = await axios.request(options);
//     const newsData = response.data;

//     // Insert the fetched news data into the MongoDB collection
//     await EnCollection.insertMany(newsData.news, (err, result) => {
//       if (err) {
//         res.status(500).send("Error inserting news data into MongoDB");
//       } else {
//         res.status(200).send(`Successfully inserted ${result.insertedCount} news items`);
//       }
//     });

//   } catch (error) {
//     console.error("Error fetching news data:", error);
//     res.status(500).send("Error fetching news data");
//   }
// });

fetchAndStoreData();
fetchAndStoreData2();
