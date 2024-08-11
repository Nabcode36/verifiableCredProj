import { AuthController } from '../../src/services/AuthController';
import { StorageController } from '../../src/services/StorageController';
import { CustomError } from '../../src/services/ErrorService';
import crypto from 'crypto';
import {StorageData} from "../../src/services/StorageController/storageController";
import {PresentationDefinition} from "../../src/services/PresentationDefinitionController";

// Mock StorageController
jest.mock('../../src/services/StorageController')

describe('AuthController', () => {
    let authController: AuthController
    let mockStorageController: jest.Mocked<StorageController>

    // Helper function to create a mock PresentationDefinition
    const createMockPresentationDefinition = (): PresentationDefinition => ({
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'mock_presentation_definition_id',
        format: {
            ldp_vc: {
                proof_type: ['Ed25519Signature2018']
            }
        },
        input_descriptors: [
            {
                id: 'mock_input_descriptor_id',
                name: 'Mock Credential',
                purpose: 'For testing purposes',
                constraints: {
                    fields: [
                        {
                            path: ['$.credentialSubject.id'],
                            filter: {
                                type: 'string',
                                pattern: '^did:example:'
                            }
                        }
                    ]
                }
            }
        ]
    })

    // Helper function to create a mock StorageData object
    const createMockStorageData = (hash: { [key: string]: string }): StorageData => ({
        metadata: { name: 'Mock Metadata', purpose: 'Testing' },
        name: 'Mock Storage',
        did: 'did:example:123456789abcdefghi',
        url: 'https://example.com',
        hash,
        mobile_presentation_definition: 'mobile_pd',
        presentation_definition: createMockPresentationDefinition()
    })

    beforeEach(() => {
        mockStorageController = new StorageController() as jest.Mocked<StorageController>
        authController = new AuthController(mockStorageController)
    })

    describe('authenticate', () => {
        it('should authenticate with valid password', () => {
            const validPassword = 'correctPassword'
            const validHash = crypto.createHash('sha256').update(validPassword).digest('hex')
            mockStorageController.getData.mockReturnValue(createMockStorageData({ device1: validHash }))

            expect(authController.authenticate(validPassword)).toBe(true)
        })

        it('should throw CustomError for invalid password', () => {
            const invalidPassword = 'wrongPassword'
            const validHash = crypto.createHash('sha256').update('correctPassword').digest('hex')
            mockStorageController.getData.mockReturnValue(createMockStorageData({ device1: validHash }))

            expect(() => authController.authenticate(invalidPassword)).toThrow(CustomError)
            expect(() => authController.authenticate(invalidPassword)).toThrow('Invalid password')
        })

        it('should throw CustomError when no devices are registered', () => {
            mockStorageController.getData.mockReturnValue(createMockStorageData({}))

            expect(() => authController.authenticate('anyPassword')).toThrow(CustomError)
            expect(() => authController.authenticate('anyPassword')).toThrow('No devices registered')
        })
    })

    describe('createNewUser', () => {
        it('should create a new user with a random password', async () => {
            const deviceId = 'newDevice'
            mockStorageController.updateHash.mockResolvedValue()

            const password = await authController.createNewUser(deviceId)

            expect(password).toMatch(/^[a-zA-Z0-9!@#$%^&*()_+]{12}$/) // Check if it's a 12-character string
            expect(mockStorageController.updateHash).toHaveBeenCalledWith(deviceId, expect.any(String))
        })
    })

    describe('getDevices', () => {
        it('should return an array of device IDs', () => {
            const mockDevices = { device1: 'hash1', device2: 'hash2' }
            mockStorageController.getData.mockReturnValue(createMockStorageData(mockDevices))

            const devices = authController.getDevices()

            expect(devices).toEqual(['device1', 'device2'])
        })
    })

    describe('deauthDevice', () => {
        it('should deauthenticate an existing device', async () => {
            const deviceId = 'existingDevice'
            mockStorageController.getData.mockReturnValue(createMockStorageData({ [deviceId]: 'someHash' }))
            mockStorageController.removeHash.mockResolvedValue()

            const result = await authController.deauthDevice(deviceId)

            expect(result).toBe(true)
            expect(mockStorageController.removeHash).toHaveBeenCalledWith(deviceId)
        })

        it('should throw CustomError for non-existent device', async () => {
            const deviceId = 'nonExistentDevice'
            mockStorageController.getData.mockReturnValue(createMockStorageData({}))

            await expect(authController.deauthDevice(deviceId)).rejects.toThrow(CustomError)
            await expect(authController.deauthDevice(deviceId)).rejects.toThrow('Device not found')
        })
    })
})