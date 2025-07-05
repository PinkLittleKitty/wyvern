const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const readline = require('readline');

const { connect, getDb } = require('./database');
const { router: authRouter, authMiddleware } = require('./auth');

const app = express();

// HTTPS Configuration with your generated certificates
let server;
let isHttps = false;

try {
  const privateKey = fs.readFileSync('key.pem', 'utf8');
  const certificate = fs.readFileSync('cert.pem', 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  
  server = https.createServer(credentials, app);
  isHttps = true;
  console.log('🔒 HTTPS server enabled with SSL certificates');
} catch (error) {
  console.log('⚠️  SSL certificates not found, falling back to HTTP');
  console.log('   Voice chat will be disabled on HTTP');
  server = http.createServer(app);
  isHttps = false;
}

const io = new Server(server, {
  cors: {
    origin: [
      'http://193.149.164.168:4196', 
      'https://193.149.164.168:4196',
      'http://localhost:4196',
      'https://localhost:4196',
      'http:wyvern.justneki.com/',
      'https://wyvern.justneki.com/'
    ],
    credentials: true,
  }
});

app.use(cors({
  origin: [
    'http://193.149.164.168:4196', 
    'https://193.149.164.168:4196',
    'http://localhost:4196',
    'https://localhost:4196',
    'http:wyvern.justneki.com/',
    'https://wyvern.justneki.com/'
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Add endpoint to check if HTTPS is enabled
app.get('/api/server-info', (req, res) => {
  res.json({ 
    https: isHttps,
    voiceSupported: isHttps 
  });
});

let messagesCollection;
let usersCollection;
let channelsCollection;
let voiceChannelsCollection;

const defaultChannels = [
  { name: 'general', description: 'General discussion', type: 'text' },
  { name: 'memes', description: 'Share your memes here', type: 'text' },
  { name: 'announcements', description: 'Important announcements', type: 'text' },
  { name: 'random', description: 'Random chat', type: 'text' }
];

const defaultVoiceChannels = [
  { name: 'Lounge', description: 'General voice chat', type: 'voice' },
  { name: 'Gaming', description: 'Gaming voice chat', type: 'voice' },
  { name: 'Music', description: 'Music and chill', type: 'voice' }
];

const voiceRooms = new Map();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function handleServerCommands() {
  rl.on('line', async (input) => {
    const [command, ...args] = input.trim().split(' ');
    
    switch(command) {
      case 'addadmin':
        if (args.length === 0) {
          console.log('Usage: addadmin <username>');
          return;
        }
        try {
          const username = args[0];
          const result = await usersCollection.updateOne(
            { username },
            { $set: { isAdmin: true } }
          );
          if (result.matchedCount > 0) {
            console.log(`✅ ${username} is now an admin`);
          } else {
            console.log(`❌ User ${username} not found`);
          }
        } catch (err) {
          console.error('Error adding admin:', err);
        }
        break;
        
      case 'removeadmin':
        if (args.length === 0) {
          console.log('Usage: removeadmin <username>');
          return;
        }
        try {
          const username = args[0];
          const result = await usersCollection.updateOne(
            { username },
            { $unset: { isAdmin: "" } }
          );
          if (result.matchedCount > 0) {
            console.log(`✅ ${username} is no longer an admin`);
          } else {
            console.log(`❌ User ${username} not found`);
          }
        } catch (err) {
          console.error('Error removing admin:', err);
        }
        break;
        
      case 'listadmins':
        try {
          const admins = await usersCollection.find({ isAdmin: true }).toArray();
          console.log('👑 Admins:');
          admins.forEach(admin => console.log(`  - ${admin.username}`));
        } catch (err) {
          console.error('Error listing admins:', err);
        }
        break;
        
      case 'addchannel':
        if (args.length < 2) {
          console.log('Usage: addchannel <text|voice> <name> [description]');
          return;
        }
        try {
          const type = args[0];
          const name = args[1];
          const description = args.slice(2).join(' ') || 'No description';
          
          if (type !== 'text' && type !== 'voice') {
            console.log('❌ Type must be "text" or "voice"');
            return;
          }
          
          const collection = type === 'text' ? channelsCollection : voiceChannelsCollection;
          await collection.insertOne({ name, description, type });
          console.log(`✅ ${type} channel #${name} created`);
          
          if (type === 'text') {
            io.emit('channelUpdate', await channelsCollection.find().toArray());
          } else {
            io.emit('voiceChannelUpdate', await voiceChannelsCollection.find().toArray());
          }
        } catch (err) {
          console.error('Error adding channel:', err);
        }
        break;
        
      case 'removechannel':
        if (args.length < 2) {
          console.log('Usage: removechannel <text|voice> <name>');
          return;
        }
        try {
          const type = args[0];
          const name = args[1];
          
          if (type === 'text' && name === 'general') {
            console.log('❌ Cannot delete the general channel');
            return;
          }
          
          const collection = type === 'text' ? channelsCollection : voiceChannelsCollection;
          const result = await collection.deleteOne({ name });
          
          if (result.deletedCount > 0) {
            if (type === 'text') {
              await messagesCollection.deleteMany({ channel: name });
              io.emit('channelUpdate', await channelsCollection.find().toArray());
              io.emit('channelDeleted', name);
            } else {
              if (voiceRooms.has(name)) {
                const room = voiceRooms.get(name);
                room.forEach(socketId => {
                  const socket = io.sockets.sockets.get(socketId);
                  if (socket) {
                    socket.emit('voiceChannelDeleted', name);
                    socket.leave(`voice-${name}`);
                  }
                });
                voiceRooms.delete(name);
              }
              io.emit('voiceChannelUpdate', await voiceChannelsCollection.find().toArray());
              io.emit('voiceChannelDeleted', name);
            }
            console.log(`✅ ${type} channel #${name} deleted`);
          } else {
            console.log(`❌ ${type} channel #${name} not found`);
          }
        } catch (err) {
          console.error('Error removing channel:', err);
        }
        break;
        
      case 'listchannels':
        try {
          const textChannels = await channelsCollection.find().toArray();
          const voiceChannels = await voiceChannelsCollection.find().toArray();
          console.log('📺 Text Channels:');
          textChannels.forEach(channel => console.log(`  - #${channel.name}: ${channel.description}`));
          console.log('🔊 Voice Channels:');
          voiceChannels.forEach(channel => console.log(`  - 🔊${channel.name}: ${channel.description}`));
        } catch (err) {
          console.error('Error listing channels:', err);
        }
        break;
        
      case 'help':
        console.log('Available commands:');
        console.log('  addadmin <username>              - Make user an admin');
        console.log('  removeadmin <username>           - Remove admin privileges');
        console.log('  listadmins                       - List all admins');
        console.log('  addchannel <text|voice> <name>   - Add new channel');
        console.log('  removechannel <text|voice> <name> - Delete channel');
        console.log('  listchannels                     - List all channels');
        console.log('  migrate                          - Migrate old messages to #general');
        console.log('  countmessages                    - Show message statistics');
        console.log('  restart                          - Restart the server');
        console.log('  stop                             - Stop the server');
        console.log('  help                             - Show this help');
        break;
        
      case 'restart':
        console.log('🔄 Restarting server...');
        console.log('👋 Goodbye!');
        
        // Close all socket connections gracefully
        io.emit('serverRestart', 'Server is restarting, please refresh your page');
        
        // Close server
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
        
        // Force exit after 5 seconds if graceful shutdown fails
        setTimeout(() => {
          console.log('Force exit');
          process.exit(1);
        }, 5000);
        break;
        
      case 'stop':
        console.log('🛑 Stopping server...');
        console.log('👋 Goodbye!');
        
        // Notify all connected users
        io.emit('serverShutdown', 'Server is shutting down');
        
        // Close server gracefully
        server.close(() => {
          console.log('Server stopped');
          process.exit(0);
        });
        
        // Force exit after 5 seconds
        setTimeout(() => {
          process.exit(1);
        }, 5000);
        break;
        
      default:
        if (command) {
          console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
        }
    }
  });
}

app.get('/api/channels', async (req, res) => {
  try {
    const channels = await channelsCollection.find().toArray();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.request.headers.cookie?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

  if (!token) return next(new Error("No token"));

  try {
    const payload = jwt.verify(token, 'your_jwt_secret_here');
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on('connection', async (socket) => {
  const username = socket.user.username;
  console.log(`User connected: ${username}`);
  
  const user = await usersCollection.findOne({ username });
  socket.user.isAdmin = user?.isAdmin || false;
  
  socket.emit('userInfo', { username, isAdmin: socket.user.isAdmin });
  
  const channels = await channelsCollection.find().toArray();
  const voiceChannels = await voiceChannelsCollection.find().toArray();
  socket.emit('channelUpdate', channels);
  socket.emit('voiceChannelUpdate', voiceChannels);

  socket.on('joinChannel', async (channelName) => {
    socket.leave(socket.currentChannel);
    socket.join(channelName);
    socket.currentChannel = channelName;
    
    try {
      const history = await messagesCollection
        .find({ channel: channelName })
        .sort({ timestamp: 1 })
        .toArray();
      socket.emit("chatHistory", history);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  });

  socket.on('joinVoiceChannel', (channelName) => {
    console.log(`${username} attempting to join voice channel: ${channelName}`);
    
    // Leave current voice channel if in one
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

    // Join new voice channel
    socket.join(`voice-${channelName}`);
    socket.voiceChannel = channelName;
    
    if (!voiceRooms.has(channelName)) {
      voiceRooms.set(channelName, new Set());
    }
    voiceRooms.get(channelName).add(socket.id);
    
    // Get current users in the channel
    const roomUsers = Array.from(voiceRooms.get(channelName)).map(socketId => {
      const s = io.sockets.sockets.get(socketId);
      return s ? s.user.username : null;
    }).filter(Boolean);
    
    console.log(`Voice channel ${channelName} now has users:`, roomUsers);
    
    // Emit updated user list to everyone
    io.emit('voiceChannelUsers', { channel: channelName, users: roomUsers });
    
    // Notify existing users in the channel about the new user
    socket.to(`voice-${channelName}`).emit('userJoinedVoice', { 
      username, 
      channel: channelName,
      socketId: socket.id 
    });
    
    console.log(`${username} successfully joined voice channel: ${channelName}`);
  });

  socket.on('leaveVoiceChannel', () => {
    if (socket.voiceChannel) {
      console.log(`${username} leaving voice channel: ${socket.voiceChannel}`);
      
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
      
      console.log(`${username} left voice channel: ${socket.voiceChannel}`);
      socket.voiceChannel = null;
    }
  });

  socket.on('webrtc-offer', (data) => {
    console.log(`WebRTC offer from ${username} to ${data.to}`);
    const targetSocket = io.sockets.sockets.get(data.to);
    if (targetSocket && socket.voiceChannel) {
      targetSocket.emit('webrtc-offer', {
        offer: data.offer,
        from: socket.id,
        username: username
      });
      console.log(`WebRTC offer relayed from ${username} to ${targetSocket.user.username}`);
    } else {
      console.log(`Target socket ${data.to} not found or not in voice channel`);
    }
  });

  socket.on('webrtc-answer', (data) => {
    console.log(`WebRTC answer from ${username} to ${data.to}`);
    const targetSocket = io.sockets.sockets.get(data.to);
    if (targetSocket && socket.voiceChannel) {
      targetSocket.emit('webrtc-answer', {
        answer: data.answer,
        from: socket.id,
        username: username
      });
      console.log(`WebRTC answer relayed from ${username} to ${targetSocket.user.username}`);
    } else {
      console.log(`Target socket ${data.to} not found or not in voice channel`);
    }
  });

  socket.on('webrtc-ice-candidate', (data) => {
    console.log(`ICE candidate from ${username} to ${data.to}`);
    const targetSocket = io.sockets.sockets.get(data.to);
    if (targetSocket && socket.voiceChannel) {
      targetSocket.emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        from: socket.id,
        username: username
      });
      console.log(`ICE candidate relayed from ${username} to ${targetSocket.user.username}`);
    } else {
      console.log(`Target socket ${data.to} not found or not in voice channel`);
    }
  });

  socket.on("chatMessage", async (msg) => {
    try {
      const messageToSave = {
        username: username,
        message: msg.message,
        channel: socket.currentChannel || 'general',
        timestamp: new Date(),
      };
      await messagesCollection.insertOne(messageToSave);
      io.to(socket.currentChannel || 'general').emit("chatMessage", messageToSave);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on('typing', (typingUsername) => {
    socket.to(socket.currentChannel || 'general').emit('typing', typingUsername);
  });

  socket.on('createChannel', async (data) => {
    if (!socket.user.isAdmin) {
      socket.emit('error', 'Only admins can create channels');
      return;
    }
    
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
    if (!socket.user.isAdmin) {
      socket.emit('error', 'Only admins can delete channels');
      return;
    }
    
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

    socket.on('disconnect', () => {
    console.log(`User disconnected: ${username}`);
    
    // Clean up voice channel
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
  });
});

const PORT = process.env.PORT || 4196;

connect().then(async () => {
  const db = getDb();
  messagesCollection = db.collection("messages");
  usersCollection = db.collection("users");
  channelsCollection = db.collection("channels");
  voiceChannelsCollection = db.collection("voiceChannels");
  
  const existingChannels = await channelsCollection.countDocuments();
  if (existingChannels === 0) {
    await channelsCollection.insertMany(defaultChannels);
    console.log('✅ Default text channels created');
  }
  
  const existingVoiceChannels = await voiceChannelsCollection.countDocuments();
  if (existingVoiceChannels === 0) {
    await voiceChannelsCollection.insertMany(defaultVoiceChannels);
    console.log('✅ Default voice channels created');
  }
  
  server.listen(PORT, () => {
    const protocol = isHttps ? 'https' : 'http';
    console.log(`🚀 Server listening on ${protocol}://193.149.164.168:${PORT}`);
    
    if (isHttps) {
      console.log('🔊 Voice chat enabled (HTTPS)');
      console.log('⚠️  You may need to accept the self-signed certificate in your browser');
    } else {
      console.log('⚠️  Voice chat disabled (HTTP only)');
      console.log('   Generate SSL certificates to enable voice features');
    }
    
    console.log('💬 Type "help" for available commands');
    handleServerCommands();
  });
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
