// Tests for creating the token for the user/identity owner
// The database is cleared before each test and
// after each test the server is closed

import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { app, server } from '../src/app'
import { deleteAll } from '../src/utils/connect'

const prisma = new PrismaClient()

// Calls the '/token' route
describe('GET /Token', () => {
    beforeEach(async () => {
        await deleteAll()
    })

    afterAll(async () => {
        await prisma.$disconnect()
        server.close()
    })

    it('should return 200 and the current issuers metadata', async () => {
        // The request body of the create issuer route
        const requestBody = {
            name: 'Test Issuer',
        }

        await request(app).post('/create/issuer').send(requestBody).expect(201)

        // calling the '/credential-offer' route to get the token
        const offer = await request(app).get('/credential-offer').expect(200)

        console.log('offer')
        console.log(
            offer.body.grants[
                'Urn:ietf:params:oauth:grant-type:pre-authorized_code'
            ]['pre-authorized_code']
        )

        const response = await request(app)
            .post('/token')
            // The request body of the token route
            .send({
                grantType:
                    'urn:ietf:params:oauth:grant-type:pre-authorized_code',
                preAuthorizedCode:
                    offer.body.grants[
                        'Urn:ietf:params:oauth:grant-type:pre-authorized_code'
                    ]['pre-authorized_code'],
                userDid: 'did:123123123124123',
            })
            .expect(200)

        // Check that the response body from calling the route
        // is in the correct format
        expect(response.body).toHaveProperty('accesstoken')
        expect(response.body).toHaveProperty('token_type')
        expect(response.body).toHaveProperty('expires_in')
    })
})
