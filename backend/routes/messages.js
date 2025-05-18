const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Device = require('../models/Device');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');
const helpers = require('../utils/helpers');

// ... (rest of the route handlers unchanged)

module.exports = router;

// Get all messages with pagination and filtering
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            deviceId,
            sender,
            startDate,
            endDate,
            type
        } = req.query;

        // Build query
        const query = {};
        if (deviceId) query.deviceId = deviceId;
        if (sender) query.sender = new RegExp(sender, 'i');
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }
        if (type === 'otp') query.content = { $regex: /(otp|verification|code)/i };

        // Execute query with pagination
        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        // Get total count
        const total = await Message.countDocuments(query);

        // Format messages
        const formattedMessages = messages.map(msg => ({
            ...msg,
            timeAgo: helpers.timeAgo(msg.timestamp),
            isOTP: helpers.isOTPMessage(msg.content),
            otp: helpers.isOTPMessage(msg.content) ? helpers.extractOTP(msg.content) : null
        }));

        res.json({
            messages: formattedMessages,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total
        });

    } catch (error) {
        logger.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Receive new message from Android app
router.post('/', async (req, res) => {
    try {
        const { sender, content, timestamp, deviceId } = req.body;

        // Validate required fields
        if (!sender || !content || !deviceId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate phone number
        if (!helpers.isValidPhoneNumber(sender)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Create new message
        const message = new Message({
            sender: helpers.sanitizePhoneNumber(sender),
            content,
            timestamp: timestamp || Date.now(),
            deviceId,
            isOTP: helpers.isOTPMessage(content)
        });

        await message.save();

        // Update device stats
        await Device.findOneAndUpdate(
            { deviceId },
            { 
                $inc: { 'stats.messagesReceived': 1 },
                $set: { 
                    'stats.lastMessageAt': new Date(),
                    lastSeen: new Date()
                }
            },
            { upsert: true }
        );

        logger.info(`New message received from ${deviceId}`);
        res.status(201).json(message);

    } catch (error) {
        logger.error('Error saving message:', error);
        res.status(500).json({ error: 'Error saving message' });
    }
});

// Delete messages
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const { messageIds } = req.body;

        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({ error: 'Invalid message IDs' });
        }

        const result = await Message.deleteMany({
            _id: { $in: messageIds }
        });

        logger.info(`Deleted ${result.deletedCount} messages`);
        res.json({ deletedCount: result.deletedCount });

    } catch (error) {
        logger.error('Error deleting messages:', error);
        res.status(500).json({ error: 'Error deleting messages' });
    }
});

// Get message statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await Message.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    devices: { $addToSet: '$deviceId' },
                    senders: { $addToSet: '$sender' },
                    otpCount: {
                        $sum: {
                            $cond: [
                                { $regexMatch: { input: '$content', regex: /(otp|verification|code)/i } },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        res.json({
            total: stats[0]?.total || 0,
            uniqueDevices: stats[0]?.devices.length || 0,
            uniqueSenders: stats[0]?.senders.length || 0,
            otpCount: stats[0]?.otpCount || 0
        });

    } catch (error) {
        logger.error('Error fetching message stats:', error);
        res.status(500).json({ error: 'Error fetching message statistics' });
    }
});

module.exports = router;
