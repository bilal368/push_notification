const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http'); 
const userRoutes = require('./routes/userRoutes');
const { listenForDatabaseUpdates, sendNotification } = require('./services/firebase');
const { initializeSIPClients } = require('./services/sip-client');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use("/api", userRoutes);

// Start Firebase database listener
listenForDatabaseUpdates();

// Start SIP clients
initializeSIPClients(sendNotification);

// ✅ Export both `app` and `server`
module.exports = { app };
