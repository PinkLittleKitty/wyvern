const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: true,
        default: 'general'
    },
    mentions: [{
        type: String
    }],
    attachments: [{
        filename: String,
        path: String,
        mimetype: String
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

messageSchema.index({ channel: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
