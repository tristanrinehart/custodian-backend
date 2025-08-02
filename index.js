const express = require('express')
const mongoose = require('mongoose');
const Asset = require("./models/asset.model.js"); // Import the Asset model
const assetRoute = require("./routes/asset.route.js"); // Import the asset routes
const app = express()
const port = 3000

// middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//routes
app.use("/api/assets", assetRoute);

// Example endpoint to test the server
app.get('/', (req, res) => {
  res.send('Hello from Node API Server !!')
}); 



mongoose.connect("mongodb+srv://custodian-db-user:HkJBumRUJOll1aqf@cluster0.6fgkgxs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
.then(() => {
  console.log("Connected to MongoDB successfully");
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})
.catch((err) => {
  console.error("Error connecting to MongoDB:", err);
});
//user:custodian-db-user
//password:HkJBumRUJOll1aqf