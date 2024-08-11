// Tests for creating issuers
// The database is cleared before each test and
// after each test the server is closed

import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { deleteAll } from '../src/utils/connect'
import { app, server } from '../src/app'

const prisma = new PrismaClient()

// Calls the '/create/issuer' route
describe('POST /create/issuer', () => {
    beforeEach(async () => {
        await deleteAll()
    })

    afterAll(async () => {
        await prisma.$disconnect()
        server.close()
    })

    it('should return a valid issuer creation response', async () => {
        // The request body of the create issuer route
        const requestBody = {
            name: 'Test Issuer',
        }

        const response = await request(app)
            .post('/create/issuer')
            .send(requestBody)
            .expect(201)

        // Check that the response body from calling the route
        // is in the correct format
        expect(response.body).toHaveProperty(
            'message',
            'Issuer created successfully'
        )
        expect(response.body).toHaveProperty('issuer')

        const { issuer } = response.body
        expect(issuer).toHaveProperty('id')
        expect(issuer).toHaveProperty('name', requestBody.name)

        // The created issuer should exist in the database and it should
        // have the correct fields and values.
        const createdIssuer = await prisma.issuer.findUnique({
            where: { id: issuer.id },
        })

        expect(createdIssuer).not.toBeNull()
        expect(createdIssuer).toHaveProperty('name', requestBody.name)
    })
})
