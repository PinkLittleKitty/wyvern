const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../auth');
const router = express.Router();

router.get('/:username', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            username: user.username,
            avatar: user.profilePic || null,
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
        const { bio, customStatus, profileColor, avatar, banner } = req.body;
        const updateData = {};

        if (bio !== undefined) updateData.bio = bio;
        if (customStatus !== undefined) updateData.customStatus = customStatus;
        if (profileColor !== undefined) updateData.profileColor = profileColor;
        if (avatar !== undefined) updateData.profilePic = avatar;
        if (banner !== undefined) updateData.banner = banner;

        await User.updateOne(
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
