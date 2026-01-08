const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Mongoose Model
const { authMiddleware } = require('../auth');
const router = express.Router();

async function verifyAdmin(username) {
    const user = await User.findOne({ username });
    return user && user.isAdmin;
}

router.post('/beta/reload', authMiddleware, async (req, res) => {
    try {
        const isAdmin = await verifyAdmin(req.user.username);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        console.log(`🔄 Beta reload triggered by admin: ${req.user.username}`);
        req.io.sockets.sockets.forEach((socket) => {
            if (socket.handshake.headers.referer && socket.handshake.headers.referer.includes('/b/')) {
                socket.emit('serverRestart', 'Beta version is reloading, please refresh your page');
            }
        });
        Object.keys(require.cache).forEach((key) => {
            if (key.includes('/b/') || key.includes('\\b\\')) {
                delete require.cache[key];
            }
        });
        res.json({
            success: true,
            message: 'Beta version reloaded successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Beta reload error:', error);
        res.status(500).json({ error: 'Failed to reload beta version' });
    }
});

router.post('/reset-password', authMiddleware, async (req, res) => {
    try {
        const isAdmin = await verifyAdmin(req.user.username);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const targetUser = await User.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await User.updateOne(
            { username },
            {
                $set: {
                    password: hashedPassword,
                }
            }
        );
        console.log(`🔑 Password reset for user "${username}" by admin "${req.user.username}"`);
        res.json({
            success: true,
            message: 'Password reset successfully',
            tempPassword: tempPassword
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const isAdmin = await verifyAdmin(req.user.username);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await User.find({}, '-password').sort({ createdAt: -1 });

        res.json({
            success: true,
            users: users.map(user => ({
                username: user.username,
                isAdmin: user.isAdmin || false,
                createdAt: user.createdAt || new Date(),
            }))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

router.delete('/users/:username', authMiddleware, async (req, res) => {
    try {
        const isAdmin = await verifyAdmin(req.user.username);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        if (username === req.user.username) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const targetUser = await User.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (targetUser.isAdmin) {
            return res.status(403).json({ error: 'Cannot delete admin users' });
        }

        await User.deleteOne({ username });
        req.io.sockets.sockets.forEach((socket) => {
            if (socket.user && socket.user.username === username) {
                socket.emit('accountDeleted', 'Your account has been deleted by an administrator');
                socket.disconnect(true);
            }
        });
        console.log(`🗑️ User "${username}" deleted by admin "${req.user.username}"`);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
module.exports = router;
