import { generateKeyPairSync } from 'crypto'
import multer from 'multer'
import path from 'path'
import express, { Express, Request, Response, NextFunction } from 'express'
import {
    TransactionController,
    TransactionResponse,
} from './services/TransactionController'
import {
    PresentationDefinition,
    PresentationDefinitionController,
} from './services/PresentationDefinitionController'
import { StorageController } from './services/StorageController'
import { CustomError } from './services/ErrorService'
import { Server as SocketIOServer } from 'socket.io'
import { AuthController } from './services/AuthController'

function routes(
    app: Express,
    io: SocketIOServer,
    openid4vp: TransactionController,
    presentationDefinitionController: PresentationDefinitionController,
    storageController: StorageController,
    authController: AuthController
) {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, storageController.getUploadsDir())
        },
        filename: (req, file, cb) => {
            const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9)
            cb(
                null,
                file.fieldname +
                    '-' +
                    uniqueSuffix +
                    path.extname(file.originalname)
            )
        },
    })

    const upload = multer({ storage: storage })

    const authenticateToken = (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        // Get the Authorization header
        const authHeader = req.headers['authorization']

        // Check if the Authorization header exists and starts with 'Bearer '
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res
                .status(401)
                .json({ error: 'No token provided or invalid format' })
        }

        // Extract the token (remove 'Bearer ' from the beginning)
        const token = authHeader.split(' ')[1]

        if (!token) {
            return res.status(401).json({ error: 'No token provided' })
        }

        try {
            // Verify the token
            const isAuthenticated = authController.authenticate(token)

            if (isAuthenticated) {
                // If authentication is successful, proceed to the next middleware/route handler
                next()
            } else {
                // If authentication fails, send a 401 Unauthorized response
                res.status(401).json({ error: 'Invalid token' })
            }
        } catch (error) {
            // If an error occurs during authentication, send a 500 Internal Server Error response
            console.error('Authentication error:', error)
            res.status(500).json({
                error: 'Internal server error during authentication',
            })
        }
    }

    // Interface definitions
    interface OnboardingRequest {
        sender_id: string
    }

    interface OnboardingResult {
        device_id: string
        password: string
        url: string
        approved: boolean
        name: string
        setup: boolean
    }

    const onboardingResults = new Map<
        string,
        (result: OnboardingResult) => void
    >()

    // Web routes
    // ---------------------

    // Home page
    app.get('/', async (req: Request, res: Response) => {
        const defaultUrl = `127.0.0.1:3000`
        res.render('index', { defaultUrl })
    })

    // Generate QR code
    app.post('/generate-qr', async (req: Request, res: Response) => {
        const { url } = req.body
        await storageController.update('url', url)
        const qrCodeText = `http://${url}/onboarding`
        res.json({ qrCodeText })
    })

    // Onboarding process
    app.post(
        '/onboarding',
        (req: Request<{}, {}, OnboardingRequest>, res: Response) => {
            const { sender_id } = req.body

            // Create a new Promise that will resolve when we get a result
            const resultPromise = new Promise<OnboardingResult>((resolve) => {
                // Store the resolve function in our Map
                onboardingResults.set(sender_id, resolve)
            })

            // Emit the onboarding request to all connected clients
            io.emit('onboardingRequest', { sender_id })

            // Wait for the result and send it back
            resultPromise.then((result) => {
                res.json(result)
                // Clean up
                onboardingResults.delete(sender_id)
            })
        }
    )

    // Handle onboarding approval/rejection
    app.post(
        '/onboarding-result',
        async (
            req: Request<
                {},
                {},
                {
                    sender_id: string
                    status: 'approved' | 'rejected'
                }
            >,
            res: Response
        ) => {
            const { sender_id, status } = req.body
            const resolveFunction = onboardingResults.get(sender_id)

            if (resolveFunction) {
                if (status === 'approved') {
                    const password =
                        await authController.createNewUser(sender_id)
                    const result: OnboardingResult = {
                        device_id: sender_id,
                        password: password,
                        url: `http://${storageController.getData().url}`,
                        name: storageController.getData().name,
                        approved: true,
                        setup: storageController.getData().name !== '',
                    }
                    resolveFunction(result)
                    // Emit event to refresh approved devices list
                    io.emit('refreshApprovedDevices')
                } else {
                    const result: OnboardingResult = {
                        device_id: sender_id,
                        password: '',
                        url: '',
                        name: '',
                        approved: false,
                        setup: false,
                    }
                    resolveFunction(result)
                }
                res.json({ message: 'Result processed successfully' })
            } else {
                res.status(404).json({
                    message: 'No pending request found for this sender_id',
                })
            }
        }
    )

    // Get approved devices
    app.get('/approved-devices', (req: Request, res: Response) => {
        const devices = authController.getDevices()
        res.json(devices)
    })

    // Deauthorize a device
    app.post('/deauthorize-device', async (req, res) => {
        const { device_id } = req.body
        await authController.deauthDevice(device_id)

        // Emit an event to refresh the approved devices list for all connected clients
        io.emit('refreshApprovedDevices')

        res.json({ success: true, message: 'Device deauthorized successfully' })
    })

    // Health check
    app.get('/health', (req: Request, res: Response) => {
        res.sendStatus(200)
    })

    // Handle metadata
    app.post(
        '/metadata',
        authenticateToken,
        upload.fields([
            { name: 'logo', maxCount: 1 },
            { name: 'terms_of_service', maxCount: 1 },
            { name: 'policy', maxCount: 1 },
        ]),
        async (req: Request, res: Response) => {
            const { name, purpose } = req.body
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[]
            }

            // Prepare metadata object
            const metadata: any = { name, purpose }
            if (files.logo) metadata.logoPath = files.logo[0].path
            if (files.terms_of_service)
                metadata.tosPath = files.terms_of_service[0].path
            if (files.policy) metadata.policyPath = files.policy[0].path

            try {
                await storageController.updateMetadata(metadata)
                await storageController.update('name', metadata.name)
                res.status(200).json({
                    message: 'Metadata received and saved successfully',
                })
            } catch (error) {
                console.error('Error saving metadata:', error)
                res.status(500).json({ error: 'Failed to save metadata' })
            }
        }
    )

    // Serve logo
    app.get('/metadata/logo', async (req: Request, res: Response) => {
        const metadata = storageController.getMetadata()
        if (metadata?.logoPath) {
            res.sendFile(path.resolve(metadata.logoPath))
        } else {
            res.status(404).json({ error: 'Logo not found' })
        }
    })

    // Serve terms of service
    app.get('/metadata/tos', async (req: Request, res: Response) => {
        const metadata = storageController.getMetadata()
        if (metadata?.tosPath) {
            res.sendFile(path.resolve(metadata.tosPath))
        } else {
            res.status(404).json({ error: 'Terms of Service not found' })
        }
    })

    // Serve policy
    app.get('/metadata/policy', async (req: Request, res: Response) => {
        const metadata = storageController.getMetadata()
        if (metadata?.policyPath) {
            res.sendFile(path.resolve(metadata.policyPath))
        } else {
            res.status(404).json({ error: 'Policy not found' })
        }
    })

    // Mobile app routes
    // ---------------------

    // Search for credentials
    app.get('/search', async (req: Request, res: Response) => {
        console.log(req.query.trusted_issuers)
        return res.json([
            {
                'did:example:issuer1': [
                    {
                        id: 'www.credential1.com',
                        name: 'Credential 1',
                    },
                    {
                        id: 'www.credential2.com',
                        name: 'Credential 2',
                    },
                ],
                'did:example:issuer2': [
                    {
                        id: 'www.credential3.com',
                        name: 'Credential 3',
                    },
                ],
            },
        ])
    })

    // Handle presentation definition
    app.post(
        '/presentation_definition',
        authenticateToken,
        async (req: Request, res: Response, next) => {
            try {
                const credentials = req.body
                await storageController.update(
                    'mobile_presentation_definition',
                    JSON.stringify(credentials)
                )

                const presentationDefinition =
                    presentationDefinitionController.generate_pd(credentials)
                res.json(presentationDefinition)
            } catch (error) {
                next(error)
            }
        }
    )

    // Get presentation definition
    app.get(
        '/presentation_definition',
        authenticateToken,
        async (req: Request, res: Response, next) => {
            try {
                res.json(
                    JSON.parse(
                        storageController.getData()
                            .mobile_presentation_definition
                    )
                )
            } catch (error) {
                next(error)
            }
        }
    )

    // Get result
    app.get(
        '/result',
        authenticateToken,
        (req: Request, res: Response, next) => {
            try {
                if (
                    typeof req.query.transaction_id !== 'string' ||
                    typeof req.query.response_code !== 'string'
                ) {
                    return res.status(404)
                }
                console.log(
                    `Transaction ID: ${req.query.transaction_id}, Response Code: ${req.query.response_code}`
                )
                return res
                    .status(200)
                    .json(
                        openid4vp.result(
                            req.query.transaction_id,
                            req.query.response_code
                        )
                    )
            } catch (error) {
                next(error)
            }
        }
    )

    // OpenID4VP routes
    // ---------------------

    // Initiate verification
    app.post(
        '/verify',
        authenticateToken,
        async (req: Request, res: Response, next) => {
            try {
                if (req.body && typeof req.body.nonce === 'string') {
                    let nonce = req.body.nonce
                    let verify = openid4vp.new(nonce)

                    verify.response_uri = new URLSearchParams({
                        client_id: verify.response_uri,
                        response_uri: verify.response_uri,
                    }).toString()

                    verify.response_uri = `openid4vp://${verify.response_uri}`

                    console.log(
                        `NEW Endpoint: ${verify.response_uri} Transaction ID: ${verify.transaction_id} Request ID: ${verify.request_id}`
                    )
                    return res.json(verify)
                } else {
                    throw new CustomError('Invalid or missing nonce', 400)
                }
            } catch (error) {
                next(error)
            }
        }
    )

    // Get verification request
    app.get('/verify/:endpoint', (req: Request, res: Response, next) => {
        try {
            const authRequest = openid4vp.request(req.params.endpoint)
            return res.status(200).json(authRequest)
        } catch (error) {
            next(error)
        }
    })

    // Handle verification response
    app.post('/verify/:endpoint', async (req: Request, res: Response, next) => {
        try {
            let response = req.body as TransactionResponse
            if (!Array.isArray(response.vp_token)) {
                response.vp_token = [response.vp_token]
            }

            const result = await openid4vp.response(
                req.params.endpoint,
                response
            )
            return res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    })
}

export default routes
