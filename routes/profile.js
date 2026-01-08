const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../auth');
const router = express.Router();
router.get('/:username', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            username: user.username,
            avatar: user.avatar || null,
            banner: user.banner || null,
            bio: user.bio || '',
            customStatus: user.customStatus || '',
            profileColor: user.profileColor || '#8b5cf6',
            createdAt: user.createdAt || new Date()
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');
        const { bio, customStatus, profileColor, avatar, banner } = req.body;
        const updateData = {};
        if (bio !== undefined) updateData.bio = bio;
        if (customStatus !== undefined) updateData.customStatus = customStatus;
        if (profileColor !== undefined) updateData.profileColor = profileColor;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (banner !== undefined) updateData.banner = banner;
        await usersCollection.updateOne(
            { username: req.user.username },
            { $set: updateData }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
module.exports = router;
