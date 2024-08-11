import { StorageController } from '../../src/services/StorageController'
import { CustomError } from '../../src/services/ErrorService'
import {
    PresentationDefinitionController,
    Credential,
    PresentationDefinition,
} from '../../src/services/PresentationDefinitionController'

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mocked-uuid'),
}))

// Mock StorageController
jest.mock('../../src/services/StorageController/storageController')

// Import the actual StorageData type
import { StorageData } from '../../src/services/StorageController/storageController'

describe('PresentationDefinitionController', () => {
    let presentationDefinitionController: PresentationDefinitionController
    let mockStorageController: jest.Mocked<StorageController>

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks()

        // Create a mock StorageData object
        const mockStorageData: StorageData = {
            metadata: {
                name: 'Test Metadata',
                purpose: 'Test Purpose',
            },
            name: 'Test Name',
            did: 'did:test:1234',
            url: 'https://test.com',
            hash: { device1: 'testhash123' },
            mobile_presentation_definition: 'mobile-pd',
            presentation_definition: {
                '@context': [],
                id: 'initial-pd-id',
                format: { ldp_vc: { proof_type: ['TestProof'] } },
                input_descriptors: [],
            },
        }

        // Create a mock StorageController
        mockStorageController = new StorageController(
            ''
        ) as jest.Mocked<StorageController>
        mockStorageController.getData.mockReturnValue(mockStorageData)
        mockStorageController.update.mockResolvedValue()

        // Create a new PresentationDefinitionController instance
        presentationDefinitionController = new PresentationDefinitionController(
            mockStorageController
        )
    })

    describe('generate_pd', () => {
        it('should generate a valid presentation definition', () => {
            const testCredentials: Credential[] = [
                {
                    id: 'test-id-1',
                    name: 'Test Credential 1',
                    purpose: 'Test Purpose 1',
                    fields: [
                        {
                            path: '$.credentialSubject.testField1',
                            filter: '^test.*$',
                        },
                        { path: '$.credentialSubject.testField2', filter: '' },
                    ],
                    issuerFilter: '',
                    credentialFilter: '',
                    selectedIssuers: ['issuer1', 'issuer2'],
                    selectedCredentialOptions: ['schema1', 'schema2'],
                },
            ]

            const result =
                presentationDefinitionController.generate_pd(testCredentials)

            // Check the structure of the generated presentation definition
            expect(result).toEqual(
                expect.objectContaining({
                    '@context': expect.arrayContaining([
                        'https://www.w3.org/2018/credentials/v1',
                        'https://www.w3.org/2018/credentials/examples/v1',
                        'https://w3id.org/security/bbs/v1',
                        'https://schema.org',
                    ]),
                    id: 'mocked-uuid',
                    format: { ldp_vc: { proof_type: ['BbsBlsSignature2020'] } },
                    input_descriptors: expect.any(Array),
                })
            )

            // Check the input descriptor
            expect(result.input_descriptors[0]).toEqual(
                expect.objectContaining({
                    id: 'test-id-1',
                    name: 'Test Credential 1',
                    purpose: 'Test Purpose 1',
                    constraints: expect.any(Object),
                })
            )

            // Check the fields
            expect(result.input_descriptors[0].constraints.fields).toEqual(
                expect.arrayContaining([
                    {
                        path: ['$.credentialSubject.testField1'],
                        filter: { type: 'string', pattern: '^test.*$' },
                    },
                    { path: ['$.credentialSubject.testField2'] },
                    {
                        path: ['$.issuer.id'],
                        filter: { type: 'string', pattern: 'issuer1|issuer2' },
                    },
                    {
                        path: ['$.credentialSchema'],
                        filter: { type: 'string', pattern: 'schema1|schema2' },
                    },
                ])
            )

            // Check if the storage was updated
            expect(mockStorageController.update).toHaveBeenCalledWith(
                'presentation_definition',
                result
            )
        })

        it('should handle empty credentials array', () => {
            const result = presentationDefinitionController.generate_pd([])

            expect(result.input_descriptors).toHaveLength(0)
        })
    })

    describe('presentationDefinition getter', () => {
        it('should return the presentation definition if it exists', () => {
            const testPD: PresentationDefinition = {
                '@context': [],
                id: 'test-id',
                format: { ldp_vc: { proof_type: ['TestProof'] } },
                input_descriptors: [],
            }
            ;(presentationDefinitionController as any)._presentationDefinition =
                testPD

            expect(
                presentationDefinitionController.presentationDefinition
            ).toBe(testPD)
        })

        it('should throw CustomError if presentation definition does not exist', () => {
            ;(presentationDefinitionController as any)._presentationDefinition =
                null

            expect(
                () => presentationDefinitionController.presentationDefinition
            ).toThrow(CustomError)
        })
    })

    // Add a test for the start_search method
    describe('start_search', () => {
        it('should exist but not be implemented yet', () => {
            expect(presentationDefinitionController.start_search).toBeDefined()
            expect(() =>
                presentationDefinitionController.start_search('credential', [
                    'issuer1',
                    'issuer2',
                ])
            ).not.toThrow()
        })
    })
})
