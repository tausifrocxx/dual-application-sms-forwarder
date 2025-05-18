const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');

// ... (rest of the route handlers unchanged)

module.exports = router;

// Get all devices
router.get('/', authMiddleware, async (req, res) => {
    try {
        const devices = await Device.find()
            .sort({ lastSeen: -1 })
            .lean();

        // Add online status to each device
        const devicesWithStatus = devices.map(device => ({
            ...device,
            isOnline: device.isOnline
        }));

        res.json(devicesWithStatus);
    } catch (error) {
        logger.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Error fetching devices' });
    }
});

// Get device details
router.get('/:deviceId', authMiddleware, async (req, res) => {
    try {
        const device = await Device.findOne({ deviceId: req.params.deviceId });
        
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json(device);
    } catch (error) {
        logger.error('Error fetching device:', error);
        res.status(500).json({ error: 'Error fetching device details' });
    }
});

// Update device settings
router.patch('/:deviceId', authMiddleware, async (req, res) => {
    try {
        const { settings } = req.body;
        const device = await Device.findOne({ deviceId: req.params.deviceId });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await device.updateSettings(settings);
        logger.info(`Updated settings for device ${req.params.deviceId}`);
        res.json({ message: 'Device settings updated' });
    } catch (error) {
        logger.error('Error updating device settings:', error);
        res.status(500).json({ error: 'Error updating device settings' });
    }
});

// Update device metadata
router.post('/:deviceId/metadata', async (req, res) => {
    try {
        const { metadata } = req.body;
        const device = await Device.findOne({ deviceId: req.params.deviceId });

        if (!device) {
            // Create new device if it doesn't exist
            const newDevice = new Device({
                deviceId: req.params.deviceId,
                metadata
            });
            await newDevice.save();
            logger.info(`Created new device ${req.params.deviceId}`);
            return res.status(201).json(newDevice);
        }

        await device.updateMetadata(metadata);
        logger.info(`Updated metadata for device ${req.params.deviceId}`);
        res.json({ message: 'Device metadata updated' });
    } catch (error) {
        logger.error('Error updating device metadata:', error);
        res.status(500).json({ error: 'Error updating device metadata' });
    }
});

// Delete device
router.delete('/:deviceId', authMiddleware, async (req, res) => {
    try {
        const result = await Device.deleteOne({ deviceId: req.params.deviceId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        logger.info(`Deleted device ${req.params.deviceId}`);
        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        logger.error('Error deleting device:', error);
        res.status(500).json({ error: 'Error deleting device' });
    }
});

// Get device statistics
router.get('/:deviceId/stats', authMiddleware, async (req, res) => {
    try {
        const device = await Device.findOne({ deviceId: req.params.deviceId });
        
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const stats = {
            ...device.stats,
            isOnline: device.isOnline,
            lastSeen: device.lastSeen,
            uptime: device.isOnline ? Date.now() - device.lastSeen : 0
        };

        res.json(stats);
    } catch (error) {
        logger.error('Error fetching device stats:', error);
        res.status(500).json({ error: 'Error fetching device statistics' });
    }
});

module.exports = router;
