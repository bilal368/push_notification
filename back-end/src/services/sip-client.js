// services/sip-client.js
const JsSIP = require('jssip');
const wrtc = require('wrtc');
const redisUsersDetails = require('../config/redisSearch'); 
// Function to get user details from Redis dynamically
const getUserDetailsFromRedis = async () => {
  return new Promise((resolve, reject) => {
    redisUsersDetails.hgetall('pushUsers', (err, users) => {
      if (err) {
        reject(`Redis HGETALL error: ${err}`);
      } else {
        const parsedUsers = Object.keys(users).map(key => JSON.parse(users[key]));
        resolve(parsedUsers);
      }
    });
  });
};

// Assign WebRTC APIs to global scope for JsSIP compatibility
global.window = global;
global.navigator = {
  mediaDevices: {
    getUserMedia: wrtc.getUserMedia,
    enumerateDevices: async () => [{ kind: 'audioinput', label: 'Mock Microphone', deviceId: 'default' }],
  },
};
global.RTCPeerConnection = wrtc.RTCPeerConnection;
global.RTCSessionDescription = wrtc.RTCSessionDescription;
global.RTCIceCandidate = wrtc.RTCIceCandidate;

// Function to create a SIP client
const createSIPClient = (account, sendNotification) => {
  const configuration = {
    uri: `sip:${account.uri}`,
    sockets: [new JsSIP.WebSocketInterface('wss://proxyhtz.st.xlogix.ca:443')],
    authorization_user: account.user,
    password: account.sipPassword,
    register: true,
  };

  const userAgent = new JsSIP.UA(configuration);

  userAgent.on('newRTCSession', (data) => {
    const session = data.session;
    if (session.direction === 'incoming') {
      const caller = session.remote_identity.uri;
      const callee = session.local_identity.uri;

      console.log(`Incoming call on ${account.uri} from ${caller}`);
      sendNotification(account.phoneToken, 'Incoming Call', `Call from ${caller}`);

      session.answer({ mediaConstraints: { audio: true, video: false } });

      session.on('ended', () => console.log(`Call ended on ${account.uri}`));
      session.on('failed', (error) => console.error(`Call failed on ${account.uri}:`));
      // session.on('failed', (error) => console.error(`Call failed on ${account.uri}:`, error));
    }
  });

  userAgent.start();
  return userAgent;
};

// Initialize SIP clients for all accounts
// Function to initialize SIP clients for all accounts
const initializeSIPClients = async (sendNotification) => {
  const sipAccounts = await getUserDetailsFromRedis();
  return sipAccounts.map((account) => createSIPClient(account, sendNotification));
};

module.exports = { initializeSIPClients };
