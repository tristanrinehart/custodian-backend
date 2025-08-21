// 3100
const environment = process.env.NODE_ENV || 'development';
let allowedOrigins;

console.log(`Environment: ${environment}`);
console.log(`Allowed Origins: ${process.env.ALLOWED_ORIGINS_DEV} | ${process.env.ALLOWED_ORIGINS_PROD}`);

if (environment === 'development') {
  allowedOrigins = [process.env.ALLOWED_ORIGINS_DEV]; // Load from environment variable
} else if (environment === 'production') {
  allowedOrigins = [process.env.ALLOWED_ORIGINS_PRO]; // Load from environment variable
} else {
  // Default or throw an error for unsupported environments
  allowedOrigins = ['http://localhost:5173', 'https://custodian-frontend.onrender.com']; // Example default
}


module.exports = allowedOrigins;
