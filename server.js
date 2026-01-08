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
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { connect, getDb } = require('./database');
const { router: authRouter, authMiddleware } = require('./auth');
const profileRoutes = require('./routes/profile');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const app = express();
let currentVersion = {
  version: '1.0.0',
  build: Date.now(),
  timestamp: new Date().toISOString()
};
const watchPaths = ['public', 'server.js', 'database.js'];
watchPaths.forEach(watchPath => {
  const fullPath = path.join(__dirname, watchPath);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.includes('node_modules')) {
        currentVersion.build = Date.now();
        currentVersion.timestamp = new Date().toISOString();
        console.log(`📦 Version updated: ${currentVersion.build} (${filename} changed)`);
      }
    });
  }
});
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
  server.on('upgrade', (request, socket, head) => {
    console.log('WebSocket upgrade request received');
  });
}
let io;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      connectSrc: ["'self'", "ws:", "wss:", "https://www.google-analytics.com"],
      mediaSrc: ["'self'", "blob:"],
    },
  },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

app.use('/auth', authLimiter);

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
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    }
  }
}));
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/auth', authRouter);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
app.get('/api/version', (req, res) => {
  res.json(currentVersion);
});
app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.js'));
});

const User = require('./models/User');
const Channel = require('./models/Channel');
const Message = require('./models/Message');
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
  console.log('│   restart-beta               - Reload beta files only   │');
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
    switch (command) {
      case 'addadmin':
        if (args.length === 0) {
          console.log('❌ Usage: addadmin <username>');
          return;
        }
        try {
          const username = args[0];
          const result = await User.updateOne(
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
          const result = await User.updateOne(
            { username },
            { $set: { isAdmin: false } }
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
          const admins = await User.find({ isAdmin: true });
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

          const existing = await Channel.findOne({ name });
          if (existing) {
            console.log(`❌ Channel #${name} already exists`);
            return;
          }

          await Channel.create({ name, description, type });
          console.log(`✅ ${type} channel #${name} created`);

          const allChannels = await Channel.find({});
          io.emit('channelUpdate', allChannels.filter(c => c.type === 'text'));
          io.emit('voiceChannelUpdate', allChannels.filter(c => c.type === 'voice'));
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

          const result = await Channel.deleteOne({ name });
          if (result.deletedCount > 0) {
            if (type === 'text') {
              await Message.deleteMany({ channel: name });
              const allChannels = await Channel.find({});
              io.emit('channelUpdate', allChannels.filter(c => c.type === 'text'));
              io.emit('channelDeleted', name);
            } else {
              const voiceRooms = io.voiceRooms;
              if (voiceRooms && voiceRooms.has(name)) {
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
              const allChannels = await Channel.find({});
              io.emit('voiceChannelUpdate', allChannels.filter(c => c.type === 'voice'));
              io.emit('voiceChannelDeleted', name);
            }
            console.log(`✅ Channel #${name} deleted`);
          } else {
            console.log(`❌ Channel #${name} not found`);
          }
        } catch (err) {
          console.error('❌ Error removing channel:', err.message);
        }
        break;
      case 'listchannels':
        try {
          const channels = await Channel.find({});
          const textChannels = channels.filter(c => c.type === 'text');
          const voiceChannels = channels.filter(c => c.type === 'voice');

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
              const voiceRooms = io.voiceRooms;
              const userCount = (voiceRooms && voiceRooms.get(channel.name)?.size) || 0;
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
          const voiceRooms = io.voiceRooms;
          const totalVoiceUsers = voiceRooms ? Array.from(voiceRooms.values()).reduce((sum, room) => sum + room.size, 0) : 0;
          const totalUsers = await User.countDocuments();
          const totalMessages = await Message.countDocuments();

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
          const totalUsers = await User.countDocuments();
          const totalMessages = await Message.countDocuments();
          const totalChannels = await Channel.countDocuments({ type: 'text' });
          const totalVoiceChannels = await Channel.countDocuments({ type: 'voice' });

          const connectedUsers = io.sockets.sockets.size;
          const voiceRooms = io.voiceRooms;
          const totalVoiceUsers = voiceRooms ? Array.from(voiceRooms.values()).reduce((sum, room) => sum + room.size, 0) : 0;

          const messagesByChannel = await Message.aggregate([
            { $group: { _id: '$channel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]);

          const topUsers = await Message.aggregate([
            { $group: { _id: '$username', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]);

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
          const result = await Message.updateMany(
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
          const totalMessages = await Message.countDocuments();
          const messagesByChannel = await Message.aggregate([
            { $group: { _id: '$channel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]);
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
      case 'restart-beta':
        console.log('🔄 Reloading beta version files...');
        console.log('📢 Notifying beta users only...');
        io.sockets.sockets.forEach((socket) => {
          if (socket.handshake.headers.referer && socket.handshake.headers.referer.includes('/b/')) {
            socket.emit('serverRestart', 'Beta version is reloading, please refresh your page');
          }
        });
        Object.keys(require.cache).forEach((key) => {
          if (key.includes('/b/') || key.includes('\\b\\')) {
            delete require.cache[key];
          }
        });
        console.log('✅ Beta files cache cleared');
        console.log('💡 Beta users should refresh their browsers');
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
    const channels = await Channel.find({});
    res.json(channels.filter(c => c.type === 'text'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});
function setupSocketIO() {
  require('./sockets')(io);
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
initializeServer();
connect().then(async () => {
  const existingChannels = await Channel.countDocuments();
  if (existingChannels === 0) {
    await Channel.insertMany(defaultChannels);
    await Channel.insertMany(defaultVoiceChannels);
    console.log('✅ Default channels created');
  } else {
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