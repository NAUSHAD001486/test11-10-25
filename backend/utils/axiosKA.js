// Axios with Keep-Alive agent for faster requests
const axios = require('axios');
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 10000 });

const axiosKA = axios.create({ 
  httpAgent, 
  httpsAgent 
});

module.exports = axiosKA;

