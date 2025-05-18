const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    metadata: {
        androidVersion: String,
        manufacturer: String,
        model: String,
        appVersion: String
    },
    stats: {
        messagesReceived: {
            type: Number,
            default: 0
        },
        messagesForwarded: {
            type: Number,
            default: 0
        },
        lastMessageAt: Date
    },
    settings: {
        enabled: {
            type: Boolean,
            default: true
        },
        filterOTPOnly: {
            type: Boolean,
            default: false
        },
        customFilters: [{
            type: String,
            pattern: String,
            action: {
                type: String,
                enum: ['forward', 'ignore'],
                default: 'forward'
            }
        }]
    }
}, {
    timestamps: true
});

// Index for faster queries
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ lastSeen: -1 });
deviceSchema.index({ status: 1 });

// Virtual for device status based on last seen
deviceSchema.virtual('isOnline').get(function() {
    const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    return (Date.now() - this.lastSeen) < OFFLINE_THRESHOLD;
});

// Method to update device stats
deviceSchema.methods.updateStats = async function(messageType) {
    if (messageType === 'received') {
        this.stats.messagesReceived++;
    } else if (messageType === 'forwarded') {
        this.stats.messagesForwarded++;
    }
    this.stats.lastMessageAt = new Date();
    await this.save();
};

// Method to update device status
deviceSchema.methods.updateStatus = async function(newStatus) {
    this.status = newStatus;
    await this.save();
};

// Method to update device settings
deviceSchema.methods.updateSettings = async function(newSettings) {
    Object.assign(this.settings, newSettings);
    await this.save();
};

// Method to update device metadata
deviceSchema.methods.updateMetadata = async function(metadata) {
    Object.assign(this.metadata, metadata);
    await this.save();
};

// Static method to find inactive devices
deviceSchema.statics.findInactiveDevices = async function() {
    const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
    return this.find({
        lastSeen: { $lt: new Date(Date.now() - INACTIVE_THRESHOLD) },
        status: 'active'
    });
};

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
