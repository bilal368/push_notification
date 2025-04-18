const redis = require('ioredis');

const redisUsersDetails = redis.createClient({
    host: process.env.REDISSEARCH_HOST,
    port: process.env.REDISSEARCH_PORT
  });
  
  redisUsersDetails.on('connect', () => {
   console.log('Connected to Redis Search Client');
 });

module.exports = redisUsersDetails;