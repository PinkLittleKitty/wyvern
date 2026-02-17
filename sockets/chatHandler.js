const Message = require('../models/Message');

module.exports = (io, socket) => {
    const username = socket.user.username;

    socket.on('joinChannel', async (channelName) => {
        socket.leave(socket.currentChannel);
        socket.join(channelName);
        socket.currentChannel = channelName;

        try {
            const history = await Message.find({ channel: channelName })
                .populate('sender', 'username profilePic isAdmin')
                .sort({ timestamp: -1 })
                .limit(50);

            const formattedHistory = history.map(msg => ({
                ...msg.toObject(),
                username: msg.sender ? msg.sender.username : 'Unknown User',
                isAdmin: msg.sender ? msg.sender.isAdmin : false
            }));

            formattedHistory.reverse();

            socket.emit("chatHistory", formattedHistory);
        } catch (err) {
            console.error("❌ Error fetching chat history:", err);
        }
    });

    socket.on('loadOlderMessages', async ({ channel, before, limit = 50 }) => {
        try {
            const query = { channel };
            if (before) {
                query.timestamp = { $lt: new Date(before) };
            }

            const messages = await Message.find(query)
                .populate('sender', 'username profilePic isAdmin')
                .sort({ timestamp: -1 })
                .limit(limit);

            const formattedMessages = messages.map(msg => ({
                ...msg.toObject(),
                username: msg.sender ? msg.sender.username : 'Unknown User',
                isAdmin: msg.sender ? msg.sender.isAdmin : false
            }));

            formattedMessages.reverse();

            socket.emit('olderMessages', {
                messages: formattedMessages,
                hasMore: messages.length === limit
            });
        } catch (err) {
            console.error("❌ Error loading older messages:", err);
            socket.emit('olderMessages', { messages: [], hasMore: false });
        }
    });

    socket.on("chatMessage", async (msg) => {
        try {
            const messageToSave = {
                sender: socket.user.userId,
                message: msg.message,
                mentions: msg.mentions || [],
                attachments: msg.attachments || [],
                channel: socket.currentChannel || 'general',
                timestamp: new Date(),
            };
            const savedMessage = await Message.create(messageToSave);

            const populatedMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'username profilePic isAdmin');

            const messageToEmit = {
                ...populatedMessage.toObject(),
                username: populatedMessage.sender.username,
                isAdmin: populatedMessage.sender.isAdmin
            };

            io.to(socket.currentChannel || 'general').emit("chatMessage", messageToEmit);

            if (msg.mentions && msg.mentions.length > 0) {
                console.log(`💬 ${username} mentioned: ${msg.mentions.join(', ')}`);
            }

            if (msg.attachments && msg.attachments.length > 0) {
                console.log(`📎 ${username} sent ${msg.attachments.length} file(s)`);
            }
        } catch (err) {
            console.error("❌ Error saving message:", err);
        }
    });

    socket.on('typing', (data) => {
        socket.to(socket.currentChannel || 'general').emit('typing', {
            username: data.username,
            isTyping: data.isTyping
        });
    });
};
