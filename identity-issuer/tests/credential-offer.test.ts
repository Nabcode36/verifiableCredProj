// Tests for creating a credential offer
// The database is cleared before each test and
// after each test the server is closed
// The '/create/issuer' route is also called before each test

import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { app, server } from '../src/app'
import { deleteAll } from '../src/utils/connect'

const prisma = new PrismaClient()

// Calls the '/credential-offer' route
describe('GET /credential-offer', () => {
    const requestBody = {
        name: 'Test Issuer',
    }

    beforeEach(async () => {
        await deleteAll()
        await request(app).post('/create/issuer').send(requestBody).expect(201)
    })

    afterAll(async () => {
        await prisma.$disconnect()
        server.close()
    })

    // Check that the response body from calling the route
    // is in the correct format
    it('should return a valid credential offer', async () => {
        const response = await request(app).get('/credential-offer').expect(200)

        console.log(response.body)

        expect(response.body).toHaveProperty('credential_issuer')
        expect(response.body).toHaveProperty('credential_configuration_ids')
        expect(response.body).toHaveProperty('grants')
    })
})
