// Tests for creating credential configurations for issuers
// The database is cleared before each test and
// after each test the server is closed
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { deleteAll } from '../src/utils/connect'
import { app, server } from '../src/app'

const prisma = new PrismaClient()

// Calls the '/create/credential-configuration' route
describe('POST /create/credential-configuration', () => {
    beforeEach(async () => {
        await deleteAll()
        await request(app)
            .post('/create/issuer')
            // The name of the issuer who is creating the credential configuration
            .send({
                name: 'Test Issuer',
            })
            .expect(201)
    })

    afterAll(async () => {
        await prisma.$disconnect()
        server.close()
    })

    it('should return a valid credential configuration', async () => {
        // The request body of the create credential configuration route
        const requestBody = {
            name: 'Passport',
            configuration: ['name', 'expiryDate', 'address', 'passportNumber'],
            issuerDid:
                'did:key:z6MkfR7Mo78rCFcvYGj2ysD4oZzYguBCqCTzVoavw9Nn45gY',
        }

        const response = await request(app)
            .post('/create/credential-configuration')
            .send(requestBody)
            .expect(201)

        // Check that the response is in the correct format
        expect(response.body).toHaveProperty(
            'message',
            'Credential configuration created successfully'
        )
        expect(response.body).toHaveProperty('credentialConfiguration')

        const { credentialConfiguration } = response.body
        expect(credentialConfiguration).toHaveProperty('id')
        expect(credentialConfiguration).toHaveProperty('name', requestBody.name)

        // Finding the issuer who created the credential configuration using
        // their did id
        const linkedIssuer = await prisma.issuer.findUnique({
            where: { issuerDID: credentialConfiguration.issuerDID },
        })

        expect(linkedIssuer).not.toBeNull()

        // Checking that the credentialConfiguration has the correct fields from
        // the request body
        expect(credentialConfiguration).toHaveProperty(
            'credentialConfiguration',
            requestBody.configuration
        )
    })
})
