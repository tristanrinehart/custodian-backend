// 3100
const environment = process.env.NODE_ENV || 'development';
let allowedOrigins;

if (environment === 'development') {
  allowedOrigins = process.env.ALLOWED_ORIGINS_DEV; // Load from environment variable
} else if (environment === 'production') {
  allowedOrigins = process.env.ALLOWED_ORIGINS_PROD; // Load from environment variable
} else {
  // Default or throw an error for unsupported environments
  allowedOrigins = 'https://custodian.onrender.com'; // Example default
}


module.exports = allowedOrigins;
