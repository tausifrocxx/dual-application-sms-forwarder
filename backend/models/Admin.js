const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    passcode: {
        type: String,
        required: true
    },
    lastLogin: {
        type: Date
    },
    settings: {
        notificationsEnabled: {
            type: Boolean,
            default: true
        },
        filterOTPOnly: {
            type: Boolean,
            default: false
        },
        retentionDays: {
            type: Number,
            default: 30
        }
    },
    devices: [{
        deviceId: {
            type: String,
            required: true
        },
        name: String,
        lastSeen: Date,
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    }]
}, {
    timestamps: true
});

// Hash passcode before saving
adminSchema.pre('save', async function(next) {
    const admin = this;
    
    if (admin.isModified('passcode')) {
        admin.passcode = await bcrypt.hash(admin.passcode, 10);
    }
    
    next();
});

// Method to verify passcode
adminSchema.methods.verifyPasscode = async function(passcode) {
    return await bcrypt.compare(passcode, this.passcode);
};

// Method to update phone number
adminSchema.methods.updatePhoneNumber = async function(newNumber) {
    this.phoneNumber = newNumber;
    await this.save();
};

// Method to update settings
adminSchema.methods.updateSettings = async function(newSettings) {
    Object.assign(this.settings, newSettings);
    await this.save();
};

// Method to add or update device
adminSchema.methods.updateDevice = async function(deviceId, deviceInfo) {
    const deviceIndex = this.devices.findIndex(d => d.deviceId === deviceId);
    
    if (deviceIndex >= 0) {
        Object.assign(this.devices[deviceIndex], deviceInfo);
    } else {
        this.devices.push({
            deviceId,
            ...deviceInfo
        });
    }
    
    await this.save();
};

// Static method to initialize default admin if none exists
adminSchema.statics.initializeDefault = async function() {
    const adminCount = await this.countDocuments();
    
    if (adminCount === 0) {
        await this.create({
            phoneNumber: process.env.DEFAULT_ADMIN_NUMBER || '+1234567890',
            passcode: process.env.DEFAULT_ADMIN_PASSCODE || 'admin123'
        });
    }
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
