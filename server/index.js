const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const NodeClam = require("clamscan");
const { Storage } = require("@google-cloud/storage");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

app.use(cors());

const projectId = process.env.PROJECT_ID;
const bucketName = process.env.BUCKET_NAME;

// TODO: 
// - Add the functionality to create socket channels for multiple
// uploads at the same time, so that the progress of each upload can
// be tracked separately
// - Need to return metadata based on the file uploaded and the location 
// of the file in the bucket


// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// Set up multer upload configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000000 }, // 1000 MB file size limit
});

// NOT BEING USED CURRENTLY
// might be useful to make sure the system is ready to go
// creates the base socket connection
app.post("/init", (req, res) => {
  io.emit("status", "Initializing...")
  res.status(200).send({ msg: "Initialized" });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;

  console.time("upload all");

  // Scan file for viruses
  io.emit("status", "Scanning file for viruses...")
  const { isInfected, viruses } = await virusScan(file.path);
  if (isInfected) {
    console.log("Virus detected: ", viruses);
    return res.status(400).json({ msg: "Virus detected" });
  } else {
    console.log("No virus detected");
  }

  // Upload file to Google Cloud Storage and track progress
  io.emit("status", "Uploading to Google Cloud Storage...")
  await uploadFile(file);
  console.timeEnd("upload all");
  
  res.status(200).send({ msg: "File uploaded successfully" });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log("Server listening on port 3001");
});

// Scan file for viruses
const virusScan = async (file) => {
  console.log("Scanning file for viruses...");

  const ClamScan = new NodeClam().init({
    clamscan: {
      path: "/opt/homebrew/bin/clamscan",
      db: null,
      active: true,
    },
  });

  const { isInfected, viruses } = await ClamScan.then((clamscan) => {
    return clamscan.isInfected(file);
  });

  return { isInfected, viruses };
};

// Upload file to Google Cloud Storage and track progress
const uploadFile = async (file) => {
  const storage = new Storage({
    projectId: projectId,
  });

  // Set the bucket and file name
  const fileName = file.originalname;
  const localPath = file.path;
  const destination = fileName;

  // Set the options for the upload, including the metadata
  const options = {
    destination: destination,
    resumable: true, // Enable resumable uploads
    metadata: {
      contentType: file.mimetype,
    },
  };

  // Create a new upload stream for the file
  const stream = storage.bucket(bucketName).file(destination);

  // log start time
  console.time("upload");
  
  return new Promise((resolve, reject) => {
    const uploadStream = stream.createWriteStream(options);

    uploadStream.on("error", (err) => {
      reject(err);
      console.error(`Error uploading file: ${err}`);
    });
    uploadStream.on("finish", () => {
      console.log(`Successfully uploaded file ${fileName} to ${destination}`);
      console.timeEnd("upload");
      resolve();
    });

    uploadStream.on("progress", (progress) => {
      const percentage = Math.round((progress.bytesWritten / file.size) * 100);
      io.emit("progress", percentage);
    });

    fs.createReadStream(localPath).pipe(uploadStream);
  });
};
