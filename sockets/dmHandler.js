const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

module.exports = (io, socket) => {
    const userId = socket.user.userId;
    const username = socket.user.username;

    socket.on('sendDirectMessage', async (data) => {
        try {
            const { recipient: recipientUsername, message, attachments } = data;

            const recipientUser = await User.findOne({ username: recipientUsername });
            if (!recipientUser) {
                return socket.emit('error', 'Recipient not found');
            }

            const conversationId = [userId, recipientUser._id.toString()].sort().join('_');

            const dmMessage = {
                conversationId,
                sender: userId,
                recipient: recipientUser._id,
                message,
                attachments: attachments || [],
                timestamp: new Date(),
                read: false
            };

            const savedDM = await DirectMessage.create(dmMessage);

            const formattedDM = {
                ...savedDM.toObject(),
                sender: username,
                recipient: recipientUsername
            };

            const recipientSocket = Array.from(io.sockets.sockets.values()).find(
                s => s.user.username === recipientUsername
            );

            if (recipientSocket) {
                recipientSocket.emit('directMessage', formattedDM);
            }

            socket.emit('directMessage', formattedDM);
            console.log(`💬 DM from ${username} to ${recipientUsername}`);
        } catch (err) {
            console.error('❌ Error sending DM:', err);
            socket.emit('error', 'Failed to send direct message');
        }
    });

    socket.on('getDirectMessages', async (data) => {
        try {
            const { recipient: recipientUsername } = data;
            const recipientUser = await User.findOne({ username: recipientUsername });
            if (!recipientUser) return;

            const conversationId = [userId, recipientUser._id.toString()].sort().join('_');

            const messages = await DirectMessage.find({ conversationId })
                .sort({ timestamp: 1 });

            const formattedMessages = messages.map(msg => ({
                ...msg.toObject(),
                sender: msg.sender.toString() === userId ? username : recipientUsername,
                recipient: msg.recipient.toString() === userId ? username : recipientUsername
            }));

            socket.emit('directMessageHistory', { recipient: recipientUsername, messages: formattedMessages });

            await DirectMessage.updateMany(
                { conversationId, recipient: userId, read: false },
                { $set: { read: true } }
            );
        } catch (err) {
            console.error('❌ Error fetching DMs:', err);
            socket.emit('error', 'Failed to fetch direct messages');
        }
    });

    socket.on('getConversations', async () => {
        try {
            const conversations = await DirectMessage.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: userId },
                            { recipient: userId }
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
                                    { $and: [{ $eq: ['$recipient', userId] }, { $eq: ['$read', false] }] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            const formattedConversations = await Promise.all(conversations.map(async conv => {
                const lastMsg = conv.lastMessage;
                const otherUserId = lastMsg.sender.toString() === userId ? lastMsg.recipient : lastMsg.sender;
                const otherUser = await User.findById(otherUserId);

                return {
                    ...conv,
                    lastMessage: {
                        ...lastMsg,
                        sender: lastMsg.sender.toString() === userId ? username : otherUser.username,
                        recipient: lastMsg.recipient.toString() === userId ? username : otherUser.username
                    }
                };
            }));

            socket.emit('conversationsList', formattedConversations);
        } catch (err) {
            console.error('❌ Error fetching conversations:', err);
            socket.emit('error', 'Failed to fetch conversations');
        }
    });

    socket.on('markDMAsRead', async (data) => {
        try {
            const { recipient: recipientUsername } = data;
            const recipientUser = await User.findOne({ username: recipientUsername });
            if (!recipientUser) return;

            const conversationId = [userId, recipientUser._id.toString()].sort().join('_');

            await DirectMessage.updateMany(
                { conversationId, recipient: userId, read: false },
                { $set: { read: true } }
            );

            const senderSocket = Array.from(io.sockets.sockets.values()).find(
                s => s.user.username === recipientUsername
            );

            if (senderSocket) {
                senderSocket.emit('dmRead', { username });
            }
        } catch (err) {
            console.error('❌ Error marking DMs as read:', err);
        }
    });
};
