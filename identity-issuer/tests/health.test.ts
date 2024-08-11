// Tests for checking the server health
// The database is cleared before each test and
// after each test the server is closed

import request from 'supertest'
import { app, server } from '../src/app'

// Calling the '/health' route
describe('GET /health', () => {
    beforeAll(() => {})

    afterAll(async () => {
        server.close()
    })

    it('should return 200 OK', async () => {
        await request(app).get('/health').expect(200)
    })
})
