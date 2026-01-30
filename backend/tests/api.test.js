const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 2, role: 'employee', email: 'test@unolo.com' }; // Mock Employee
        next();
    },
    requireManager: (req, res, next) => {
        // Mock simple pass for testing manager routes
        req.user = { id: 1, role: 'manager', email: 'manager@unolo.com' };
        next();
    }
}));

// Mock DB
jest.mock('../config/database', () => ({
    execute: jest.fn()
}));

const db = require('../config/database');
const checkinRoutes = require('../routes/checkin');

const app = express();
app.use(bodyParser.json());
app.use('/api/checkin', checkinRoutes);

describe('Check-in API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('POST /api/checkin should return 400 if client_id is missing', async () => {
        const res = await request(app)
            .post('/api/checkin')
            .send({ latitude: 10, longitude: 20 });
        
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Client ID is required');
    });

    test('POST /api/checkin should return 403 if user not assigned', async () => {
        // Mock assignments check returning empty
        db.execute.mockResolvedValueOnce([[]]); // check assignments

        const res = await request(app)
            .post('/api/checkin')
            .send({ client_id: 99, latitude: 10, longitude: 20 });
        
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('You are not assigned to this client');
    });
});
