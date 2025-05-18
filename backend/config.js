require('dotenv').config();

const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
    },

    // MongoDB Configuration
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sms-forwarder',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        expiresIn: process.env.JWT_EXPIRATION || '24h'
    },

    // Default Admin Configuration
    admin: {
        defaultNumber: process.env.DEFAULT_ADMIN_NUMBER || '+1234567890',
        defaultPasscode: process.env.DEFAULT_ADMIN_PASSCODE || 'admin123'
    },

    // API Configuration
    api: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.API_RATE_LIMIT) || 100
        }
    },

    // Security Configuration
    security: {
        bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8000'
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        format: process.env.LOG_FORMAT || 'dev'
    },

    // Initialize configuration
    init() {
        // Validate required environment variables
        const requiredEnvVars = [
            'MONGODB_URI',
            'JWT_SECRET'
        ];

        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missingEnvVars.length > 0) {
            console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
            console.warn('Using default values for missing variables');
        }

        // Log configuration in development
        if (this.server.env === 'development') {
            console.log('Server Configuration:', {
                ...this,
                jwt: { ...this.jwt, secret: '[HIDDEN]' },
                admin: { ...this.admin, defaultPasscode: '[HIDDEN]' }
            });
        }
    }
};

// Initialize configuration
config.init();

module.exports = config;
