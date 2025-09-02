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
//app.use(ensureCsrfCookie);
app.use(requireCsrf);


// routes
app.use('/api/users', require('./routes/user.route'));
app.use('/api/refresh', require('./routes/refreshtoken.route')); // change to POST
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
