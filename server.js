// 3100

const env = require('./config/envs.js')
const express = require('express');
const app = express();
app.set('trust proxy', 1);
const path = require('path');
const PORT = process.env.PORT || 3000;
const cors = require('cors')
const corsOptions = require('./config/corsOptions.js')
const mongoose = require('mongoose')
mongoose.set('debug', true);
const dotenv = require('dotenv').config()
const verifyJWT = require('./middleware/verifyJWT.js')
const cookieParser = require('cookie-parser')
const credentials = require('./middleware/credentials');
const bodyParser = require('body-parser');

//env settings
if (env.isProd) mongoose.set('debug', false);

//connet to the database
mongoose.connect(process.env.MONGODB_URI,
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
app.use('/refresh', require('./routes/refreshtoken.route.js'));


app.use(verifyJWT)
app.use('/tokentest', require('./routes/tokentest.route.js'));

app.get('/', (req, res) => {
  res.send(`Hello World!`);
});

app.listen(env.PORT, () => {
  console.log(`API running on port ${env.PORT} (${env.NODE_ENV})`);
});

/*
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
*/
//app.use(verifyJWT.unless({ path: ['/api/assets',,] }));
