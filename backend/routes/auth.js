const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');
const helpers = require('../utils/helpers');
const config = require('../config');

// ... (rest of the route handlers unchanged)

module.exports = router;

