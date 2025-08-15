// 3100

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3100;
const cors = require('cors')
const corsOptions = require('./config/corsOptions.js')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const verifyJWT = require('./middleware/verifyJWT.js')
const cookieParser = require('cookie-parser')


// Cross-Origin Resource Sharing (CORS) setup
app.use(cors(corsOptions))

// Built-in middleware to handle urlencoded data 
app.use(express.urlencoded({ extended: false}))

// Middleware to parse JSON data
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());


//routes
app.use('/signup', require('./routes/signup.route.js'));
app.use('/signin', require('./routes/signin.route.js'));
app.use('/refresh', require('./routes/refreshtoken.route.js'));

app.use(verifyJWT)
app.use('/tokentest', require('./routes/tokentest.route.js'));

app.get('/', (req, res) => {
  res.send(`Hello World!`);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});