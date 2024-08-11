import crypto from 'crypto'
import { Transaction } from './transaction'
import { PresentationDefinition } from '../PresentationDefinitionController'
import {
    DescriptorMap,
    TransactionResponse,
    VerifiableCredential,
} from './response'
import { Metadata, StorageController } from '../StorageController'
import { PresentationDefinitionController } from '../PresentationDefinitionController'
import { CustomError } from '../ErrorService'
import jsonpath from 'jsonpath'
import { PresentedCredential } from './presentedCredential'
import {
    verifyCredentials,
    verifyPresentation,
    verifyPresentationSubmission,
} from './verificationService'
import { extendContextLoader, sign, verify, purposes } from 'jsonld-signatures'

// Interface defining the structure of an authorization request
interface AuthorizationRequest {
    client_id: string
    client_id_scheme: string
    redirect_uri: string
    response_type: string
    response_mode: string
    nonce: string
    state: string
    presentation_definition: PresentationDefinition
    client_metadata: ClientMetadata
}

interface ClientMetadata {
    vp_formats: {
        ldp_vp: {
            proof_type: string[]
        }
    }
    client_name: string
    logo_uri: string
    tos_uri: string
    policy_uri: string
}

/**
 * TransactionController class manages the lifecycle of verification transactions
 */
export class TransactionController {
    // Map to store transactions with their endpoints as keys
    private transactions = new Map<string, Transaction>()
    // Map to store transaction endpoints with transaction IDs as keys
    private transactionEndpoint = new Map<string, string>()
    // Instance of StorageController for data persistence
    private storage: StorageController
    // Instance of PresentationDefinitionController for managing presentation definitions
    private pdController: PresentationDefinitionController

    /**
     * Constructor initializes the controller with storage and presentation definition controllers
     */
    constructor(
        storage: StorageController,
        pdController: PresentationDefinitionController
    ) {
        this.storage = storage
        this.pdController = pdController
    }

    /**
     * Generates a random 6-character code for transaction responses
     */
    private generateCode(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''

        for (let i = 0; i < 6; i++) {
            const randomIndex = crypto.randomInt(characters.length)
            result += characters.charAt(randomIndex)
        }
        return result
    }

    /**
     * Generates a random ID using timestamp and random bytes
     */
    private generateRandomID(): string {
        let timestamp = Date.now().toString(36)
        let randomStr = crypto.randomBytes(4).toString('hex')
        return timestamp + randomStr
    }

    /**
     * Creates a new transaction and returns its details
     */
    public new(nonce: string): {
        response_uri: string
        transaction_id: string
        request_id: string
        client_id: string
    } {
        let transaction = new Transaction(
            this.generateRandomID(),
            this.generateRandomID(),
            this.generateRandomID(),
            nonce
        )
        this.transactionEndpoint.set(
            transaction.transaction_id,
            transaction.endpoint
        )
        this.transactions.set(transaction.endpoint, transaction)
        transaction.endpoint = `${this.storage.getData().url}/verify/${transaction.endpoint}`
        return transaction.authorizationResponse()
    }

    /**
     * Generates an authorization request
     */
    public request(endpoint: string): AuthorizationRequest {
        let transaction = this.transactions.get(endpoint)

        if (transaction == undefined) {
            throw new CustomError(
                'Invalid or expired transaction endpoint',
                404
            )
        }

        let data = this.storage.getData()
        let metadata = this.storage.getMetadata()

        return {
            client_id: transaction.endpoint,
            client_id_scheme: 'redirect_uri',
            redirect_uri: transaction.endpoint,
            response_type: 'vp_token',
            response_mode: 'direct_post',
            nonce: transaction.nonce,
            state: transaction.request_id,
            presentation_definition: this.pdController.presentationDefinition,
            client_metadata: {
                vp_formats: {
                    ldp_vp: {
                        proof_type: ['BbsBlsSignature2020'],
                    },
                },
                client_name: metadata.name,
                logo_uri: `${data.url}/metadata/logo`,
                tos_uri: `${data.url}/metadata/tos`,
                policy_uri: `${data.url}/metadata/policy`,
            },
        }
    }

    /**
     * Processes a transaction response and returns a redirect URI
     */
    public async response(
        endpoint: string,
        res: TransactionResponse
    ): Promise<{ redirect_uri: string }> {
        let transaction = this.transactions.get(endpoint)
        if (transaction == undefined) {
            throw new CustomError(
                'Invalid or expired transaction endpoint',
                404
            )
        }

        if (transaction.request_id !== res.state) {
            throw new CustomError('Invalid state (request ID)', 400)
        }

        if (!Array.isArray(res.vp_token)) {
            throw new CustomError('Data integrity error', 500) // This should not happen if data integrity is maintained
        }

        // Verify Tokens
        // UNCOMMENT FOR BBS SUPPORT
        for (const vp_token of res.vp_token) {
            // await verifyPresentation(vp_token)

            for (const vc of vp_token.verifiableCredential) {
                // verifyCredentials(vc)
            }
        }

        // Checking that all required credentials are present and in the correct format
        transaction.presented_credentials = verifyPresentationSubmission(
            res,
            this.pdController.presentationDefinition
        ) // Will throw error if submission is invalid

        // Add response code and finish transaction
        transaction.response_code = this.generateCode()
        return {
            redirect_uri:
                'openid4vp://response_code=' + transaction.response_code,
        }
    }

    /**
     * Verifies the result of a transaction using transaction ID and response code
     */
    public result(
        transaction_id: string,
        responseCode: string
    ): PresentedCredential[] {
        const endpoint = this.transactionEndpoint.get(transaction_id)
        if (endpoint == undefined) {
            throw new CustomError('Invalid or expired transaction ID', 404)
        }
        const transaction = this.transactions.get(endpoint)
        if (transaction == undefined) {
            throw new CustomError('Transaction data not found', 500) // This should not happen if data integrity is maintained
        }
        if (transaction.response_code !== responseCode) {
            throw new CustomError('Incorrect Response Code', 400)
        }

        console.log(transaction.presented_credentials)

        return transaction.presented_credentials
    }
}
