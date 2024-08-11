// These are all the routes used in the backend server for credential issuance
// These routes are to be called by the issuer CLI, the identity owner wallet
// and the Service Provider. The routes utilise several functions from the files
// in the ./utils directory mainly for interacting with the database

import { Express, Request, Response } from 'express'
import {
    createCredential,
    createCredentialConfiguration,
    createIssuer,
    findCredentialByUserIdAndCredentialConfigurationId,
    findCredentialConfiguration,
    findIssuerByDID,
    getAllConfigerationsSupported,
    getAllCredentialConfigurations,
    getCredentialConfigurationFromName,
    getCurrentIssuer,
    getDidDoc,
    getIssuer,
    setCurrentIssuer,
    getIssuerList,
    createUser,
    getCurrentUser,
    setCurrentUser,
    getUserList,
    getUser,
    getUserProps,
} from './utils/connect'
import logger from './utils/logger'
import {
    generateDid,
    generatePreAuthCode,
    generateAccessToken,
} from './utils/issuer_functions'
import {
    credentialIssuerMetadataSchema,
    credentialOfferSchema,
    step3ResponseObject,
    tokenResponseSchema,
} from './utils/zod-types'
import config from 'config'
import dayjs from 'dayjs'
import { importPKCS8, importSPKI } from 'jose'

// Declaring the pre authorised code, which will contain a value
// when the credential offer route is called and will be used to
// compare the code provided by the user in the token request.
let preAuthCode = ''

