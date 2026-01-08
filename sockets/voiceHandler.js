module.exports = (io, socket, voiceData) => {
    const { voiceRooms, userVoiceStates, broadcastOnlineUsers } = voiceData;
    const username = socket.user.username;

    socket.on('joinVoiceChannel', (channelName) => {
        console.log(`🔊 ${username} joining voice channel: ${channelName}`);

        if (socket.voiceChannel) {
            socket.leave(`voice-${socket.voiceChannel}`);
            const oldRoom = voiceRooms.get(socket.voiceChannel);
            if (oldRoom) {
                oldRoom.delete(socket.id);
                if (oldRoom.size === 0) {
                    voiceRooms.delete(socket.voiceChannel);
                }

                const oldRoomUsers = Array.from(oldRoom).map(socketId => {
                    const s = io.sockets.sockets.get(socketId);
                    return s ? s.user.username : null;
                }).filter(Boolean);

                io.emit('voiceChannelUsers', { channel: socket.voiceChannel, users: oldRoomUsers });
                socket.to(`voice-${socket.voiceChannel}`).emit('userLeftVoice', {
                    username,
                    channel: socket.voiceChannel,
                    socketId: socket.id
                });
            }
        }

        socket.join(`voice-${channelName}`);
        socket.voiceChannel = channelName;

        if (!voiceRooms.has(channelName)) {
            voiceRooms.set(channelName, new Set());
        }

        const existingUsers = Array.from(voiceRooms.get(channelName)).map(socketId => {
            const s = io.sockets.sockets.get(socketId);
            return s ? { socketId, username: s.user.username } : null;
        }).filter(Boolean);

        voiceRooms.get(channelName).add(socket.id);

        userVoiceStates.set(socket.id, {
            username,
            muted: false,
            deafened: false,
            camera: false,
            screenSharing: false,
            channel: channelName
        });

        existingUsers.forEach(user => {
            socket.emit('userJoinedVoice', {
                username: user.username,
                channel: channelName,
                socketId: user.socketId
            });

            const existingState = userVoiceStates.get(user.socketId);
            if (existingState) {
                socket.emit('userMuted', { username: user.username, muted: existingState.muted });
                socket.emit('userDeafened', { username: user.username, deafened: existingState.deafened });
                socket.emit('userCamera', { username: user.username, camera: existingState.camera });
                socket.emit('userScreenSharing', { username: user.username, screenSharing: existingState.screenSharing });
            }
        });

        const roomUsers = Array.from(voiceRooms.get(channelName)).map(socketId => {
            const s = io.sockets.sockets.get(socketId);
            return s ? s.user.username : null;
        }).filter(Boolean);

        io.emit('voiceChannelUsers', { channel: channelName, users: roomUsers });

        socket.to(`voice-${channelName}`).emit('userJoinedVoice', {
            username,
            channel: channelName,
            socketId: socket.id
        });

        console.log(`✅ ${username} joined voice channel: ${channelName}`);
        broadcastOnlineUsers();
    });

    socket.on('leaveVoiceChannel', () => {
        if (socket.voiceChannel) {
            console.log(`🔊 ${username} leaving voice channel: ${socket.voiceChannel}`);

            socket.leave(`voice-${socket.voiceChannel}`);
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

            console.log(`✅ ${username} left voice channel: ${socket.voiceChannel}`);

            userVoiceStates.delete(socket.id);
            socket.voiceChannel = null;
            broadcastOnlineUsers();
        }
    });

    socket.on('webrtc-offer', (data) => {
        const targetSocket = io.sockets.sockets.get(data.to);
        if (targetSocket && socket.voiceChannel) {
            targetSocket.emit('webrtc-offer', {
                offer: data.offer,
                from: socket.id,
                username: username
            });
        }
    });

    socket.on('webrtc-answer', (data) => {
        const targetSocket = io.sockets.sockets.get(data.to);
        if (targetSocket && socket.voiceChannel) {
            targetSocket.emit('webrtc-answer', {
                answer: data.answer,
                from: socket.id,
                username: username
            });
        }
    });

    socket.on('webrtc-ice-candidate', (data) => {
        const targetSocket = io.sockets.sockets.get(data.to);
        if (targetSocket && socket.voiceChannel) {
            targetSocket.emit('webrtc-ice-candidate', {
                candidate: data.candidate,
                from: socket.id,
                username: username
            });
        }
    });

    socket.on('userSpeaking', (data) => {
        if (socket.voiceChannel) {
            socket.to(`voice-${socket.voiceChannel}`).emit('userSpeaking', {
                username: username,
                speaking: data.speaking
            });
        }
    });

    socket.on('userMuted', (data) => {
        const state = userVoiceStates.get(socket.id);
        if (state) {
            state.muted = data.muted;
            userVoiceStates.set(socket.id, state);
        }
        io.emit('userMuted', { username: username, muted: data.muted });
    });

    socket.on('userDeafened', (data) => {
        const state = userVoiceStates.get(socket.id);
        if (state) {
            state.deafened = data.deafened;
            userVoiceStates.set(socket.id, state);
        }
        io.emit('userDeafened', { username: username, deafened: data.deafened });
    });

    socket.on('userCamera', (data) => {
        const state = userVoiceStates.get(socket.id);
        if (state) {
            state.camera = data.camera;
            userVoiceStates.set(socket.id, state);
        }
        io.emit('userCamera', { username: username, camera: data.camera });
    });

    socket.on('userScreenSharing', (data) => {
        const state = userVoiceStates.get(socket.id);
        if (state) {
            state.screenSharing = data.screenSharing;
            userVoiceStates.set(socket.id, state);
        }
        io.emit('userScreenSharing', { username: username, screenSharing: data.screenSharing });
    });
};
