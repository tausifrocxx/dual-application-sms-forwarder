const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('No authentication token provided');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Find admin by id
        const admin = await Admin.findOne({ _id: decoded.id });
        
        if (!admin) {
            throw new Error('Admin not found');
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Add admin to request
        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
};

// Middleware to check if admin has specific permissions
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const admin = req.admin;
            // TODO: Implement permission check logic here
            // For now, allow all
            next();
        } catch (error) {
            res.status(403).json({ error: 'Permission denied' });
        }
    };
};

module.exports = {
    authMiddleware,
    checkPermission
};
