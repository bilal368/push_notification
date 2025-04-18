const logger = require('../config/logger');
const admin = require('firebase-admin');
const redisUsersDetails = require('../config/redisSearch'); // Redis helper

const serviceAccount = require('../../notifysip-firebase-adminsdk-lo5it-bad3f52906.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://notifysip.firestore.google.com', // Replace if needed
});

console.log('Firebase initialized successfully');

// Function to send a push notification
const sendNotification = async (token, title, body) => {
  const message = {
    notification: { title, body },
    token, // The recipient's device token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Function to listen for real-time database updates
const listenForDatabaseUpdates = () => {
  const database = admin.firestore();
  const ref = database.collection('softphone');

  ref.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      switch (change.type) {
        case 'added':
          if (data.uri) {
            redisUsersDetails.hset('pushUsers', data.uri, JSON.stringify(data), (err) => {
              if (err) console.error('Redis HSET error:', err);
              else console.log(`Stored document for ${data.uri} in Redis under pushUsers`);
            });
          }else{
            logger.error('Error occurred for:', data);
          }
          break;
        case 'modified':
          if (data.uri) {
            redisUsersDetails.hset('pushUsers', data.uri, JSON.stringify(data), (err) => {
              if (err) console.error('Redis HSET error:', err);
              else console.log(`Stored document for ${data.uri} in Redis under pushUsers`);
            });
          }else{
            logger.error('Error occurred for:', data);
          }
          break;
        case 'removed':
          redisUsersDetails.hdel('pushUsers', data.uri, (err) => {
            if (err) console.error('Redis HDEL error:', err);
            else console.log(`Deleted document for ${data.uri} from Redis under pushUsers`);
          });
          break;
      }
    });
  });
};

module.exports = { sendNotification, listenForDatabaseUpdates };
