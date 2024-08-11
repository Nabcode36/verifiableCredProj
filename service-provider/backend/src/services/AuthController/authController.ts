import { StorageController } from '../StorageController'
import crypto from 'crypto'
import { CustomError } from '../ErrorService'

/**
 * AuthController class for handling authentication-related operations.
 */
export class AuthController {
    private storage: StorageController

    /**
     * Creates an instance of AuthController.
     * @param {StorageController} storage - The storage controller instance.
     */
    constructor(storage: StorageController) {
        this.storage = storage
    }

    /**
     * Authenticates a user with the provided password.
     * @param {string} password - The password to authenticate.
     * @returns {boolean} True if authentication is successful.
     * @throws {CustomError} If no devices are registered or the password is invalid.
     */
    public authenticate(password: string): boolean {
        const data = this.storage.getData()
        const storedHashes = Object.values(data.hash)

        if (storedHashes.length === 0) {
            throw new CustomError('No devices registered', 404)
        }

        // Generate hash from the provided password
        const generatedHash = this.generateHash(password)

        // Check if the generated hash matches any of the stored hashes
        if (!storedHashes.some((hash) => hash === generatedHash)) {
            throw new CustomError('Invalid password', 401)
        }

        return true
    }

    /**
     * Creates a new user with a randomly generated password.
     * @param {string} deviceId - The ID of the device to associate with the new user.
     * @returns {Promise<string>} A promise that resolves to the generated password.
     */
    public async createNewUser(deviceId: string): Promise<string> {
        // Generate a random password
        const password = this.generateRandomPassword()

        // Generate hash from the password
        const hash = this.generateHash(password)

        // Store the hash
        await this.storage.updateHash(deviceId, hash)

        // Return the generated password
        return password
    }

    /**
     * Retrieves the list of registered device IDs.
     * @returns {string[]} An array of device IDs.
     */
    public getDevices(): string[] {
        return Object.keys(this.storage.getData().hash)
    }

    /**
     * Deauthenticates a device by removing its stored hash.
     * @param {string} deviceId - The ID of the device to deauthenticate.
     * @returns {Promise<boolean>} A promise that resolves to true if deauthentication is successful.
     * @throws {CustomError} If the device is not found.
     */
    public async deauthDevice(deviceId: string): Promise<boolean> {
        const data = this.storage.getData()
        const storedHash = data.hash[deviceId]

        if (!storedHash) {
            throw new CustomError('Device not found', 404)
        }

        // Remove the stored device
        await this.storage.removeHash(deviceId)
        return true
    }

    /**
     * Generates a random password.
     * @param {number} [length=12] - The length of the password to generate.
     * @returns {string} The generated password.
     * @private
     */
    private generateRandomPassword(length: number = 12): string {
        const charset =
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+'
        let password = ''
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length)
            password += charset[randomIndex]
        }
        return password
    }

    /**
     * Generates a hash from the provided password.
     * @param {string} password - The password to hash.
     * @returns {string} The generated hash.
     * @private
     */
    private generateHash(password: string): string {
        // Use the same hashing algorithm as used for storing the original hash
        const hash = crypto.createHash('sha256')
        hash.update(password)
        return hash.digest('hex')
    }
}
