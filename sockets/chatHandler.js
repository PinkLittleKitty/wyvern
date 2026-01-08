const { getDb } = require('../database');

module.exports = (io, socket) => {
    const db = getDb();
    const messagesCollection = db.collection('messages');
    const username = socket.user.username;

    socket.on('joinChannel', async (channelName) => {
        socket.leave(socket.currentChannel);
        socket.join(channelName);
        socket.currentChannel = channelName;

        try {
            const history = await messagesCollection
                .find({ channel: channelName })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray();

            history.reverse();

            socket.emit("chatHistory", history);
            // Notify about join if needed, or update user list context
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

            const messages = await messagesCollection
                .find(query)
                .sort({ timestamp: -1 })
                .limit(limit)
                .toArray();

            messages.reverse();

            socket.emit('olderMessages', {
                messages,
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
                username: username,
                message: msg.message,
                mentions: msg.mentions || [],
                attachments: msg.attachments || [],
                channel: socket.currentChannel || 'general',
                timestamp: new Date(),
            };
            await messagesCollection.insertOne(messageToSave);
            io.to(socket.currentChannel || 'general').emit("chatMessage", messageToSave);

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
