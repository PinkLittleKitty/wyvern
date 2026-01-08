const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../database');
const { authMiddleware } = require('../auth');
const router = express.Router();
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 3) {
            return res.status(400).json({ error: 'New password must be at least 3 characters long' });
        }
        const user = await db.collection('users').findOne({ username: req.user.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.collection('users').updateOne(
            { username: req.user.username },
            {
                $set: {
                    password: hashedPassword,
                    passwordChangedAt: new Date()
                }
            }
        );
        console.log(`🔑 Password changed for user "${req.user.username}"`);
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
module.exports = router;
