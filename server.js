// 3100

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;
const cors = require('cors')
const corsOptions = require('./config/corsOptions.js')
const mongoose = require('mongoose')
mongoose.set('debug', true);
const dotenv = require('dotenv')
const verifyJWT = require('./middleware/verifyJWT.js')
const cookieParser = require('cookie-parser')
const credentials = require('./middleware/credentials');
const bodyParser = require('body-parser');

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross-Origin Resource Sharing (CORS) setup
app.use(cors(corsOptions))

// Built-in middleware to handle urlencoded data 
app.use(express.urlencoded({ extended: false}))

// Middleware to parse JSON data
app.use(express.json());
app.use(bodyParser.json());

// Middleware to parse cookies
app.use(cookieParser());


//routes
app.use('/api/assets', require('./routes/asset.route.js'));
app.use('/api/users', require('./routes/user.route.js'));
/*
app.use('/signup', require('./routes/signup.route.js'));
app.use('/signin', require('./routes/signin.route.js'));
app.use('/signout', require('./routes/signout.route.js'));
*/

app.use('/refresh', require('./routes/refreshtoken.route.js'));


app.use(verifyJWT)
app.use('/tokentest', require('./routes/tokentest.route.js'));

app.get('/', (req, res) => {
  res.send(`Hello World!`);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

mongoose.connect(process.env.DATABASE,
  {
    //useNewUrlParser: true, //DEPRECATED
    //useUnifiedTopology: true //DEPRECATED
  }
)
.then(() => {
  console.log("Connected to MongoDB successfully");
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error("Error connecting to MongoDB:", err);
});