// 3100
const { env } = require('./config/env');
const express = require('express');
const credentials = require('./middleware/credentials')
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { requireCsrf, ensureCsrfCookie } = require('./middleware/csrf');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // if behind a proxy / LB
}

// middleware order matters
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(credentials)
app.use(ensureCsrfCookie);
app.use(requireCsrf);



// Issue CSRF cookie early so SPA can read it


// Public auth routes
//app.use('/', require('./routes/auth.route'));




// routes
app.use('/api/users', require('./routes/user.route'));
app.use('/api/refresh', require('./routes/refreshtoken.route')); // change to POST
app.use('/api/signout', require('./routes/signout.route'));      // change to POST
app.use('/api/assets', require('./routes/asset.route'));

app.get('/healthz', (_, res) => res.send('ok'));

// for testing
app.post('/api/debug/echo', (req, res) => {
  res.json({ headers: req.headers, body: req.body });
});
// DB & start
mongoose.set('debug', !env.isProd);
mongoose.connect(env.MONGODB_URI).then(() => {
  const host = '0.0.0.0';
  app.listen(env.PORT, host, () => {
    console.log(`API running on http://${host}:${env.PORT} (${env.NODE_ENV})`);
  });
}).catch(err => {
  console.error('Mongo connect error:', err);
  process.exit(1);
});



/*
const { env }= require('./config/env.js')
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
const HOST = process.env.HOST


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

app.listen(PORT, HOST, () => {
  console.log(`API running on ${HOST}:${PORT} (${env.NODE_ENV})`);
});
*/