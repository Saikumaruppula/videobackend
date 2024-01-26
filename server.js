const { MongoClient } = require("mongodb");
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Cloudinary config
cloudinary.config({ 
  cloud_name: process.env.NAME, 
  api_key: process.env.API, 
  api_secret: process.env.SECRET
});

// Multer code
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Files exist or not
const filesDirectory = path.join(__dirname, 'files');
const directoryExists = async (directory) => {
  try {
    await fs.access(directory);
  } catch (error) {
    await fs.mkdir(directory);
  }
};

directoryExists(filesDirectory);

// Function to upload video to Cloudinary
const sendToCloudinary = async (videoFilePath, type) => {
  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(videoFilePath, {
      resource_type: type === 'video' ? 'video' : 'image',
      allowed_formats: type === 'video' ? ['mp4', 'avi', 'mpg'] : ['jpg', 'jpeg', 'png', 'gif'],
      folder: 'sai_info',
      timestamp: Math.floor(Date.now() / 1000),
    });

    await fs.unlink(videoFilePath);
    return cloudinaryResponse.url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};

const password=encodeURIComponent(process.env.PASSWORD);
const uri='mongodb+srv://20r01a05b4:Saikumar%40123@cluster0.dm5qrsu.mongodb.net/?retryWrites=true&w=majority'


const mongoConnect = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
};

const dataSend = async (obj) => {
  const client = await mongoConnect();
  const db = client.db("total");
  const collection = db.collection("users");
  try {
    await collection.insertOne(obj);
    console.log("Data sent successfully");
  } catch (err) {
    console.error(err);
  } finally {
 
  }
};

const dataReceive = async () => {
  console.log("receving the data")
  const client = await mongoConnect();
  const db = client.db("total");
  const collection = db.collection("users");
  const data = await collection.find({}).toArray();
 // Close the client connection after retrieving data
  return data;
};

app.post("/upload", upload.fields([{ name: 'thumbnail' }, { name: 'video' }]), async (req, res) => {
  const { title, description } = req.body;
  console.log("post request");
  const thumbnailFiles = req.files["thumbnail"];
  const videoFiles = req.files["video"];

  if (thumbnailFiles.length > 0 && videoFiles.length > 0) {
    const thumbnailFilePath = path.join(filesDirectory, 'thumbnail.jpg');
    const videoFilePath = path.join(filesDirectory, 'video.mp4');

    await fs.writeFile(thumbnailFilePath, thumbnailFiles[0].buffer);
    await fs.writeFile(videoFilePath, videoFiles[0].buffer);

    try {
      const image_url = await sendToCloudinary(thumbnailFilePath, "image");
      const video_url = await sendToCloudinary(videoFilePath, "video");
      const obj = {
        "title": title,
        "description": description,
        "image_url": image_url,
        "video_url": video_url
      };

      await dataSend(obj);
      res.json({ message: "Data from the server received successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Error processing the request" });
    }
  } else {
    res.status(400).json({ error: "Invalid request payload" });
  }
});

app.get("/list", async (req, res) => {
  console.log("error in receiving data")
  try {
    const data = await dataReceive();
    res.json({ "data": data });
  } catch (error) {
    res.status(500).json({ error: "Error retrieving data from MongoDB" });
  }
});

const startServer = async () => {
  try {
    await mongoConnect(); // Ensure MongoDB connection is established
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error starting the server:", err);
  }
};

startServer();
