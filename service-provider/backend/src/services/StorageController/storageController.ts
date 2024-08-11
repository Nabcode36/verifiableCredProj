import { PresentationDefinition } from '../PresentationDefinitionController'
import fs from 'fs/promises'
import path from 'path'
import {
    CustomError,
    FileOperationError,
    FileNotFoundError,
    DataNotInitializedError,
} from '../ErrorService'

/**
 * Interface for metadata associated with the storage
 */
export interface Metadata {
    name: string
    purpose: string
    logoPath?: string
    tosPath?: string
    policyPath?: string
}

/**
 * Interface for the main storage data structure
 */
export interface StorageData {
    metadata: Metadata
    name: string
    did: string
    url: string
    hash: { [deviceName: string]: string }
    mobile_presentation_definition: string
    presentation_definition: PresentationDefinition
}

export class StorageController {
    private data: StorageData | null
    private filePath: string
    private saveQueue: Promise<void>
    private uploadsDir: string

    /**
     * Creates an instance of StorageController.
     * @param {string} [fileName='storage.json'] - The name of the storage file
     */
    constructor(fileName: string = 'storage.json') {
        this.filePath = path.join(__dirname, fileName)
        this.uploadsDir = path.join(__dirname, 'uploads')
        this.data = null
        this.saveQueue = Promise.resolve()
    }

    /**
     * Initialize the storage controller by loading data from file
     * @returns {Promise<void>}
     * @throws {FileOperationError} If there's an error reading the file
     */
    public async initialise(): Promise<void> {
        try {
            await fs.mkdir(this.uploadsDir, { recursive: true })
            const fileContent = await fs.readFile(this.filePath, 'utf-8')
            this.data = JSON.parse(fileContent)
            console.log('Data loaded successfully')
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                console.log('No existing file found. Starting with empty data.')
                this.data = null
            } else {
                console.error('Error reading file:', error)
                throw new FileOperationError(
                    `Error reading file: ${(error as Error).message}`
                )
            }
        }
    }

    /**
     * Save new data to the storage file
     * @param {StorageData} newData - The new data to be saved
     * @returns {Promise<void>}
     * @throws {FileOperationError} If there's an error saving the data
     */
    public async save(newData: StorageData): Promise<void> {
        this.saveQueue = this.saveQueue.then(async () => {
            try {
                this.data = newData
                await fs.writeFile(
                    this.filePath,
                    JSON.stringify(this.data, null, 2)
                )
                console.log('Data saved successfully')
            } catch (error) {
                console.error('Error saving data:', error)
                throw new FileOperationError(
                    `Error saving data: ${(error as Error).message}`
                )
            }
        })
        await this.saveQueue
    }

    /**
     * Update a specific key in the storage data
     * @param {K} key - The key to update
     * @param {StorageData[K]} value - The new value for the key
     * @returns {Promise<void>}
     * @throws {DataNotInitializedError} If the data hasn't been initialized
     */
    public async update<K extends keyof StorageData>(
        key: K,
        value: StorageData[K]
    ): Promise<void> {
        if (!this.data) {
            throw new DataNotInitializedError()
        }

        const updatedData: StorageData = {
            ...this.data,
            [key]: value,
        }

        await this.save(updatedData)
        console.log(`Data updated and saved successfully for key: ${key}`)
    }

    /**
     * Update metadata in the storage data
     * @param {Partial<Metadata>} metadata - The metadata to update
     * @returns {Promise<void>}
     * @throws {DataNotInitializedError} If the data hasn't been initialized
     */
    public async updateMetadata(metadata: Partial<Metadata>): Promise<void> {
        if (!this.data) {
            throw new DataNotInitializedError()
        }

        const updatedData: StorageData = {
            ...this.data,
            metadata: {
                ...this.data.metadata,
                ...metadata,
            },
        }

        await this.save(updatedData)

        console.log(`Metadata updated and saved successfully`)
    }

    /**
     * Update hash for a specific device
     * @param {string} deviceName - The name of the device
     * @param {string} hash - The new hash value
     * @returns {Promise<void>}
     * @throws {DataNotInitializedError} If the data hasn't been initialized
     */
    public async updateHash(deviceName: string, hash: string): Promise<void> {
        if (!this.data) {
            throw new DataNotInitializedError()
        }

        const updatedData: StorageData = {
            ...this.data,
            hash: {
                ...this.data.hash,
                [deviceName]: hash,
            },
        }

        await this.save(updatedData)

        console.log(
            `Hash updated and saved successfully for device: ${deviceName}`
        )
    }

    /**
     * Remove hash for a specific device
     * @param {string} deviceName - The name of the device to remove the hash for
     * @returns {Promise<void>}
     * @throws {DataNotInitializedError} If the data hasn't been initialized
     */
    public async removeHash(deviceName: string): Promise<void> {
        if (!this.data) {
            throw new DataNotInitializedError()
        }

        if (!(deviceName in this.data.hash)) {
            console.log(`No hash found for device: ${deviceName}`)
            return
        }

        const { [deviceName]: removedHash, ...updatedHash } = this.data.hash

        const updatedData: StorageData = {
            ...this.data,
            hash: updatedHash,
        }

        await this.save(updatedData)

        console.log(`Device ${deviceName} and its hash removed successfully`)
    }

    /**
     * Get the entire storage data
     * @returns {StorageData} The complete storage data
     * @throws {DataNotInitializedError} If the data hasn't been initialized
     */
    public getData(): StorageData {
        if (this.data == null) {
            throw new DataNotInitializedError()
        }
        return this.data
    }

    /**
     * Get only the metadata from storage data
     * @returns {Metadata} The metadata from the storage
     * @throws {DataNotInitializedError} If the data or metadata hasn't been initialized
     */
    public getMetadata(): Metadata {
        if (this.data == null || this.data.metadata == null) {
            throw new DataNotInitializedError()
        }
        return this.data.metadata
    }

    /**
     * Get the uploads directory path
     * @returns {string} The path to the uploads directory
     */
    public getUploadsDir(): string {
        return this.uploadsDir
    }
}