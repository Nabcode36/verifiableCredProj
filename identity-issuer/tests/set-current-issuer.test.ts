// Tests for setting the current issuer in the database
// Before each test, the database is cleared and 2 issuers
// are created and after each test the server is closed

import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { deleteAll } from '../src/utils/connect'
import { app, server } from '../src/app'

const prisma = new PrismaClient()

// Calls the '/set/current-issuer' route
describe('POST /set/current-issuer', () => {
    beforeEach(async () => {
        await deleteAll()

        await request(app)
            .post('/create/issuer')
            .send({
                name: 'Test Issuer',
            })
            .expect(201)

        await request(app)
            .post('/create/issuer')
            .send({
                name: 'Test Issuer2',
            })
            .expect(201)
    })

    afterAll(async () => {
        await prisma.$disconnect()
        server.close()
    })

    // The request body of the set current issuer route to switch the current issuer to
    // Test Issuer2
    it('should change the current issuer to Test Issuer2', async () => {
        const requestBody = {
            issuerName: 'Test Issuer2',
        }

        const response = await request(app)
            .post('/set/current-issuer')
            .send(requestBody)
            .expect(200)

        // Check that the response body from calling the route
        // is in the correct format
        expect(response.body).toHaveProperty(
            'message',
            'Current issuer set successfully'
        )
        expect(response.body).toHaveProperty('issuer')
    })
})