function routes(app: Express) {
    app.get('/health', (req: Request, res: Response) => {
        logger.info('Health Checked')
        res.sendStatus(200)
    })

    // Creates the credential offer for the identity owner. The credential offer is
    // type checked using the credentialOfferSchema from './utils/zod-types.ts'
    app.get('/credential-offer', async (req: Request, res: Response) => {
        try {
            const credentialConfigurationIds =
                await getAllCredentialConfigurations()
            preAuthCode = generatePreAuthCode()
            const currentIssuer = await getCurrentIssuer()
            let issuerDid = currentIssuer?.issuerDID || ''

            // The following logic converts the issuer's did into a URL based on the
            // did:web specification
            if (issuerDid.startsWith('did:web:')) {
                issuerDid = issuerDid.slice('did:web:'.length)
            }

            issuerDid = decodeURIComponent(issuerDid)

            const parts = issuerDid
                .split(':')
                .map((part) => encodeURIComponent(part))
            let encodedIssuerDid = parts.join(':')
            logger.info(encodedIssuerDid)

            const firstColonIndex = encodedIssuerDid.indexOf(':')
            if (firstColonIndex !== -1) {
                encodedIssuerDid =
                    encodedIssuerDid.substring(0, firstColonIndex + 1) +
                    encodedIssuerDid
                        .substring(firstColonIndex + 1)
                        .replace(/:/g, '/')
            }
            logger.info(encodedIssuerDid)

            // Generating URL for the issuer adding the 'http://' prefix
            const issuerUrl = new URL(`http://${encodedIssuerDid}`).toString()
            logger.info(issuerUrl)

            // Generating the response object for the credential offer
            const testData = {
                credential_issuer: issuerUrl,
                credential_configuration_ids: credentialConfigurationIds,
                grants: {
                    'Urn:ietf:params:oauth:grant-type:pre-authorized_code': {
                        'pre-authorized_code': preAuthCode,
                        interval: '5',
                    },
                },
            }

            logger.info(testData)

            // Parsing the testData object to the credentialOfferSchema
            const credentialOffer = credentialOfferSchema.safeParse(testData)

            // Logic for checking if the credentialOffer is in the correct format
            if (credentialOffer.success) {
                const jsonData = JSON.stringify(credentialOffer.data, null, 2) // The second argument null, 2 is for pretty-printing
                logger.info('Formatted JSON:' + jsonData)
                res.status(200).json(JSON.parse(jsonData))
            } else {
                logger.error('Validation errors:' + credentialOffer.error)
                res.status(400).json({ error: credentialOffer.error })
            }
        } catch (error) {
            logger.error(`Error sending credential offer: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // Generates the credential issuer metadata, which contains essential information about
    // the current issuer including endpoints and credential configurations supported
    app.get(
        '/credential-issuer-metadata',
        async (req: Request, res: Response) => {
            try {
                const issuerDid = await getCurrentIssuer()

                if (!issuerDid) {
                    throw new Error('No current issuer')
                }

                let TestIssuer = issuerDid.issuerDID || ''
                logger.info(issuerDid.issuerDID)

                // The following logic converts the issuer's did into a URL based on the
                // did:web specification
                if (TestIssuer.startsWith('did:web:')) {
                    TestIssuer = TestIssuer.slice('did:web:'.length)
                }

                TestIssuer = decodeURIComponent(TestIssuer)

                const parts = TestIssuer.split(':').map((part) =>
                    encodeURIComponent(part)
                )
                let encodedIssuerDid = parts.join(':')
                logger.info(encodedIssuerDid)

                const firstColonIndex = encodedIssuerDid.indexOf(':')
                if (firstColonIndex !== -1) {
                    encodedIssuerDid =
                        encodedIssuerDid.substring(0, firstColonIndex + 1) +
                        encodedIssuerDid
                            .substring(firstColonIndex + 1)
                            .replace(/:/g, '/')
                }
                logger.info(encodedIssuerDid)

                logger.info('JUst before URL')

                // Generating URL for the issuer adding the 'http://' prefix
                const issuerUrl = new URL(
                    `http://${encodedIssuerDid}`
                ).toString()
                logger.info('issuerUrl')
                logger.info(issuerUrl)

                const did = await getDidDoc(issuerDid.issuerDID)

                if (!did) {
                    throw new Error('DID document not found')
                }

                const credential_configurations_supported =
                    await getAllConfigerationsSupported(did.issuerDID)
                logger.info('credential_configurations_supported')
                logger.info(credential_configurations_supported)

                // Generating the response object for the credential issuer metadata
                const credentialIssuerMetadata = {
                    credential_issuer: issuerDid.issuer.name,
                    credential_endpoint: issuerUrl,
                    credential_configurations_supported:
                        credential_configurations_supported,
                }

                // Parsing the testData object to the credentialIssuerMetadata schema
                const credentialOffer =
                    credentialIssuerMetadataSchema.safeParse(
                        credentialIssuerMetadata
                    )

                const responseObject = step3ResponseObject.safeParse({
                    ...credentialOffer.data,
                    'Token-Endpoint':
                        config.get<string>('IDENITY_ISSUER_URL') + '/token',
                    'Credential-Request-Endpoint':
                        config.get<string>('IDENITY_ISSUER_URL') +
                        '/credential-request',
                })

                logger.info(credentialOffer)

                // Logic for checking if the credentialOffer is in the correct format
                if (credentialOffer.success && responseObject.success) {
                    const jsonData = JSON.stringify(
                        responseObject.data,
                        null,
                        2
                    ) // The second argument null, 2 is for pretty-printing
                    logger.info(
                        'credential-issuer-metadata requested, Formatted JSON:' +
                            jsonData
                    )
                    // Respond with the Credential Offer Object
                    res.status(200).json(JSON.parse(jsonData))
                } else {
                    if (credentialOffer.success) {
                        logger.error(
                            'credential-issuer-metadata requested Validation errors:' +
                                responseObject.error
                        )
                        res.status(400).json({ error: responseObject.error })
                    } else {
                        logger.error(
                            'credential-issuer-metadata requested Validation errors:' +
                                credentialOffer.error
                        )
                        res.status(400).json({ error: credentialOffer.error })
                    }
                }
            } catch (error) {
                logger.error(`Error sending credential offer: ${error}`)
                res.status(500).json({
                    error: 'Internal Server Error',
                })
            }
        }
    )

    // An interface for user values extracted from the user's props field
    interface UserValues {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findValues(obj: any, keysToFind: string[]): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = {}

        // The following code is used to extract the user props data and make sure that
        // it is in the correct format as defined by the UserValues interface
        for (const keyPath of keysToFind) {
            const keys = keyPath.split('.')
            let value = obj
            let found = true

            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key]
                } else {
                    found = false
                    break
                }
            }

            if (found) {
                let current = result
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!(keys[i] in current)) {
                        current[keys[i]] = {}
                    }
                    current = current[keys[i]]
                }
                current[keys[keys.length - 1]] = value
            }
        }

        return result
    }

    // This is the credential endpoint provided to the user in the credential issuer metadata.
    // The user provides the desired credential format/configuration they want to be made
    app.post('/credential-request', async (req: Request, res: Response) => {
        const { format } = req.body

        const user = await getCurrentUser()
        if (!user) {
            throw new Error('No current user')
        }

        // Typecasting the user props to the UserValues interface
        const userValues = (await getUserProps(user?.userDID)) as UserValues

        if (!userValues) {
            throw new Error('No current userValues')
        }

        // Finding the credential configuration based on the format requested by
        // the user
        const CredentialConfiguration =
            await getCredentialConfigurationFromName(format)

        const CredentialReturnElements =
            CredentialConfiguration?.credentialConfiguration as string[]

        let FinalCredential = {}

        // Ensuring that the final credential response is of the correct format
        if (
            CredentialReturnElements &&
            Array.isArray(CredentialReturnElements)
        ) {
            FinalCredential = findValues(userValues, CredentialReturnElements)
        }

        const match = CredentialConfiguration?.issuerDID.match(/issuer:(.*)/)
        const name = match ? match[1] : ''

        // Return object for credential is based on the W3C specification for
        // verifiable credentials https://www.w3.org/TR/vc-data-model-2.0/
        const returnObject = {
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'https://w3id.org/security/bbs/v1',
            ],
            type: ['VerifiableCredential', CredentialConfiguration?.name],
            issuer: {
                id: CredentialConfiguration?.issuerDID,
                name: name,
            },
            expirationDate: dayjs().add(5, 'year'),
            name: CredentialConfiguration?.name,
            credentialSubject: {
                id: CredentialConfiguration?.issuerDID,
                type: [CredentialConfiguration?.name, 'Person'],
                ...FinalCredential,
            },
            proof: {
                type: 'BbsBlsSignature2020',
                created: dayjs(),
                verificationMethod: CredentialConfiguration?.issuerDID,
                proofPurpose: 'assertionMethod',
                proofValue: '',
            },
        }
        console.log('FinalCredential', FinalCredential)
        const finalObject = returnObject

        console.log('FinalCredential STRING: ', JSON.stringify(returnObject))

        res.json({ credential: finalObject })
    })

    // When called this route creates a credential issuer, providing the name of
    // the issuer in the body
    app.post('/create/issuer', async (req: Request, res: Response) => {
        const { name } = req.body

        const didDoc = await generateDid(name)

        if (!didDoc) {
            throw new Error('No current didDoc')
        }

        logger.info(didDoc.keys)

        // This accesses the required fields in the issuer's did Document
        // generated from the generateDid function in ./utils/issuer_functions.ts
        const privateKey = didDoc[0].keys[0].privateKey
        const publicKey = didDoc[0].keys[0].publicKey
        const didID = didDoc[0].id

        // create the issuer and set it as the current issuer if there aren't
        // any current issuers
        try {
            const issuer = await createIssuer(
                name,
                publicKey,
                privateKey,
                didDoc,
                didID
            )

            const currentIssuer = await getCurrentIssuer()

            if (!currentIssuer) {
                setCurrentIssuer(issuer)
            }

            res.status(201).json({
                message: 'Issuer created successfully',
                issuer: issuer,
            })
        } catch (error) {
            logger.error(`Error creating issuer: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // When called this route creates a user (identity owner), providing the name of
    // the id and the props (user data) in the body
    app.post('/create/user', async (req: Request, res: Response) => {
        const { userId, props } = req.body

        // create the user and set it as the current user if there aren't
        // any current users
        try {
            const user = await createUser(userId, props)
            const currentUser = await getCurrentUser()

            if (!currentUser) {
                setCurrentUser(user)
            }
            res.status(201).json({
                message: 'user created successfully',
                user: user,
            })
        } catch (error) {
            logger.error(`Error creating user: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // This route gets the current issuer from the database to be used in the CLI
    // for display purposes
    app.get('/get/current-issuer', async (req: Request, res: Response) => {
        try {
            const issuer = await getCurrentIssuer()

            if (!issuer) {
                throw new Error('No current issuer')
            }
            res.status(200).json(issuer)
        } catch (error) {
            console.error(`Error getting current issuer: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // This route sets an existing issuer identified through the issuerName
    // in the body to be the current issuer in the database for CLI functionality
    app.post('/set/current-issuer', async (req: Request, res: Response) => {
        const { issuerName } = req.body

        try {
            const issuer = await getIssuer(issuerName)

            if (!issuer) {
                throw new Error('No issuer with that name')
            }

            await setCurrentIssuer(issuer)

            res.status(200).json({
                message: 'Current issuer set successfully',
                issuer: issuer,
            })
        } catch (error) {
            console.error(`Error setting current issuer: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // This route gets the current issuer from the database to be used in the CLI
    // for display purposes
    app.get('/get/current-user', async (req: Request, res: Response) => {
        try {
            const user = await getCurrentUser()

            if (!user) {
                throw new Error('No current user')
            }
            res.status(200).json(user)
        } catch (error) {
            console.error(`Error getting current user: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // This route sets an existing user identified through the userId
    // in the body to be the current user in the database for CLI functionality
    app.post('/set/current-user', async (req: Request, res: Response) => {
        const { userId } = req.body

        try {
            const user = await getUser(userId)

            if (!user) {
                throw new Error('No user with that name')
            }

            await setCurrentUser(user)

            res.status(200).json({
                message: 'Current user set successfully',
                user: user,
            })
        } catch (error) {
            console.error(`Error setting current user: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // When called this route creates a credential configuration, providing the
    // name of the configuration and the configuration fields in the body
    app.post(
        '/create/credential-configuration',
        async (req: Request, res: Response) => {
            const { name, configuration } = req.body

            const issuerDid = await getCurrentIssuer()

            if (!issuerDid) {
                throw new Error('No current issuer')
            }

            try {
                const credentialConfiguration =
                    await createCredentialConfiguration(
                        name,
                        configuration,
                        issuerDid.issuerDID
                    )

                res.status(201).json({
                    message: 'Credential configuration created successfully',
                    credentialConfiguration: credentialConfiguration,
                })
            } catch (error) {
                logger.error(
                    `Error creating credential configuration: ${error}`
                )
                res.status(500).json({
                    error: 'Internal Server Error',
                })
            }
        }
    )

    // This route is called by the issuer to create a credential.
    // This body requires the credential id, the user's id and public key,
    // when the credential is issued and when its valid until
    // name of the configuration and the configuration fields in the body
    app.post('/create/credential', async (req: Request, res: Response) => {
        const { userId, credentialId, userPublicKey, issuedAt, validUntil } =
            req.body

        const issuerDid = await getCurrentIssuer()

        if (!issuerDid) {
            throw new Error('No current issuer')
        }

        try {
            const credential = await createCredential(
                issuerDid.issuerDID,
                userId,
                credentialId,
                userPublicKey,
                issuedAt,
                validUntil
            )

            res.status(201).json({
                message: 'Credential created successfully',
                credential: credential,
            })
        } catch (error) {
            logger.error(`Error creating credential: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // This is the token endpoint which is provided in the credential issuer metadata. This is
    // called by the user (identity owner) and they need to provide the grant type, the
    // pre-authorized code received from the credential offer route and their user did
    // to access their id for generating the token proof
    app.post('/token', async (req: Request, res: Response) => {
        const { grantType, preAuthorizedCode, userDid } = req.body

        // The following logic tests for edge cases regarding the body contents and follows the open id
        // spec from https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-6
        try {
            if (Object.keys(req.body).length > 3) {
                res.status(400).json({ error: 'invalid_request' })
            }
            if (
                preAuthorizedCode != '' &&
                preAuthorizedCode == preAuthCode &&
                grantType ==
                    'urn:ietf:params:oauth:grant-type:pre-authorized_code'
            ) {
                const issuerDid = await getCurrentIssuer()

                if (!issuerDid) {
                    throw new Error('No current issuer')
                }

                const issuer = await findIssuerByDID(issuerDid.issuerDID)

                if (!issuer) {
                    throw new Error('DID document not found')
                }

                // Using the jose npm package functions to convert the PEM RSA
                // keys of the credential issuer
                const privateKey = await importPKCS8(issuer.privateKey, 'RS256')
                const publicKey = await importSPKI(issuer.publicKey, 'RS256')
                const issuerDidDocument = issuer?.didDoc

                const token = await generateAccessToken(
                    issuerDidDocument,
                    privateKey,
                    publicKey,
                    userDid
                )
                const tokenData = {
                    accesstoken: token,
                    token_type: 'JWT',
                    expires_in: '300',
                }

                // Parsing the tokenData to the tokenResponseSchema
                const tokenResponse = tokenResponseSchema.safeParse(tokenData)

                // Checking that the token response object is in the correct format
                if (tokenResponse.success) {
                    // second argument is null (no replacer), 2 spaces for pretty printing
                    const jsonData = JSON.stringify(tokenResponse.data, null, 2)
                    logger.info('Formatted JSON:' + jsonData)
                    res.status(200).json(JSON.parse(jsonData))
                }
                // Checks if the req.body's pre-authorized code is the same as the pre-authorized code
                // saved from the called credential offer endpoint from the user
            } else if (
                preAuthorizedCode == '' ||
                preAuthorizedCode != preAuthCode
            ) {
                res.status(400).json({ error: 'invalid_code' })
            } else if (
                grantType !=
                'urn:ietf:params:oauth:grant-type:pre-authorized_code'
            ) {
                res.status(400).json({ error: 'invalid_grant_type' })
            }
        } catch (error) {
            logger.error(`Error requesting token: ${error}`)
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }
    })

    // This route gets the credential configuration from its id and
    // is to be used by the issuer
    app.get(
        '/get/credential/:id/configuration',
        async (req: Request, res: Response) => {
            const credentialId = req.params.id

            try {
                const credential =
                    await findCredentialConfiguration(credentialId)

                if (!credential) {
                    return res
                        .status(404)
                        .json({ error: 'Credential not found' })
                }

                res.status(200).json(credential)
            } catch (error) {
                logger.error('Error fetching credential configuration:', error)
                res.status(500).json({ error: 'Internal Server Error' })
            }
        }
    )

    // This route gets the issuer's did Document from its did Id and
    // is to be used by the Service Provider to retrieve the issuer's
    // did document
    app.get('/get/issuer/:did', async (req: Request, res: Response) => {
        const issuerDID = req.params.did

        try {
            const issuer = await findIssuerByDID(issuerDID)

            if (!issuer) {
                return res.status(404).json({ error: 'Issuer not found' })
            }

            res.status(200).json(issuer.didDoc)
        } catch (error) {
            logger.error('Error fetching issuer:', error)
            res.status(500).json({ error: 'Internal Server Error' })
        }
    })

    // This route gets a specific user's credential based on their
    // id and the credential configuration id
    app.get(
        '/get/credential/:userId/:credentialConfigurationId',
        async (req: Request, res: Response) => {
            const { userId, credentialConfigurationId } = req.params

            try {
                const credential =
                    await findCredentialByUserIdAndCredentialConfigurationId(
                        credentialConfigurationId,
                        userId
                    )

                if (!credential) {
                    return res
                        .status(404)
                        .json({ error: 'Credential not found' })
                }

                res.status(200).json(credential)
            } catch (error) {
                logger.error('Error fetching credential:', error)
                res.status(500).json({ error: 'Internal Server Error' })
            }
        }
    )

    // This route is to be called by the issuer CLI to display the list
    // of all existing issuers in the database
    app.get('/get/issuer-list', async (req: Request, res: Response) => {
        try {
            const issuerList = await getIssuerList()

            if (!issuerList) {
                return res.status(404).json({ error: 'issuer list not found' })
            }

            res.status(200).json(issuerList)
        } catch (error) {
            logger.error('Error fetching issuer list:', error)
            res.status(500).json({ error: 'Internal Server Error' })
        }
    })

    // This route is to be called by the issuer CLI to display the list
    // of all existing users in the database
    app.get('/get/user-list', async (req: Request, res: Response) => {
        try {
            const userList = await getUserList()

            if (!userList) {
                return res.status(404).json({ error: 'user list not found' })
            }

            res.status(200).json(userList)
        } catch (error) {
            logger.error('Error fetching user list:', error)
            res.status(500).json({ error: 'Internal Server Error' })
        }
    })
}

export default routes
