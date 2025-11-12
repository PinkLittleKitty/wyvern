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

let server;
let isHttps = false;

function initializeServer() {
  try {
    if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
      const privateKey = fs.readFileSync('key.pem', 'utf8');
      const certificate = fs.readFileSync('cert.pem', 'utf8');
      const credentials = { 
        key: privateKey, 
        cert: certificate,
        secureProtocol: 'TLSv1_2_method',
        honorCipherOrder: true
      };
      
      server = https.createServer(credentials, app);
      isHttps = true;
      console.log('🔒 HTTPS server enabled with SSL certificates');
    } else {
      console.log('⚠️  SSL certificates not found, falling back to HTTP');
      console.log('   Voice chat will be disabled on HTTP');
      server = http.createServer(app);
      isHttps = false;
    }
  } catch (error) {
    console.error('❌ Error reading SSL certificates:', error.message);
    console.log('⚠️  Falling back to HTTP server');
    server = http.createServer(app);
    isHttps = false;
  }

  // Initialize Socket.IO AFTER server is created
  io = new Server(server, {
    cors: {
      origin: [
        'http://193.149.164.240:4196', 
        'https://193.149.164.240:4196',
        'http://localhost:4196',
        'https://localhost:4196',
        'http://wyvern.justneki.com',
        'https://wyvern.justneki.com'
      ],
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ["polling", "websocket"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/'
  });

  // Add the upgrade handler AFTER server is created
  server.on('upgrade', (request, socket, head) => {
    console.log('WebSocket upgrade request received');
  });
}

let io;

app.use(cors({
  origin: [
    'http://193.149.164.240:4196', 
    'https://193.149.164.240:4196',
    'http://localhost:4196',
    'https://localhost:4196',
    'http://wyvern.justneki.com',
    'https://wyvern.justneki.com'
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

app.get('/api/server-info', (req, res) => {
  res.json({ 
    https: isHttps,
    voiceSupported: isHttps,
    uptime: process.uptime(),
    version: require('./package.json').version
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Add this route to serve Socket.IO client
app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.js'));
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

const voiceRooms = new Map(); // channelName -> Set of socket IDs
const userVoiceStates = new Map(); // socketId -> { username, muted, deafened, channel }

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayBanner() {
  console.log('\n' + '='.repeat(60));
  console.log('🐉 WYVERN CHAT SERVER');
  console.log('='.repeat(60));
  console.log(`📦 Version: ${require('./package.json').version}`);
  console.log(`🌐 Protocol: ${isHttps ? 'HTTPS' : 'HTTP'}`);
  console.log(`🔊 Voice Chat: ${isHttps ? 'Enabled' : 'Disabled'}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
}

function displayHelp() {
  console.log('\n📋 Available Commands:');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ 👑 ADMIN MANAGEMENT                                     │');
  console.log('│   addadmin <username>        - Grant admin privileges   │');
  console.log('│   removeadmin <username>     - Remove admin privileges  │');
  console.log('│   listadmins                 - List all admins          │');
  console.log('│                                                         │');
  console.log('│ 📺 CHANNEL MANAGEMENT                                   │');
  console.log('│   addchannel <type> <name> [desc] - Create channel      │');
  console.log('│   removechannel <type> <name>     - Delete channel      │');
  console.log('│   listchannels                    - List all channels   │');
  console.log('│                                                         │');
  console.log('│ 📊 SERVER INFO                                          │');
  console.log('│   status                     - Show server status       │');
  console.log('│   stats                      - Show detailed statistics │');
  console.log('│   users                      - List connected users     │');
  console.log('│   migrate                    - Migrate old messages     │');
  console.log('│   countmessages              - Show message statistics  │');
  console.log('│                                                         │');
  console.log('│ 🔧 SERVER CONTROL                                       │');
  console.log('│   restart                    - Restart the server       │');
  console.log('│   stop                       - Stop the server          │');
  console.log('│   help                       - Show this help           │');
  console.log('└─────────────────────────────────────────────────────────┘');
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function handleServerCommands() {
  rl.on('line', async (input) => {
    const [command, ...args] = input.trim().split(' ');
    
    switch(command) {
      case 'addadmin':
        if (args.length === 0) {
          console.log('❌ Usage: addadmin <username>');
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
          console.error('❌ Error adding admin:', err.message);
        }
        break;
        
      case 'removeadmin':
        if (args.length === 0) {
          console.log('❌ Usage: removeadmin <username>');
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
          console.error('❌ Error removing admin:', err.message);
        }
        break;
        
      case 'listadmins':
        try {
          const admins = await usersCollection.find({ isAdmin: true }).toArray();
          if (admins.length === 0) {
            console.log('👑 No admins found');
          } else {
            console.log('👑 Current Admins:');
            admins.forEach((admin, index) => {
              console.log(`   ${index + 1}. ${admin.username}`);
            });
          }
        } catch (err) {
          console.error('❌ Error listing admins:', err.message);
        }
        break;
        
      case 'addchannel':
        if (args.length < 2) {
          console.log('❌ Usage: addchannel <text|voice> <name> [description]');
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
          const existing = await collection.findOne({ name });
          if (existing) {
            console.log(`❌ ${type} channel #${name} already exists`);
            return;
          }
          
          await collection.insertOne({ name, description, type });
          console.log(`✅ ${type} channel #${name} created`);
          
          if (type === 'text') {
            io.emit('channelUpdate', await channelsCollection.find().toArray());
          } else {
            io.emit('voiceChannelUpdate', await voiceChannelsCollection.find().toArray());
          }
        } catch (err) {
          console.error('❌ Error adding channel:', err.message);
        }
        break;
        
      case 'removechannel':
        if (args.length < 2) {
          console.log('❌ Usage: removechannel <text|voice> <name>');
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
          console.error('❌ Error removing channel:', err.message);
        }
        break;
        
      case 'listchannels':
        try {
          const textChannels = await channelsCollection.find().toArray();
          const voiceChannels = await voiceChannelsCollection.find().toArray();
          
          console.log('\n📺 Text Channels:');
          if (textChannels.length === 0) {
            console.log('   No text channels found');
          } else {
            textChannels.forEach((channel, index) => {
              console.log(`   ${index + 1}. #${channel.name} - ${channel.description}`);
            });
          }
          
          console.log('\n🔊 Voice Channels:');
          if (voiceChannels.length === 0) {
            console.log('   No voice channels found');
          } else {
            voiceChannels.forEach((channel, index) => {
              const userCount = voiceRooms.get(channel.name)?.size || 0;
              console.log(`   ${index + 1}. 🔊${channel.name} - ${channel.description} (${userCount} users)`);
            });
          }
        } catch (err) {
          console.error('❌ Error listing channels:', err.message);
        }
        break;

      case 'status':
        try {
          const connectedUsers = io.sockets.sockets.size;
          const totalVoiceUsers = Array.from(voiceRooms.values()).reduce((sum, room) => sum + room.size, 0);
          const totalUsers = await usersCollection.countDocuments();
          const totalMessages = await messagesCollection.countDocuments();
          
          console.log('\n📊 Server Status:');
          console.log(`   🟢 Status: Running`);
          console.log(`   ⏰ Uptime: ${formatUptime(process.uptime())}`);
          console.log(`   👥 Connected Users: ${connectedUsers}`);
          console.log(`   🔊 Voice Users: ${totalVoiceUsers}`);
          console.log(`   📝 Total Registered: ${totalUsers}`);
          console.log(`   💬 Total Messages: ${totalMessages}`);
          console.log(`   🧠 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        } catch (err) {
          console.error('❌ Error getting status:', err.message);
        }
        break;

            case 'stats':
        try {
          const totalUsers = await usersCollection.countDocuments();
          const totalMessages = await messagesCollection.countDocuments();
          const totalChannels = await channelsCollection.countDocuments();
          const totalVoiceChannels = await voiceChannelsCollection.countDocuments();
          const connectedUsers = io.sockets.sockets.size;
          const totalVoiceUsers = Array.from(voiceRooms.values()).reduce((sum, room) => sum + room.size, 0);
          
          const messagesByChannel = await messagesCollection.aggregate([
            { $group: { _id: '$channel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]).toArray();
          
          const topUsers = await messagesCollection.aggregate([
            { $group: { _id: '$username', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]).toArray();
          
          console.log('\n📊 Detailed Server Statistics:');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log('│ 📈 GENERAL STATS                                       │');
          console.log(`│   Total Registered Users: ${totalUsers.toString().padStart(25)} │`);
          console.log(`│   Currently Connected: ${connectedUsers.toString().padStart(29)} │`);
          console.log(`│   Users in Voice Chat: ${totalVoiceUsers.toString().padStart(29)} │`);
          console.log(`│   Total Messages Sent: ${totalMessages.toString().padStart(28)} │`);
          console.log(`│   Text Channels: ${totalChannels.toString().padStart(34)} │`);
          console.log(`│   Voice Channels: ${totalVoiceChannels.toString().padStart(33)} │`);
          console.log('│                                                         │');
          console.log('│ 💬 TOP CHANNELS BY MESSAGES                            │');
          messagesByChannel.slice(0, 5).forEach((channel, index) => {
            const name = `#${channel._id}`.padEnd(20);
            const count = channel.count.toString().padStart(10);
            console.log(`│   ${(index + 1)}. ${name}${count} messages │`);
          });
          console.log('│                                                         │');
          console.log('│ 👑 TOP USERS BY MESSAGES                               │');
          topUsers.forEach((user, index) => {
            const name = user._id.padEnd(20);
            const count = user.count.toString().padStart(10);
            console.log(`│   ${(index + 1)}. ${name}${count} messages │`);
          });
          console.log('│                                                         │');
          console.log('│ 🖥️  SYSTEM INFO                                         │');
          console.log(`│   Uptime: ${formatUptime(process.uptime()).padStart(43)} │`);
          console.log(`│   Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024).toString().padStart(35)}MB │`);
          console.log(`│   Node.js Version: ${process.version.padStart(32)} │`);
          console.log('└─────────────────────────────────────────────────────────┘');
        } catch (err) {
          console.error('❌ Error getting detailed stats:', err.message);
        }
        break;

      case 'users':
        try {
          const connectedSockets = Array.from(io.sockets.sockets.values());
          console.log('\n👥 Connected Users:');
          if (connectedSockets.length === 0) {
            console.log('   No users currently connected');
          } else {
            connectedSockets.forEach((socket, index) => {
              const voiceStatus = socket.voiceChannel ? `🔊 ${socket.voiceChannel}` : '💬 Text only';
              const adminStatus = socket.user.isAdmin ? '👑' : '👤';
              console.log(`   ${index + 1}. ${adminStatus} ${socket.user.username} - ${voiceStatus}`);
            });
          }
        } catch (err) {
          console.error('❌ Error listing users:', err.message);
        }
        break;

      case 'migrate':
        try {
          const result = await messagesCollection.updateMany(
            { channel: { $exists: false } },
            { $set: { channel: 'general' } }
          );
          console.log(`✅ Migrated ${result.modifiedCount} messages to #general`);
        } catch (err) {
          console.error('❌ Error migrating messages:', err.message);
        }
        break;

      case 'countmessages':
        try {
          const totalMessages = await messagesCollection.countDocuments();
          const messagesByChannel = await messagesCollection.aggregate([
            { $group: { _id: '$channel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]).toArray();
          
          console.log(`\n💬 Total Messages: ${totalMessages}`);
          console.log('📊 Messages by Channel:');
          messagesByChannel.forEach((channel, index) => {
            console.log(`   ${index + 1}. #${channel._id}: ${channel.count} messages`);
          });
        } catch (err) {
          console.error('❌ Error counting messages:', err.message);
        }
        break;
        
      case 'restart':
        console.log('🔄 Initiating server restart...');
        console.log('📢 Notifying all connected users...');
        
        io.emit('serverRestart', 'Server is restarting, please refresh your page in 10 seconds');
        
        setTimeout(() => {
          console.log('🔄 Restarting server...');
          console.log('👋 Goodbye!');
          
          server.close(() => {
            console.log('✅ Server closed gracefully');
            process.exit(0);
          });
          
          setTimeout(() => {
            console.log('⚠️  Force exit - graceful shutdown timeout');
            process.exit(1);
          }, 5000);
        }, 2000);
        break;
        
      case 'stop':
        console.log('🛑 Initiating server shutdown...');
        console.log('📢 Notifying all connected users...');
        
        io.emit('serverShutdown', 'Server is shutting down');
        
        setTimeout(() => {
          console.log('🛑 Stopping server...');
          console.log('👋 Goodbye!');
          
          server.close(() => {
            console.log('✅ Server stopped gracefully');
            process.exit(0);
          });
          
          setTimeout(() => {
            console.log('⚠️  Force exit - graceful shutdown timeout');
            process.exit(1);
          }, 5000);
        }, 2000);
        break;

      case 'clear':
        console.clear();
        displayBanner();
        break;

      case 'help':
        displayHelp();
        break;
        
      default:
        if (command) {
          console.log(`❌ Unknown command: ${command}`);
          console.log('💡 Type "help" for available commands');
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

function setupSocketIO() {
  console.log('🔌 Setting up Socket.IO handlers...');
  
  io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.request.headers.cookie?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

  console.log('Socket auth attempt:', { hasToken: !!token, socketId: socket.id });

  if (!token) {
    console.log('No token provided');
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const payload = jwt.verify(token, 'da39a3ee5e6b4b0d3255bfef95601890afd80709'); // Use your actual JWT secret
    socket.user = payload;
    console.log(`Socket authenticated: ${payload.username}`);
    next();
  } catch (err) {
    console.log('Token verification failed:', err.message);
    next(new Error("Authentication error: Invalid token"));
  }
});

// Helper function to get online users
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

// Helper function to broadcast online users
function broadcastOnlineUsers() {
  const users = getOnlineUsers();
  io.emit('onlineUsers', users);
}

io.on('connection', async (socket) => {
  const username = socket.user.username;
  console.log(`👤 User connected: ${username}`);
  
  const user = await usersCollection.findOne({ username });
  socket.user.isAdmin = user?.isAdmin || false;
  
  socket.emit('userInfo', { username, isAdmin: socket.user.isAdmin });
  
  const channels = await channelsCollection.find().toArray();
  const voiceChannels = await voiceChannelsCollection.find().toArray();
  socket.emit('channelUpdate', channels);
  socket.emit('voiceChannelUpdate', voiceChannels);

  // Send current voice states to new connection
  userVoiceStates.forEach((state, socketId) => {
    socket.emit('userMuted', { username: state.username, muted: state.muted });
    socket.emit('userDeafened', { username: state.username, deafened: state.deafened });
  });

  // Send online users to the new connection and broadcast update
  broadcastOnlineUsers();

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
      console.error("❌ Error fetching chat history:", err);
    }
  });

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
    
    // Get existing users before adding the new one
    const existingUsers = Array.from(voiceRooms.get(channelName)).map(socketId => {
      const s = io.sockets.sockets.get(socketId);
      return s ? { socketId, username: s.user.username } : null;
    }).filter(Boolean);
    
    // Add the new user
    voiceRooms.get(channelName).add(socket.id);
    
    // Initialize user voice state
    userVoiceStates.set(socket.id, {
      username,
      muted: false,
      deafened: false,
      channel: channelName
    });
    
    // Send existing users to the new joiner so they can establish connections
    existingUsers.forEach(user => {
      socket.emit('userJoinedVoice', {
        username: user.username,
        channel: channelName,
        socketId: user.socketId
      });
      
      // Send existing user's voice state to the new joiner
      const existingState = userVoiceStates.get(user.socketId);
      if (existingState) {
        socket.emit('userMuted', { username: user.username, muted: existingState.muted });
        socket.emit('userDeafened', { username: user.username, deafened: existingState.deafened });
      }
    });
    
    // Get updated room users list
    const roomUsers = Array.from(voiceRooms.get(channelName)).map(socketId => {
      const s = io.sockets.sockets.get(socketId);
      return s ? s.user.username : null;
    }).filter(Boolean);
    
    // Broadcast updated user list to everyone
    io.emit('voiceChannelUsers', { channel: channelName, users: roomUsers });
    
    // Notify other users in the channel about the new joiner
    socket.to(`voice-${channelName}`).emit('userJoinedVoice', { 
      username, 
      channel: channelName,
      socketId: socket.id 
    });
    
    console.log(`✅ ${username} joined voice channel: ${channelName}`);
    
    // Broadcast updated online users list
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
      
      // Clear user voice state
      userVoiceStates.delete(socket.id);
      
      socket.voiceChannel = null;
      
      // Broadcast updated online users list
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
      console.error("❌ Error saving message:", err);
    }
  });

  socket.on('typing', (data) => {
    // Broadcast typing status to other users in the same channel
    socket.to(socket.currentChannel || 'general').emit('typing', {
      username: data.username,
      isTyping: data.isTyping
    });
  });

  // Admin: Delete message
  socket.on('deleteMessage', async (data) => {
    if (!socket.user.isAdmin) {
      socket.emit('error', 'Only admins can delete messages');
      return;
    }

    try {
      const { ObjectId } = require('mongodb');
      const result = await messagesCollection.deleteOne({ _id: new ObjectId(data.messageId) });
      
      if (result.deletedCount > 0) {
        // Broadcast deletion to all users
        io.emit('messageDeleted', { messageId: data.messageId });
        console.log(`🗑️ Admin ${username} deleted message ${data.messageId}`);
      }
    } catch (err) {
      console.error('❌ Error deleting message:', err);
      socket.emit('error', 'Failed to delete message');
    }
  });

  // Admin: Kick user from voice
  socket.on('kickFromVoice', (data) => {
    if (!socket.user.isAdmin) {
      socket.emit('error', 'Only admins can kick users');
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      s => s.user.username === data.targetUsername
    );

    if (targetSocket && targetSocket.voiceChannel) {
      const channelName = targetSocket.voiceChannel;
      
      // Force leave voice channel
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

  // Admin: Disconnect user
  socket.on('disconnectUser', (data) => {
    if (!socket.user.isAdmin) {
      socket.emit('error', 'Only admins can disconnect users');
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      s => s.user.username === data.targetUsername
    );

    if (targetSocket) {
      console.log(`🔨 Admin ${username} disconnected ${data.targetUsername}`);
      targetSocket.emit('disconnected', { reason: 'Disconnected by admin' });
      targetSocket.disconnect(true);
    }
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

    // Broadcast updated online users list after disconnect
    broadcastOnlineUsers();
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
    // Update stored state
    const state = userVoiceStates.get(socket.id);
    if (state) {
      state.muted = data.muted;
      userVoiceStates.set(socket.id, state);
    }
    
    // Broadcast to EVERYONE (not just voice channel) so it shows in channel list
    io.emit('userMuted', {
      username: username,
      muted: data.muted
    });
  });

  socket.on('userDeafened', (data) => {
    // Update stored state
    const state = userVoiceStates.get(socket.id);
    if (state) {
      state.deafened = data.deafened;
      userVoiceStates.set(socket.id, state);
    }
    
    // Broadcast to EVERYONE (not just voice channel) so it shows in channel list
    io.emit('userDeafened', {
      username: username,
      deafened: data.deafened
    });
  });
});
}

const PORT = process.env.PORT || 4196;

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  io.emit('serverShutdown', 'Server is shutting down');
  
  setTimeout(() => {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('⚠️  Force exit - graceful shutdown timeout');
      process.exit(1);
    }, 5000);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

initializeServer();

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
    
    displayBanner();
    
    console.log(`🚀 Server running on ${protocol}://193.149.164.240:${PORT}`);
    console.log(`🌐 Domain: ${protocol}://wyvern.justneki.com`);
    
    if (isHttps) {
      console.log('🔊 Voice chat: ENABLED');
      console.log('⚠️  You may need to accept the self-signed certificate');
    } else {
      console.log('🔊 Voice chat: DISABLED (HTTP only)');
      console.log('💡 Generate SSL certificates to enable voice features');
    }
    
    // Setup Socket.IO after server is listening
    setupSocketIO();
    console.log('✅ Socket.IO initialized');
    
    console.log('\n💡 Type "help" for available commands');
    console.log('📊 Type "status" for server status');
    console.log('👥 Type "users" to see connected users\n');
    
    handleServerCommands();
  });
}).catch(err => {
  console.error('💥 Failed to connect to database:', err);
  console.error('🔍 Check your database connection string and network');
  process.exit(1);
});