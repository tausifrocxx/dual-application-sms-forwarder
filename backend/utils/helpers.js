const crypto = require('crypto');
const { logger } = require('./logger');

const helpers = {
    /**
     * Validate phone number format
     * @param {string} phoneNumber 
     * @returns {boolean}
     */
    isValidPhoneNumber: (phoneNumber) => {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    },

    /**
     * Generate a random string of specified length
     * @param {number} length 
     * @returns {string}
     */
    generateRandomString: (length = 32) => {
        return crypto.randomBytes(length).toString('hex');
    },

    /**
     * Sanitize phone number to consistent format
     * @param {string} phoneNumber 
     * @returns {string}
     */
    sanitizePhoneNumber: (phoneNumber) => {
        return phoneNumber.replace(/[^\d+]/g, '');
    },

    /**
     * Format date to local string with timezone
     * @param {Date} date 
     * @returns {string}
     */
    formatDate: (date) => {
        return new Date(date).toLocaleString('en-US', {
            timeZone: 'UTC',
            hour12: false
        });
    },

    /**
     * Check if a string might be an OTP message
     * @param {string} message 
     * @returns {boolean}
     */
    isOTPMessage: (message) => {
        const otpPatterns = [
            /\b\d{4,8}\b/,
            /verification code/i,
            /security code/i,
            /one[ -]?time/i,
            /otp/i
        ];
        return otpPatterns.some(pattern => pattern.test(message));
    },

    /**
     * Extract potential OTP from message
     * @param {string} message 
     * @returns {string|null}
     */
    extractOTP: (message) => {
        const otpMatch = message.match(/\b\d{4,8}\b/);
        return otpMatch ? otpMatch[0] : null;
    },

    /**
     * Safe JSON parse with error handling
     * @param {string} str 
     * @param {any} defaultValue 
     * @returns {any}
     */
    safeJSONParse: (str, defaultValue = null) => {
        try {
            return JSON.parse(str);
        } catch (error) {
            logger.error('JSON Parse Error:', error);
            return defaultValue;
        }
    },

    /**
     * Mask sensitive data in logs
     * @param {object} data 
     * @param {string[]} fieldsToMask 
     * @returns {object}
     */
    maskSensitiveData: (data, fieldsToMask = ['passcode', 'token', 'password']) => {
        const masked = { ...data };
        fieldsToMask.forEach(field => {
            if (masked[field]) {
                masked[field] = '********';
            }
        });
        return masked;
    },

    /**
     * Calculate time difference in human readable format
     * @param {Date} date 
     * @returns {string}
     */
    timeAgo: (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        
        return 'just now';
    }
};

module.exports = helpers;
