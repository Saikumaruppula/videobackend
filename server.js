const { MongoClient } = require("mongodb");
require('dotenv').config();
const pass = encodeURIComponent("Saikumar@123");

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

 


// clodinary config
cloudinary.config({ 
  cloud_name: process.env.NAME, 
  api_key: process.env.API, 
  api_secret: process.env.SECRET
});

// multer code
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// files exists or not
const filesDirectory = path.join(__dirname, 'files');
const DirectoryExists = async (directory) => {
  try {
    await fs.access(directory);
  } catch (error) {
    await fs.mkdir(directory);
  }
};

DirectoryExists(filesDirectory);

/* data store in the mongodb */


const client= new MongoClient(uri);
const database="total"
const collection_name="users"
mongoConnect=async()=>{
  await client.connect().then(()=>{console.log("connected")}).catch((err)=>{console.log(err)})
}
const Datasend=async(obj)=>{
  
 const db=client.db(database);
 const collection=db.collection(collection_name);
  
 try{
  await collection.insertOne(obj)
  console.log("data sent successfully")
 }
 catch(err){
  console.log(err)
 }  

 const data = await collection.find({}).toArray();
 d=data
 
  }

  const dataReceive=async()=>{
    const db=client.db(database);
    const collection=db.collection(collection_name);
    const data = await collection.find({}).toArray();
    return data;
  }
// Function to upload video to Cloudinary
const sendToCloudinary = async (videoFilePath,type) => {
  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(videoFilePath, {
      resource_type: type==='video'?"video":"image",
      allowed_formats: type==='video'?['mp4', 'avi', 'mpg']:['jpg', 'jpeg', 'png', 'gif'],
      folder: 'sai_info',
      timestamp: Math.floor(Date.now() / 1000), // Use a Unix timestamp
    });

    
    // Clean up: delete the video file from the local server
    await fs.unlink(videoFilePath);
    return cloudinaryResponse["url"];
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
  }
};


// Use the upload middleware for handling file uploads
app.post("/upload", upload.fields([{ name: 'thumbnail' }, { name: 'video' }]),async (req, res) => {
 
  const { title, description } = req.body;
  const thumbnailFiles = req.files["thumbnail"]
  const videoFiles = req.files["video"]

  // Save the files to a specific location on your server
  if (thumbnailFiles.length > 0 && videoFiles.length > 0) {
    const thumbnailFilePath = path.join(filesDirectory, 'thumbnail.jpg');
    const videoFilePath = path.join(filesDirectory, 'video.mp4');

    await fs.writeFile(thumbnailFilePath, thumbnailFiles[0].buffer);
    await fs.writeFile(videoFilePath, videoFiles[0].buffer);



    // Upload the files to Cloudinary or your desired storage service
    
  
  const image_url=  await  sendToCloudinary(thumbnailFilePath,"image")
  const video_url= await  sendToCloudinary(videoFilePath,"video")
  const obj={
    "title":title,"description":description,"image_url":image_url,"video_url":video_url
  }
  Datasend(obj)
    
  }

  res.json({ message: "Data from the server received successfully!" });
});


app.get("/list",async(req,res)=>{
  const data=await dataReceive();
  
res.json({"data":data})
})





app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
