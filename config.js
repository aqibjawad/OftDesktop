const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
    API_BASE_URL: process.env.API_BASE_URL
};
