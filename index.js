const express = require('express')
const mongoose = require('mongoose');
const Asset = require("./models/asset.model.js"); // Import the Asset model
const assetRoute = require("./routes/asset.route.js"); // Import the asset routes
const userRoute = require("./routes/user.route.js"); // Import the asset routes
const app = express()
const port = process.env.PORT || 6000;
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require("dotenv").config();
mongoose.set('debug', true);
const verifyToken = require('./middleware/auth.middleware');

// middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());
app.use(verifyToken);


//routes
app.use("/api/assets", assetRoute);
app.use("/api/users", userRoute);

// Example endpoint to test the server
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
}); 



mongoose.connect(process.env.DATABASE,
  {
    //useNewUrlParser: true, //DEPRECATED
    //useUnifiedTopology: true //DEPRECATED
  }
)
.then(() => {
  console.log("Connected to MongoDB successfully");
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})
.catch((err) => {
  console.error("Error connecting to MongoDB:", err);
});



//mongoose.connect("mongodb+srv://custodian-db-user:HkJBumRUJOll1aqf@cluster0.6fgkgxs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")

//user:custodian-db-user