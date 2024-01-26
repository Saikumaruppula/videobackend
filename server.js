const { MongoClient } = require("mongodb");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const cloudinary = require("cloudinary").v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Cloudinary configuration
cloudinary.config({ 
  cloud_name: process.env.NAME, 
  api_key: process.env.API, 
  api_secret: process.env.SECRET
});

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Files directory setup
const filesDirectory = path.join(__dirname, 'files');
const directoryExists = async (directory) => {
  try {
    await fs.access(directory);
  } catch (error) {
    await fs.mkdir(directory);
  }
};

directoryExists(filesDirectory);

// Function to upload file to Cloudinary
const sendToCloudinary = async (fileBuffer, type) => {
  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(fileBuffer, {
      resource_type: type === 'video' ? 'video' : 'image',
      folder: 'sai_info',
      timestamp: Math.floor(Date.now() / 1000),
    });

    return cloudinaryResponse.url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

// MongoDB connection setup
const mongoConnect = async () => {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
};

// Route to handle file uploads
app.post("/upload", upload.fields([{ name: 'thumbnail' }, { name: 'video' }]), async (req, res) => {
  try {
    const { title, description } = req.body;
    const thumbnailFiles = req.files["thumbnail"];
    const videoFiles = req.files["video"];

    if (thumbnailFiles.length > 0 && videoFiles.length > 0) {
      const thumbnailBuffer = thumbnailFiles[0].buffer;
      const videoBuffer = videoFiles[0].buffer;

      const image_url = await sendToCloudinary(thumbnailBuffer, "image");
      const video_url = await sendToCloudinary(videoBuffer, "video");

      const obj = {
        title: title,
        description: description,
        image_url: image_url,
        video_url: video_url
      };

      const client = await mongoConnect();
      const db = client.db("total");
      const collection = db.collection("users");
      
      await collection.insertOne(obj);
      console.log("Data sent successfully");

      // Close the MongoDB connection
      await client.close();
    }

    res.json({ message: "Data from the server received successfully!" });
  } catch (error) {
    console.error("Error handling file upload:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to retrieve data from MongoDB
app.get("/list", async (req, res) => {
  try {
    const client = await mongoConnect();
    const db = client.db("total");
    const collection = db.collection("users");
    
    const data = await collection.find({}).toArray();
    
    // Close the MongoDB connection
    await client.close();

    res.json({ data });
  } catch (error) {
    console.error("Error retrieving data from MongoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server only after establishing a connection to MongoDB
const startServer = async () => {
  try {
    await mongoConnect();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

// Call the function to start the server
startServer();
