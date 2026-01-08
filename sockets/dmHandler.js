const { getDb } = require('../database');

module.exports = (io, socket) => {
    const db = getDb();
    const directMessagesCollection = db.collection('directMessages');
    const username = socket.user.username;

    socket.on('sendDirectMessage', async (data) => {
        try {
            const { recipient, message, attachments } = data;
            const conversationId = [username, recipient].sort().join('_');

            const dmMessage = {
                conversationId,
                sender: username,
                recipient,
                message,
                attachments: attachments || [],
                timestamp: new Date(),
                read: false
            };

            await directMessagesCollection.insertOne(dmMessage);

            const recipientSocket = Array.from(io.sockets.sockets.values()).find(
                s => s.user.username === recipient
            );

            if (recipientSocket) {
                recipientSocket.emit('directMessage', dmMessage);
            }

            socket.emit('directMessage', dmMessage);
            console.log(`💬 DM from ${username} to ${recipient}`);
        } catch (err) {
            console.error('❌ Error sending DM:', err);
            socket.emit('error', 'Failed to send direct message');
        }
    });

    socket.on('getDirectMessages', async (data) => {
        try {
            const { recipient } = data;
            const conversationId = [username, recipient].sort().join('_');

            const messages = await directMessagesCollection
                .find({ conversationId })
                .sort({ timestamp: 1 })
                .toArray();

            socket.emit('directMessageHistory', { recipient, messages });

            await directMessagesCollection.updateMany(
                { conversationId, recipient: username, read: false },
                { $set: { read: true } }
            );
        } catch (err) {
            console.error('❌ Error fetching DMs:', err);
            socket.emit('error', 'Failed to fetch direct messages');
        }
    });

    socket.on('getConversations', async () => {
        try {
            const conversations = await directMessagesCollection.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: username },
                            { recipient: username }
                        ]
                    }
                },
                { $sort: { timestamp: -1 } },
                {
                    $group: {
                        _id: '$conversationId',
                        lastMessage: { $first: '$$ROOT' },
                        unreadCount: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $eq: ['$recipient', username] }, { $eq: ['$read', false] }] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]).toArray();

            socket.emit('conversationsList', conversations);
        } catch (err) {
            console.error('❌ Error fetching conversations:', err);
            socket.emit('error', 'Failed to fetch conversations');
        }
    });

    socket.on('markDMAsRead', async (data) => {
        try {
            const { recipient } = data;
            const conversationId = [username, recipient].sort().join('_');

            await directMessagesCollection.updateMany(
                { conversationId, recipient: username, read: false },
                { $set: { read: true } }
            );

            const senderSocket = Array.from(io.sockets.sockets.values()).find(
                s => s.user.username === recipient
            );

            if (senderSocket) {
                senderSocket.emit('dmRead', { username });
            }
        } catch (err) {
            console.error('❌ Error marking DMs as read:', err);
        }
    });
};
