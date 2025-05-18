const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },
    deviceId: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['received', 'forwarded', 'failed'],
        default: 'received'
    },
    forwardedAt: {
        type: Date
    },
    error: {
        type: String
    }
});

// Index for faster queries
messageSchema.index({ timestamp: -1 });
messageSchema.index({ deviceId: 1 });
messageSchema.index({ sender: 1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTimestamp').get(function() {
    return this.timestamp.toLocaleString();
});

// Method to mark message as forwarded
messageSchema.methods.markForwarded = async function() {
    this.status = 'forwarded';
    this.forwardedAt = new Date();
    await this.save();
};

// Method to mark message as failed
messageSchema.methods.markFailed = async function(error) {
    this.status = 'failed';
    this.error = error;
    await this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
