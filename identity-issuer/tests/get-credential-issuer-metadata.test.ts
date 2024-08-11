// Tests for retrieving the credential issuer metadata
// The database is cleared before each test and
// after each test the server is closed

import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { app, server } from '../src/app'
import { deleteAll } from '../src/utils/connect'

const prisma = new PrismaClient()

// Calls the '/credential-issuer-metadata' route
describe('GET /credential-issuer-metadata', () => {
    beforeEach(async () => {
        await deleteAll()
    })

    afterAll(async () => {
        await prisma.$disconnect()
        server.close()
    })

    it('should return 200 and the current issuers metadata', async () => {
        // The request body of the credential issuer metadata route
        const requestBody = {
            name: 'Test Issuer',
        }

        await request(app).post('/create/issuer').send(requestBody).expect(201)

        await request(app)
            .post('/create/credential-configuration')
            .send({
                name: 'Passport',
                configuration: [
                    'name',
                    'expiryDate',
                    'address',
                    'passportNumber',
                ],
                issuerDid:
                    'did:key:z6MkfR7Mo78rCFcvYGj2ysD4oZzYguBCqCTzVoavw9Nn45gY',
            })
            .expect(201)

        // Check that the response body from calling the route
        // is in the correct format
        const response = await request(app)
            .get('/credential-issuer-metadata')
            .expect(200)

        expect(response.body).toHaveProperty('credential_issuer')
        expect(response.body).toHaveProperty('credential_endpoint')
    })
})
