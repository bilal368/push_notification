const Redis = require('ioredis');
const { emitToRoom } = require('../utils/socket');

// Publisher Client (Already Exists)
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// Subscriber Client (New)
const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// Event when Redis subscriber connects
redisSubscriber.on('connect', () => {
  console.log('Subscribed to Redis Pub/Sub');
});

// Handle subscription errors
redisSubscriber.on('error', (error) => {
  console.error('Redis Subscription Error:', error);
});

// Subscribe to 'AGENTMONITOR_UPDATED' event
redisSubscriber.subscribe('AGENTMONITOR_UPDATED', (err, count) => {
  if (err) {
    console.error('Failed to subscribe:', err);
  } else {
    console.log(`Subscribed to ${count} channel(s).`);
  }
});

// Listen for messages from the channel
redisSubscriber.on('message', (channel, message) => {
  console.log(`Received message from ${channel}:`, message);
  // Convert message to JSON (if applicable)
  try {
    // Parse the message into an object
    const data = JSON.parse(message);
     // Define status messages
     const statusMap = {
      0: "UNAVAILABLE",
      1: "AVAILABLE",
      2: "RINGING",
      3: "DIALING",
      4: "ON_CALL",
      5: "ON_HOLD"
    };

    // Get status value
    const statusValue = data.json_string.status;
    // Determine status message
    data.status_message = statusMap[statusValue] || "UNKNOWN";  // Default to UNKNOWN if undefined

    data.key = data.key.replace("TENANT_", ""); 

    // Accessing the values
    // socket.emit('TENANT_ID', data);

  // Emit to the room using the connected socket
  emitToRoom(data.json_string.extension_number, data.key, 'TENANT_ID', data);

  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

module.exports = { redisClient, redisSubscriber };
