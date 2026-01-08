const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const chatHandler = require('./chatHandler');
const voiceHandler = require('./voiceHandler');
const adminHandler = require('./adminHandler');
const dmHandler = require('./dmHandler');

const voiceRooms = new Map();
const userVoiceStates = new Map();

module.exports = (io) => {
    console.log('🔌 Setting up Socket.IO handlers...');

    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.request.headers.cookie?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

        console.log('Socket auth attempt:', { hasToken: !!token, socketId: socket.id });

        if (!token) {
            console.log('No token provided');
            return next(new Error("Authentication error: No token provided"));
        }

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = payload;
            console.log(`Socket authenticated: ${payload.username}`);
            next();
        } catch (err) {
            console.log('Token verification failed:', err.message);
            next(new Error("Authentication error: Invalid token"));
        }
    });

    function getOnlineUsers() {
        const users = [];
        io.sockets.sockets.forEach(socket => {
            users.push({
                username: socket.user.username,
                isAdmin: socket.user.isAdmin || false,
                voiceChannel: socket.voiceChannel || null
            });
        });
        return users;
    }

    function broadcastOnlineUsers() {
        const users = getOnlineUsers();
        io.emit('onlineUsers', users);
    }

    io.voiceRooms = voiceRooms;
    io.userVoiceStates = userVoiceStates;
    io.broadcastOnlineUsers = broadcastOnlineUsers;

    io.on('connection', async (socket) => {
        const username = socket.user.username;
        console.log(`👤 User connected: ${username}`);

        const db = getDb();
        const usersCollection = db.collection('users');
        const channelsCollection = db.collection('channels');
        const voiceChannelsCollection = db.collection('voiceChannels');

        const user = await usersCollection.findOne({ username });
        socket.user.isAdmin = user?.isAdmin || false;

        socket.emit('userInfo', { username, isAdmin: socket.user.isAdmin });

        const channels = await channelsCollection.find().toArray();
        const voiceChannels = await voiceChannelsCollection.find().toArray();
        socket.emit('channelUpdate', channels);
        socket.emit('voiceChannelUpdate', voiceChannels);

        userVoiceStates.forEach((state, socketId) => {
            socket.emit('userMuted', { username: state.username, muted: state.muted });
            socket.emit('userDeafened', { username: state.username, deafened: state.deafened });
            socket.emit('userCamera', { username: state.username, camera: state.camera });
            socket.emit('userScreenSharing', { username: state.username, screenSharing: state.screenSharing });
        });

        broadcastOnlineUsers();

        const voiceData = {
            voiceRooms,
            userVoiceStates,
            broadcastOnlineUsers
        };

        chatHandler(io, socket);
        voiceHandler(io, socket, voiceData);
        adminHandler(io, socket, voiceData);
        dmHandler(io, socket);

        socket.on('disconnect', () => {
            console.log(`👤 User disconnected: ${username}`);

            if (socket.voiceChannel) {
                const room = voiceRooms.get(socket.voiceChannel);
                if (room) {
                    room.delete(socket.id);
                    if (room.size === 0) {
                        voiceRooms.delete(socket.voiceChannel);
                    }

                    const roomUsers = Array.from(room).map(socketId => {
                        const s = io.sockets.sockets.get(socketId);
                        return s ? s.user.username : null;
                    }).filter(Boolean);

                    io.emit('voiceChannelUsers', { channel: socket.voiceChannel, users: roomUsers });
                    socket.to(`voice-${socket.voiceChannel}`).emit('userLeftVoice', {
                        username,
                        channel: socket.voiceChannel,
                        socketId: socket.id
                    });
                }
            }

            broadcastOnlineUsers();
        });
    });
};
