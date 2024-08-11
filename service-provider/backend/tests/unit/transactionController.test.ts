import { TransactionController, TransactionResponse, VerifiableCredential, VPToken, PresentedCredential } from '../../src/services/TransactionController';
import { StorageController } from '../../src/services/StorageController';
import { PresentationDefinitionController } from '../../src/services/PresentationDefinitionController';
import {CustomError, DataNotInitializedError} from '../../src/services/ErrorService';
import { PresentationDefinition } from '../../src/services/PresentationDefinitionController';
import {StorageData} from "../../src/services/StorageController/storageController";

// Mock dependencies
jest.mock('../../src/services/StorageController');
jest.mock('../../src/services/PresentationDefinitionController');
describe('TransactionController', () => {
    let transactionController: TransactionController;
    let mockStorageController: jest.Mocked<StorageController>;
    let mockPDController: jest.Mocked<PresentationDefinitionController>;

    const mockStorageData: StorageData = {
        metadata: {
            name: 'Test Metadata',
            purpose: 'Test Purpose'
        },
        name: 'Test Name',
        did: 'did:example:123',
        url: 'https://example.com',
        hash: { testDevice: 'testhash' },
        mobile_presentation_definition: '',
        presentation_definition: {
            '@context': [],
            id: 'test-id',
            format: { ldp_vc: { proof_type: ['TestProof'] } },
            input_descriptors: [
                {
                    id: 'test-descriptor',
                    name: 'Test Descriptor',
                    purpose: 'Test Purpose',
                    constraints: {
                        fields: [
                            {
                                path: ['$.credentialSubject.test'],
                                filter: {
                                    type: 'string',
                                    pattern: '^test$'
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };

    beforeEach(async () => {
        mockStorageController = new StorageController() as jest.Mocked<StorageController>;
        mockStorageController.getData.mockReturnValue(mockStorageData);
        mockStorageController.getMetadata.mockReturnValue(mockStorageData.metadata);
        mockStorageController.initialise.mockResolvedValue();

        // Create a mock PresentationDefinition
        const mockPresentationDefinition: {
            input_descriptors: {
                purpose: string;
                name: string;
                id: string;
                constraints: { fields: { filter: { pattern: string; type: string }; path: string[] }[] }
            }[];
            id: string
        } = {
            id: 'test-id',
            input_descriptors: [{
                id: 'test-descriptor',
                name: 'Test Descriptor',
                purpose: 'Test Purpose',
                constraints: {
                    fields: [{
                        path: ['$.credentialSubject.test'],
                        filter: {
                            type: 'string',
                            pattern: '^test$',
                        },
                    }],
                },
            }],
        };

        // Mock the entire PresentationDefinitionController
        mockPDController = {
            storage: mockStorageController,
            start_search: jest.fn(),
            generate_pd: jest.fn(),
            get presentationDefinition(): {
                input_descriptors: {
                    purpose: string;
                    name: string;
                    id: string;
                    constraints: { fields: { filter: { pattern: string; type: string }; path: string[] }[] }
                }[];
                id: string
            } {
                return mockPresentationDefinition;
            },
        } as unknown as jest.Mocked<PresentationDefinitionController>;

        transactionController = new TransactionController(
            mockStorageController,
            mockPDController
        )

        transactionController = new TransactionController(mockStorageController, mockPDController);
        await mockStorageController.initialise();
    });

    describe('new', () => {
        it('should create a new transaction', () => {
            const result = transactionController.new('test-nonce');
            expect(result).toHaveProperty('response_uri');
            expect(result).toHaveProperty('transaction_id');
            expect(result).toHaveProperty('request_id');
            expect(result).toHaveProperty('client_id');
            expect(result.response_uri).toContain('https://example.com/verify/');
        });

        it('should throw an error if storage is not initialized', () => {
            mockStorageController.getData.mockImplementation(() => {
                throw new DataNotInitializedError();
            });
            expect(() => transactionController.new('test-nonce')).toThrow(DataNotInitializedError);
        });

    });

    describe('request', () => {
        it('should generate an authorization request for a valid endpoint', () => {
            const { response_uri } = transactionController.new('test-nonce');
            const request = transactionController.request(response_uri.split('/verify/')[1]);
            expect(request).toHaveProperty('client_id', response_uri);
            expect(request).toHaveProperty('nonce', 'test-nonce');
            expect(request.client_metadata).toHaveProperty('client_name', 'Test Metadata');
        });

        it('should throw an error for an invalid endpoint', () => {
            expect(() => transactionController.request('invalid-endpoint')).toThrow(CustomError);
        });

        it('should include all required properties in the authorization request', () => {
            const { response_uri } = transactionController.new('test-nonce')
            const request = transactionController.request(response_uri.split('/verify/')[1])

            expect(request).toHaveProperty('client_id_scheme', 'redirect_uri')
            expect(request).toHaveProperty('redirect_uri')
            expect(request).toHaveProperty('response_type', 'vp_token')
            expect(request).toHaveProperty('response_mode', 'direct_post')
            expect(request).toHaveProperty('nonce')
            expect(request).toHaveProperty('state')
            expect(request).toHaveProperty('presentation_definition')
            expect(request).toHaveProperty('client_metadata')

            expect(request.client_metadata).toHaveProperty('vp_formats')
            expect(request.client_metadata).toHaveProperty('logo_uri')
            expect(request.client_metadata).toHaveProperty('tos_uri')
            expect(request.client_metadata).toHaveProperty('policy_uri')
        })
    });

    describe('response', () => {
        it('should process a valid response', async () => {
            const { response_uri, request_id } = transactionController.new('test-nonce');
            const endpoint = response_uri.split('/verify/')[1];
            const mockVPToken: VPToken = {
                '@context': [],
                type: ['VerifiablePresentation'],
                verifiableCredential: [
                    {
                        '@context': [],
                        id: 'test-vc-id',
                        type: ['VerifiableCredential'],
                        issuer: { id: 'did:example:issuer' },
                        credentialSubject: { test: 'test' },
                        expirationDate: new Date('2030-01-01'),
                        proof: {
                            type: 'BbsBlsSignature2020',
                            created: '2023-01-01',
                            proofPurpose: 'assertionMethod',
                            proofValue: 'test-proof-value',
                            verificationMethod: 'test-verification-method',
                            challenge: 'test-challenge'
                        }
                    }
                ],
                id: 'test-vp-id',
                holder: 'did:example:holder',
                proof: {
                    type: 'BbsBlsSignature2020',
                    created: '2023-01-01',
                    proofPurpose: 'authentication',
                    proofValue: 'test-proof-value',
                    verificationMethod: 'test-verification-method',
                    challenge: 'test-challenge'
                }
            };
            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "test-submission-id",
                    definition_id: "test-id",
                    descriptor_map: [
                        {
                            id: 'test-descriptor',
                            format: 'ldp_vp',
                            path: '$',
                            path_nested: {
                                format: 'ldp_v',
                                path: '$.verifiableCredential[0]'
                            }
                        }
                    ],
                },
                state: request_id,  // Use the request_id as the state
            };
            const result = await transactionController.response(endpoint, mockResponse);
            expect(result).toHaveProperty('redirect_uri');
            expect(result.redirect_uri).toMatch(/^openid4vp:\/\/response_code=[A-Z0-9]{6}$/);
        });

        it('should throw an error for an invalid endpoint', async () => {
            const mockResponse: TransactionResponse = {
                vp_token: [],
                presentation_submission: {
                    id: "id",
                    definition_id: "definition_id",
                    descriptor_map: [],
                },
                state: 'test-state',
            };
            await expect(transactionController.response('invalid-endpoint', mockResponse)).rejects.toThrow(CustomError);
        });

        it('should throw an error for mismatched state', async () => {
            const { response_uri } = transactionController.new('test-nonce');
            const endpoint = response_uri.split('/verify/')[1];
            const mockResponse: TransactionResponse = {
                vp_token: [],
                presentation_submission: {
                    id: "id",
                    definition_id: "definition_id",
                    descriptor_map: [],
                },
                state: 'mismatched-state',
            };
            await expect(transactionController.response(endpoint, mockResponse)).rejects.toThrow(CustomError);
        });

        it('should successfully process a valid VPToken', async () => {
            const { response_uri, request_id } = transactionController.new('test-nonce')
            const endpoint = response_uri.split('/verify/')[1]

            // Create a mock valid VPToken
            const validVPToken: VPToken = {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiablePresentation'],
                verifiableCredential: [
                    {
                        '@context': [],
                        id: 'test-vc-id',
                        type: ['VerifiableCredential'],
                        issuer: { id: 'did:example:issuer' },
                        credentialSubject: { test: 'test' },
                        expirationDate: new Date('2030-01-01'),
                        proof: {
                            type: 'BbsBlsSignature2020',
                            created: '2023-01-01',
                            proofPurpose: 'assertionMethod',
                            proofValue: 'test-proof-value',
                            verificationMethod: 'test-verification-method',
                            challenge: 'test-challenge',
                        },
                    },
                ],
                id: 'test-vp-id',
                holder: 'did:example:holder',
                proof: {
                    type: 'BbsBlsSignature2020',
                    created: '2023-01-01',
                    proofPurpose: 'authentication',
                    proofValue: 'test-proof-value',
                    verificationMethod: 'test-verification-method',
                    challenge: 'test-challenge',
                },
            }

            const mockResponse: TransactionResponse = {
                vp_token: [validVPToken],
                presentation_submission: {
                    id: 'test-submission-id',
                    definition_id: 'test-id',
                    descriptor_map: [{
                        id: 'test-descriptor',
                        format: 'ldp_vp',  // Changed from 'ldp_vc' to 'ldp_vp'
                        path: '$',
                        path_nested: {
                            format: 'ldp_vc',
                            path: '$.verifiableCredential[0]',
                        },
                    }],
                },
                state: request_id
            }

            // This should successfully process the valid VPToken
            const result = await transactionController.response(endpoint, mockResponse)
            expect(result).toHaveProperty('redirect_uri')
            expect(result.redirect_uri).toMatch(/^openid4vp:\/\/response_code=[A-Z0-9]{6}$/)
        })


        it('should successfully process a valid VPToken', async () => {
            const { response_uri, request_id } = transactionController.new('test-nonce')
            const endpoint = response_uri.split('/verify/')[1]

            // Create a mock valid VPToken
            const validVPToken: VPToken = {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiablePresentation'],
                verifiableCredential: [
                    {
                        '@context': ['https://www.w3.org/2018/credentials/v1'],
                        id: 'test-vc-id',
                        type: ['VerifiableCredential'],
                        issuer: { id: 'did:example:issuer' },
                        credentialSubject: {
                            id: 'did:example:subject',
                            test: 'test'  // Ensure this field is present
                        },
                        expirationDate: new Date(),
                        proof: {
                            type: 'BbsBlsSignature2020',
                            created: '2023-01-01T00:00:00Z',
                            proofPurpose: 'assertionMethod',
                            proofValue: 'test-proof-value',
                            verificationMethod: 'test-verification-method',
                            challenge: 'test-challenge',
                        },
                    },
                ],
                id: 'test-vp-id',
                holder: 'did:example:holder',
                proof: {
                    type: 'BbsBlsSignature2020',
                    created: '2023-01-01T00:00:00Z',
                    proofPurpose: 'authentication',
                    proofValue: 'test-proof-value',
                    verificationMethod: 'test-verification-method',
                    challenge: 'test-challenge',
                },
            }

            const mockResponse: TransactionResponse = {
                vp_token: [validVPToken],
                presentation_submission: {
                    id: 'test-submission-id',
                    definition_id: 'test-id',
                    descriptor_map: [{
                        id: 'test-descriptor',
                        format: 'ldp_vp',
                        path: '$',
                        path_nested: {
                            format: 'ldp_vc',
                            path: '$.verifiableCredential[0]',
                        },
                    }],
                },
                state: request_id
            }

            // This should successfully process the valid VPToken
            const result = await transactionController.response(endpoint, mockResponse)
            expect(result).toHaveProperty('redirect_uri')
            expect(result.redirect_uri).toMatch(/^openid4vp:\/\/response_code=[A-Z0-9]{6}$/)
        })
    });

    describe('result', () => {
        it('should verify a valid transaction result', async () => {
            const { transaction_id, response_uri, request_id } = transactionController.new('test-nonce');
            const endpoint = response_uri.split('/verify/')[1];
            const mockVPToken: VPToken = {
                '@context': [],
                type: ['VerifiablePresentation'],
                verifiableCredential: [
                    {
                        '@context': [],
                        id: 'test-vc-id',
                        type: ['VerifiableCredential'],
                        issuer: { id: 'did:example:issuer' },
                        credentialSubject: { test: 'test' },
                        expirationDate: new Date('2030-01-01'),
                        proof: {
                            type: 'BbsBlsSignature2020',
                            created: '2023-01-01',
                            proofPurpose: 'assertionMethod',
                            proofValue: 'test-proof-value',
                            verificationMethod: 'test-verification-method',
                            challenge: 'test-challenge'
                        }
                    }
                ],
                id: 'test-vp-id',
                holder: 'did:example:holder',
                proof: {
                    type: 'BbsBlsSignature2020',
                    created: '2023-01-01',
                    proofPurpose: 'authentication',
                    proofValue: 'test-proof-value',
                    verificationMethod: 'test-verification-method',
                    challenge: 'test-challenge'
                }
            };
            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "test-submission-id",
                    definition_id: "test-id",
                    descriptor_map: [
                        {
                            id: 'test-descriptor',
                            format: 'ldp_vp',
                            path: '$',
                            path_nested: {
                                format: 'ldp_vc',
                                path: '$.verifiableCredential[0]'
                            }
                        }
                    ],
                },
                state: request_id,  // Use the request_id as the state
            };
            const { redirect_uri } = await transactionController.response(endpoint, mockResponse);
            const responseCode = redirect_uri.split('=')[1];
            const result = transactionController.result(transaction_id, responseCode);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toBeInstanceOf(PresentedCredential);
        });

        it('should throw an error for an invalid transaction ID', () => {
            expect(() => transactionController.result('invalid-id', 'any-code')).toThrow(CustomError);
        });

        it('should throw an error for an incorrect response code', async () => {
            const { transaction_id, response_uri, request_id } = transactionController.new('test-nonce');
            const endpoint = response_uri.split('/verify/')[1];

            // Create a valid mock VP token
            const mockVPToken: VPToken = {
                '@context': [],
                type: ['VerifiablePresentation'],
                verifiableCredential: [
                    {
                        '@context': [],
                        id: 'test-vc-id',
                        type: ['VerifiableCredential'],
                        issuer: { id: 'did:example:issuer' },
                        credentialSubject: { test: 'test' },
                        expirationDate: new Date('2030-01-01'),
                        proof: {
                            type: 'BbsBlsSignature2020',
                            created: '2023-01-01',
                            proofPurpose: 'assertionMethod',
                            proofValue: 'test-proof-value',
                            verificationMethod: 'test-verification-method',
                            challenge: 'test-challenge'
                        }
                    }
                ],
                id: 'test-vp-id',
                holder: 'did:example:holder',
                proof: {
                    type: 'BbsBlsSignature2020',
                    created: '2023-01-01',
                    proofPurpose: 'authentication',
                    proofValue: 'test-proof-value',
                    verificationMethod: 'test-verification-method',
                    challenge: 'test-challenge'
                }
            };

            // Create a valid mock response
            const mockResponse: TransactionResponse = {
                vp_token: [mockVPToken],
                presentation_submission: {
                    id: "test-submission-id",
                    definition_id: "test-id",
                    descriptor_map: [
                        {
                            id: 'test-descriptor',
                            format: 'ldp_vp',
                            path: '$',
                            path_nested: {
                                format: 'ldp_vc',
                                path: '$.verifiableCredential[0]'
                            }
                        }
                    ],
                },
                state: request_id,
            };

            // Process the valid response
            await transactionController.response(endpoint, mockResponse);

            // Now test with an incorrect response code
            expect(() => transactionController.result(transaction_id, 'incorrect-code')).toThrow(CustomError);
        });

        it('should throw an error when transaction exists but has no response code', () => {
            const { transaction_id, response_uri } = transactionController.new('test-nonce')
            const endpoint = response_uri.split('/verify/')[1]

            // Simulate a transaction that hasn't received a response yet
            const transaction = transactionController['transactions'].get(endpoint)
            if (transaction) {
                transaction.response_code = ''  // Set to empty string instead of undefined
            }

            expect(() => transactionController.result(transaction_id, 'any-code')).toThrow(CustomError)
        })
    });

    describe('private methods', () => {
        it('should generate a unique 6-character code', () => {
            const code1 = transactionController['generateCode']()
            const code2 = transactionController['generateCode']()

            expect(code1).toHaveLength(6)
            expect(code2).toHaveLength(6)
            expect(code1).not.toEqual(code2)
            expect(code1).toMatch(/^[A-Z0-9]{6}$/)
        })

        it('should generate a unique random ID', () => {
            const id1 = transactionController['generateRandomID']()
            const id2 = transactionController['generateRandomID']()

            expect(id1).not.toEqual(id2)
            expect(id1).toMatch(/^[a-z0-9]{8,}$/)
        })
    })
});