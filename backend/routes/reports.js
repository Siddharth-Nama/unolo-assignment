const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get daily summary report
router.get('/daily-summary', authenticateToken, requireManager, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Get all team members, including those who didn't check in
        const [users] = await pool.execute(
            'SELECT id, name, email FROM users WHERE manager_id = ?',
            [req.user.id]
        );

        // Get all check-ins for the team on the specific date
        const [checkins] = await pool.execute(
            `SELECT ch.*, u.id as employee_id, u.name as employee_name, c.name as client_name
             FROM checkins ch
             INNER JOIN users u ON ch.employee_id = u.id
             INNER JOIN clients c ON ch.client_id = c.id
             WHERE u.manager_id = ? AND date(ch.checkin_time) = ?
             ORDER BY ch.checkin_time ASC`,
            [req.user.id, targetDate]
        );

        // Aggregate data
        const summary = users.map(user => {
            const userCheckins = checkins.filter(c => c.employee_id === user.id);
            
            if (userCheckins.length === 0) {
                return {
                    employee_name: user.name,
                    status: 'Absent',
                    total_checkins: 0,
                    total_hours: 0,
                    clients_visited: []
                };
            }

            const firstCheckin = userCheckins[0].checkin_time;
            // Find last checkin that is checked out, or just last activity
            const lastCheckinObj = userCheckins[userCheckins.length - 1];
            const lastActivity = lastCheckinObj.checkout_time || lastCheckinObj.checkin_time;

            // Calculate total hours
            const totalHours = userCheckins.reduce((sum, ch) => {
                if (ch.checkout_time) {
                    const start = new Date(ch.checkin_time);
                    const end = new Date(ch.checkout_time);
                    return sum + (end - start);
                }
                return sum;
            }, 0) / (1000 * 60 * 60);

            const clientsVisited = [...new Set(userCheckins.map(c => c.client_name))];

            return {
                employee_name: user.name,
                status: 'Present',
                first_checkin: new Date(firstCheckin).toLocaleTimeString(),
                last_checkout: lastCheckinObj.checkout_time ? new Date(lastActivity).toLocaleTimeString() : 'Active',
                total_checkins: userCheckins.length,
                total_hours: parseFloat(totalHours.toFixed(1)),
                clients_visited: clientsVisited
            };
        });

        res.json({
            success: true,
            date: targetDate,
            data: summary
        });

    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

module.exports = router;
