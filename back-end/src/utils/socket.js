const socketIo = require('socket.io-client');

const socket = socketIo(process.env.SOCKET_HOST);
// const socket = socketIo('http://localhost:6001');

socket.on('connect', () => {
  console.log('Connected to Socket Server');
});

socket.on('error', (error) => {
  console.error('Error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected from Socket Server');
});

socket.on('redisClient', (redisClient) => {
  console.log('Received custom event:', redisClient);
});

// Function to join a room
function joinRoom(extension_number, key) {
  const room = `${extension_number}_${key}`;
  socket.emit('joinRoom', { room });
  console.log(`Joined room: ${room}`);
}

// Function to emit to a room
function emitToRoom(extension_number, key, event, data) {
  const room = `${extension_number}_${key}`;
  socket.emit('roomEvent', { room, event, data });
  console.log(`Emitted ${event} to room ${room}`);
}

module.exports = { socket, joinRoom, emitToRoom };
