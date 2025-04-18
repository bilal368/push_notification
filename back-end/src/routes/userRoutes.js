//Express.js registering
const express = require('express');
//Initializing route element
const routes = express.Router();
//Body Parser for parsing data send from page
const bodyParser = require('body-parser');
//Body Parser for parsing data send from page
routes.use(bodyParser.urlencoded({ extended: false }));
const userLogin = require('../controllers/userController');
const { authenticateToken, constantsAuthenticateToken } = require('../middlewares/authMiddleware');
/****************Start of GET & POST actions defenition*******************/

// Web Dialer Login
routes.post('/webDialerLogin', constantsAuthenticateToken , userLogin.webDialerLogin); 
// Update Users To Redis
routes.post('/updateUsersToRedis', constantsAuthenticateToken , userLogin.updateUsersToRedis); 
// Get Dialer History
routes.post('/callHistory', authenticateToken , userLogin.getWebDialerHistory); 
// Get Web Dialer History
routes.post('/phoneAddress', authenticateToken , userLogin.phoneAddress);  
// Add Favorite
routes.post('/addFavorite', authenticateToken , userLogin.addFavorite);  
// Fetch countCalls
routes.post('/countCalls', authenticateToken , userLogin.countCalls);  
// Fetch presence
routes.post('/fetchPresenceStatus', authenticateToken , userLogin.fetchPresenceStatus);  
/****************End of GET & POST actions defenition*******************/

module.exports = routes;