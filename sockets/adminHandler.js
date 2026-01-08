const { getDb } = require('../database');
const { ObjectId } = require('mongodb');

module.exports = (io, socket, voiceData) => {
    const db = getDb();
    const messagesCollection = db.collection('messages');
    const channelsCollection = db.collection('channels');
    const voiceChannelsCollection = db.collection('voiceChannels');

    const { voiceRooms, broadcastOnlineUsers } = voiceData;
    const username = socket.user.username;

    const verifyAdmin = () => {
        if (!socket.user.isAdmin) {
            socket.emit('error', 'Only admins can perform this action');
            return false;
        }
        return true;
    };

    socket.on('deleteMessage', async (data) => {
        if (!verifyAdmin()) return;

        try {
            const result = await messagesCollection.deleteOne({ _id: new ObjectId(data.messageId) });

            if (result.deletedCount > 0) {
                io.emit('messageDeleted', { messageId: data.messageId });
                console.log(`🗑️ Admin ${username} deleted message ${data.messageId}`);
            }
        } catch (err) {
            console.error('❌ Error deleting message:', err);
            socket.emit('error', 'Failed to delete message');
        }
    });

    socket.on('kickFromVoice', (data) => {
        if (!verifyAdmin()) return;

        const targetSocket = Array.from(io.sockets.sockets.values()).find(
            s => s.user.username === data.targetUsername
        );

        if (targetSocket && targetSocket.voiceChannel) {
            const channelName = targetSocket.voiceChannel;

            targetSocket.leave(`voice-${channelName}`);
            const room = voiceRooms.get(channelName);
            if (room) {
                room.delete(targetSocket.id);
                if (room.size === 0) {
                    voiceRooms.delete(channelName);
                }

                const roomUsers = Array.from(room).map(socketId => {
                    const s = io.sockets.sockets.get(socketId);
                    return s ? s.user.username : null;
                }).filter(Boolean);

                io.emit('voiceChannelUsers', { channel: channelName, users: roomUsers });
            }

            targetSocket.voiceChannel = null;
            targetSocket.emit('kickedFromVoice', { reason: 'Kicked by admin' });

            console.log(`👢 Admin ${username} kicked ${data.targetUsername} from voice`);
            broadcastOnlineUsers();
        }
    });

    socket.on('disconnectUser', (data) => {
        if (!verifyAdmin()) return;

        const targetSocket = Array.from(io.sockets.sockets.values()).find(
            s => s.user && s.user.username === data.username
        );

        if (targetSocket) {
            console.log(`🔨 Admin ${username} disconnected ${data.username}`);
            targetSocket.emit('disconnected', { reason: 'Disconnected by admin' });
            targetSocket.disconnect(true);
        }
    });

    socket.on('broadcastMessage', (data) => {
        if (!verifyAdmin()) return;

        console.log(`📢 Admin ${username} broadcasting: ${data.message}`);

        io.emit('serverBroadcast', {
            message: data.message,
            from: username,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('createChannel', async (data) => {
        if (!verifyAdmin()) return;

        try {
            const collection = data.type === 'text' ? channelsCollection : voiceChannelsCollection;
            const existing = await collection.findOne({ name: data.name });
            if (existing) {
                socket.emit('error', 'Channel already exists');
                return;
            }

            await collection.insertOne({
                name: data.name,
                description: data.description || 'No description',
                type: data.type
            });

            if (data.type === 'text') {
                const channels = await channelsCollection.find().toArray();
                io.emit('channelUpdate', channels);
            } else {
                const voiceChannels = await voiceChannelsCollection.find().toArray();
                io.emit('voiceChannelUpdate', voiceChannels);
            }

            socket.emit('success', `${data.type} channel #${data.name} created`);
        } catch (err) {
            socket.emit('error', 'Failed to create channel');
        }
    });

    socket.on('deleteChannel', async (data) => {
        if (!verifyAdmin()) return;

        if (data.type === 'text' && data.name === 'general') {
            socket.emit('error', 'Cannot delete the general channel');
            return;
        }

        try {
            const collection = data.type === 'text' ? channelsCollection : voiceChannelsCollection;
            const result = await collection.deleteOne({ name: data.name });

            if (result.deletedCount > 0) {
                if (data.type === 'text') {
                    await messagesCollection.deleteMany({ channel: data.name });
                    const channels = await channelsCollection.find().toArray();
                    io.emit('channelUpdate', channels);
                    io.emit('channelDeleted', data.name);
                } else {
                    if (voiceRooms.has(data.name)) {
                        const room = voiceRooms.get(data.name);
                        room.forEach(socketId => {
                            const s = io.sockets.sockets.get(socketId);
                            if (s) {
                                s.emit('voiceChannelDeleted', data.name);
                                s.leave(`voice-${data.name}`);
                                s.voiceChannel = null;
                            }
                        });
                        voiceRooms.delete(data.name);
                    }
                    const voiceChannels = await voiceChannelsCollection.find().toArray();
                    io.emit('voiceChannelUpdate', voiceChannels);
                    io.emit('voiceChannelDeleted', data.name);
                }
                socket.emit('success', `${data.type} channel #${data.name} deleted`);
            } else {
                socket.emit('error', 'Channel not found');
            }
        } catch (err) {
            socket.emit('error', 'Failed to delete channel');
        }
    });
};
