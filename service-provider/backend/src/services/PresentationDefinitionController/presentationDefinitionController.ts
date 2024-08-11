import { StorageController } from '../StorageController'
import axios, {
    AxiosResponse,
    AxiosRequestConfig,
    RawAxiosRequestHeaders,
} from 'axios'
import { DIDResolver } from '../DIDService'
import { Credential, PresentationDefinition } from './presentationDefinition'
import { v4 as uuidv4 } from 'uuid'
import { Response } from 'express'
import { CustomError } from '../ErrorService'

/**
 * Controller for managing Presentation Definitions.
 */
export class PresentationDefinitionController {
    private storage: StorageController
    private _presentationDefinition: PresentationDefinition | null

    /**
     * Creates an instance of PresentationDefinitionController.
     * @param {StorageController} storage - The storage controller to use.
     */
    constructor(storage: StorageController) {
        this.storage = storage
        let data = storage.getData()
        this._presentationDefinition = data.presentation_definition
    }

    /**
     * Starts a search for credentials.
     * @param {string} credential - The credential path.
     * @param {string[]} trusted_issuers - Array of trusted issuer DIDs.
     */
    public start_search(credential: string, trusted_issuers: string[]) {
        // INPUT: credentials: path, trusted_issuers: [dids]
        // Loop through every trusted issuer and get the credential metadata from /.well-known/openid-credential-issuer
        // Get credential_configurations_supported
        // Loop through each Credential
        // Get credential definition
        // Check if path is in credential
    }

    /**
     * Generates a Presentation Definition based on given credentials.
     * @param {Credential[]} credentials - Array of credentials to include in the Presentation Definition.
     * @returns {PresentationDefinition} The generated Presentation Definition.
     */
    public generate_pd(credentials: Credential[]): PresentationDefinition {
        const presentationDefinition: PresentationDefinition = {
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'https://www.w3.org/2018/credentials/examples/v1',
                'https://w3id.org/security/bbs/v1',
                'https://schema.org',
            ],
            id: uuidv4(),
            format: {
                ldp_vc: {
                    proof_type: ['BbsBlsSignature2020'],
                },
            },
            input_descriptors: [],
        }

        credentials.forEach((credential) => {
            const inputDescriptor = {
                id: credential.id,
                name: credential.name,
                purpose: credential.purpose,
                constraints: {
                    fields: credential.fields.map((field) => {
                        const fieldConstraint: {
                            path: string[]
                            filter?: { type: string; pattern: string }
                        } = {
                            path: [field.path],
                        }
                        if (field.filter && field.filter.trim() !== '') {
                            fieldConstraint.filter = {
                                type: 'string',
                                pattern: field.filter,
                            }
                        }
                        return fieldConstraint
                    }),
                },
            }

            // Add issuer constraint as a field if applicable
            if (credential.selectedIssuers.length > 0) {
                const issuerPattern = credential.selectedIssuers.join('|')
                if (issuerPattern.trim() !== '') {
                    inputDescriptor.constraints.fields.push({
                        path: ['$.issuer.id'],
                        filter: {
                            type: 'string',
                            pattern: issuerPattern,
                        },
                    })
                }
            }

            // Add credentialSchema constraint as a field if applicable
            if (credential.selectedCredentialOptions.length > 0) {
                const schemaPattern =
                    credential.selectedCredentialOptions.join('|')
                if (schemaPattern.trim() !== '') {
                    inputDescriptor.constraints.fields.push({
                        path: ['$.credentialSchema'],
                        filter: {
                            type: 'string',
                            pattern: schemaPattern,
                        },
                    })
                }
            }

            presentationDefinition.input_descriptors.push(inputDescriptor)
        })

        this._presentationDefinition = presentationDefinition
        this.storage.update('presentation_definition', presentationDefinition)

        return presentationDefinition
    }

    /**
     * Gets the current Presentation Definition.
     * @returns {PresentationDefinition} The current Presentation Definition.
     * @throws {CustomError} If the Presentation Definition is not found.
     */
    get presentationDefinition(): PresentationDefinition {
        if (this._presentationDefinition == null) {
            throw new CustomError('Presentation Definition not found', 404)
        }
        return this._presentationDefinition
    }
}
