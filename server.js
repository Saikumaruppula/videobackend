const { MongoClient } = require("mongodb");
require('dotenv').config();
const pass = encodeURIComponent(process.env.PASSWORD);

const uri = `mongodb+srv://20r01a05b4:${pass}@cluster0.dm5qrsu.mongodb.net/?retryWrites=true&w=majority`;

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

// cloudinary config
cloudinary.config({ 
  cloud_name: process.env.NAME, 
  api_key: process.env.API, 
  api_secret: process.env.SECRET
});

// multer code
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// files exist or not
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
  }
};


const mongoConnect = async () => {

  try {
    const client = new MongoClient(uri);
   await client.connect();
    console.log("Connected to MongoDB");
    return client;

    
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err
  }
};


const dataSend = async (client, obj) => {
   const client=await mongoConnect();
  const db = client.db("total");
  const collection = db.collection("users");
  try {
    await collection.insertOne(obj);
    console.log("Data sent successfully");
  } catch (err) {
    console.log(err);
  } finally {
    await client.close(); // Close the client connection
  }
};

const dataReceive = async (client) => {
  const client= await mongoConnect();
  const db = client.db("total");
  const collection = db.collection("users");
  const data = await collection.find({}).toArray();
  await client.close(); // Close the client connection after retrieving data
  return data;
};

app.post("/upload", upload.fields([{ name: 'thumbnail' }, { name: 'video' }]), async (req, res) => {
  const { title, description } = req.body;
  const thumbnailFiles = req.files["thumbnail"];
  const videoFiles = req.files["video"];

  if (thumbnailFiles.length > 0 && videoFiles.length > 0) {
    const thumbnailFilePath = path.join(filesDirectory, 'thumbnail.jpg');
    const videoFilePath = path.join(filesDirectory, 'video.mp4');

    await fs.writeFile(thumbnailFilePath, thumbnailFiles[0].buffer);
    await fs.writeFile(videoFilePath, videoFiles[0].buffer);

    const image_url = await sendToCloudinary(thumbnailFilePath, "image");
    const video_url = await sendToCloudinary(videoFilePath, "video");
    const obj = {
      "title": title,
      "description": description,
      "image_url": image_url,
      "video_url": video_url
    };

    const client = await mongoConnect();
    await dataSend(client, obj);
  }

  res.json({ message: "Data from the server received successfully!" });
});

app.get("/list", async (req, res) => {
  const client = await mongoConnect();
  const data = await dataReceive(client);
  res.json({ "data": data });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
