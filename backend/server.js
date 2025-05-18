const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const config = require('./config');
const { logger, requestLogger } = require('./utils/logger');
const {
    errorHandler,
    notFoundHandler,
    validationErrorHandler,
    mongoErrorHandler,
    rateLimitErrorHandler
} = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth').default || require('./routes/auth');
const messageRoutes = require('./routes/messages').default || require('./routes/messages');
const deviceRoutes = require('./routes/devices').default || require('./routes/devices');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: config.security.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.api.rateLimit.windowMs,
    max: config.api.rateLimit.max,
    message: {
        error: true,
        message: 'Too many requests, please try again later.'
    }
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Request logging
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/devices', deviceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling
app.use(validationErrorHandler);
app.use(mongoErrorHandler);
app.use(rateLimitErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, config.mongodb.options)
    .then(() => {
        logger.info('Connected to MongoDB');
        
        // Initialize Admin if needed
        const Admin = require('./models/Admin');
        Admin.initializeDefault()
            .then(() => logger.info('Admin initialization checked'))
            .catch(err => logger.error('Admin initialization error:', err));
    })
    .catch(err => {
        logger.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.server.env} mode`);
});

// Graceful shutdown
const shutdown = () => {
    logger.info('Shutting down server...');
    mongoose.connection.close()
        .then(() => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        })
        .catch(err => {
            logger.error('Error closing MongoDB connection:', err);
            process.exit(1);
        });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
