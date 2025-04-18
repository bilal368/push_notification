const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ 
      filename: path.join(logDir, 'app.log'), 
      level: 'info' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    })
  ]
});

module.exports = logger;
