const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
        index: true
    },
    sender: {
        type: String,
        required: true
    },
    recipient: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    attachments: [{
        filename: String,
        path: String,
        mimetype: String
    }],
    read: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

directMessageSchema.index({ conversationId: 1, timestamp: 1 });
directMessageSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
