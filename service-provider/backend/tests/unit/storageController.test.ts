import path from 'path';
import { StorageController } from "../../src/services/StorageController";
import { DataNotInitializedError, FileOperationError } from '../../src/services/ErrorService';
import fs from 'fs/promises';


// Mocking modules
jest.mock('fs/promises');
jest.mock('path');

// Type assertions for mocked modules
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;


describe('StorageControllerInitialisation', () => {
    let storageController: StorageController;
    const testFileName = 'test-storage.json';
    const mockDirname = '/mocked/directory';
    const testFilePath = '/mocked/directory/test-storage.json';
    const testUploadsDir = '/mocked/directory/uploads';

    beforeEach(() => {
        // Reset all mocks
        jest.resetAllMocks();

        // Mock __dirname
        Object.defineProperty(global, '__dirname', { value: mockDirname });

        // Mock path.join
        mockedPath.join.mockImplementation((...args: string[]): string => {
            if (args[args.length - 1] === 'uploads') {
                return testUploadsDir;
            }
            return testFilePath;
        });

        // Create a new StorageController for each test
        storageController = new StorageController(testFileName);
    });

    it('should successfully initialize when file exists', async () => {
        const mockData = { name: 'Test Data', metadata: { purpose: 'Test Purpose' } };
        mockedFs.readFile.mockResolvedValue(JSON.stringify(mockData));

        await storageController.initialise();

        expect(mockedFs.mkdir).toHaveBeenCalledWith(testUploadsDir, { recursive: true });
        expect(mockedFs.readFile).toHaveBeenCalledWith(testFilePath, 'utf-8');
        expect(storageController['data']).toEqual(mockData);
    });

    it('should set data to null when file does not exist', async () => {
        const error = new Error('File not found');
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        mockedFs.readFile.mockRejectedValue(error);

        await storageController.initialise();

        expect(mockedFs.mkdir).toHaveBeenCalledWith(testUploadsDir, { recursive: true });
        expect(storageController['data']).toBeNull();
    });

    it('should throw FileOperationError for other errors', async () => {
        const error = new Error('Some other error');
        mockedFs.readFile.mockRejectedValue(error);

        await expect(storageController.initialise()).rejects.toThrow(FileOperationError);
    });

    it('should create uploads directory if it does not exist', async () => {
        mockedFs.readFile.mockResolvedValue('{}');

        await storageController.initialise();

        expect(mockedFs.mkdir).toHaveBeenCalledWith(testUploadsDir, { recursive: true });
    });

    it('should handle JSON parse errors', async () => {
        mockedFs.readFile.mockResolvedValue('Invalid JSON');

        await expect(storageController.initialise()).rejects.toThrow(FileOperationError);
    });

    it('should log success message when data is loaded', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        mockedFs.readFile.mockResolvedValue('{}');

        await storageController.initialise();

        expect(consoleSpy).toHaveBeenCalledWith('Data loaded successfully');
        consoleSpy.mockRestore();
    });

    it('should log message when no existing file is found', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        const error = new Error('File not found');
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        mockedFs.readFile.mockRejectedValue(error);

        await storageController.initialise();

        expect(consoleSpy).toHaveBeenCalledWith('No existing file found. Starting with empty data.');
        consoleSpy.mockRestore();
    });
});


describe('StorageController', () => {
    let storageController: StorageController;
    const testFileName = 'test-storage.json';
    const mockDirname = '/mocked/directory';
    const testFilePath = '/mocked/directory/test-storage.json';
    const testUploadsDir = '/mocked/directory/uploads';

    beforeEach(async () => {
        // Reset all mocks
        jest.resetAllMocks();

        // Mock __dirname
        Object.defineProperty(global, '__dirname', { value: mockDirname });

        // Mock path.join
        mockedPath.join.mockImplementation((...args: string[]): string => {
            if (args[args.length - 1] === 'uploads') {
                return testUploadsDir;
            }
            return testFilePath;
        });

        // Mock successful file read
        mockedFs.readFile.mockResolvedValue(JSON.stringify({ name: 'Initial Data' }));

        // Create and initialize a new StorageController for each test
        storageController = new StorageController(testFileName);
        await storageController.initialise();
    });

    describe('save', () => {
        it('should save data to file', async () => {
            const newData = { name: 'New Test Data' };
            await storageController.save(newData as any);  // Type assertion used here

            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                testFilePath,
                JSON.stringify(newData, null, 2)
            );
        });

        it('should throw FileOperationError if save fails', async () => {
            mockedFs.writeFile.mockRejectedValue(new Error('Write error'));
            await expect(storageController.save({} as any)).rejects.toThrow(FileOperationError);
        });
    });

    describe('update', () => {
        it('should update a specific key in the data', async () => {
            await storageController.update('name', 'Updated Name');

            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                testFilePath,
                expect.stringContaining('"name": "Updated Name"')
            );
        });
    });

    describe('updateMetadata', () => {
        it('should update metadata', async () => {
            await storageController.updateMetadata({ purpose: 'New Purpose' });

            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                testFilePath,
                expect.stringContaining('"purpose": "New Purpose"')
            );
        });
    });

    describe('getData', () => {
        it('should return data', () => {
            const data = storageController.getData();
            expect(data).toEqual(expect.objectContaining({ name: 'Initial Data' }));
        });
    });

    describe('getMetadata', () => {
        it('should return metadata', async () => {
            // First, let's update the metadata
            await storageController.updateMetadata({ name: 'Test Metadata' });

            const metadata = storageController.getMetadata();
            expect(metadata).toEqual(expect.objectContaining({ name: 'Test Metadata' }));
        });
    });

    describe('getUploadsDir', () => {
        it('should return the uploads directory path', () => {
            expect(storageController.getUploadsDir()).toBe(testUploadsDir);
        });
    });

    describe('update', () => {
        it('should throw DataNotInitializedError if data is null', async () => {
            storageController['data'] = null;

            await expect(storageController.update('name', 'New Name')).rejects.toThrow(DataNotInitializedError);
        });
    });

    describe('updateMetadata', () => {
        it('should throw DataNotInitializedError if data is null', async () => {
            storageController['data'] = null;

            await expect(storageController.updateMetadata({ name: 'New Name' })).rejects.toThrow(DataNotInitializedError);
        });
    });

    describe('getData', () => {
        it('should throw DataNotInitializedError if data is null', () => {
            storageController['data'] = null;

            expect(() => storageController.getData()).toThrow(DataNotInitializedError);
        });
    });

    describe('getMetadata', () => {
        it('should throw DataNotInitializedError if data is null', () => {
            storageController['data'] = null;

            expect(() => storageController.getMetadata()).toThrow(DataNotInitializedError);
        });

        it('should throw DataNotInitializedError if metadata is null', () => {
            storageController['data'] = { metadata: null } as any;

            expect(() => storageController.getMetadata()).toThrow(DataNotInitializedError);
        });
    });

    describe('save', () => {
        it('should throw FileOperationError if write fails', async () => {
            mockedFs.writeFile.mockRejectedValue(new Error('Write failed'));

            await expect(storageController.save({ name: 'Test' } as any)).rejects.toThrow(FileOperationError);
        });
    });

    describe('updateHash', () => {
        it('should update hash for a specific device', async () => {
            const deviceName = 'testDevice'
            const hash = 'newHash123'
            await storageController.updateHash(deviceName, hash)

            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                testFilePath,
                expect.stringContaining(`"${deviceName}": "${hash}"`)
            )
        })

        it('should throw DataNotInitializedError if data is null', async () => {
            storageController['data'] = null
            await expect(storageController.updateHash('device', 'hash')).rejects.toThrow(DataNotInitializedError)
        })
    })

    describe('removeHash', () => {
        it('should remove hash for a specific device', async () => {
            storageController['data'] = {
                hash: { testDevice: 'oldHash' },
            } as any

            await storageController.removeHash('testDevice')

            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                testFilePath,
                expect.not.stringContaining('"testDevice"')
            )
        })

        it('should not modify data if device does not exist', async () => {
            const initialData = {
                hash: { existingDevice: 'hash' },
            }
            storageController['data'] = initialData as any

            await storageController.removeHash('nonExistentDevice')

            expect(mockedFs.writeFile).not.toHaveBeenCalled()
            expect(storageController['data']).toEqual(initialData)
        })

        it('should throw DataNotInitializedError if data is null', async () => {
            storageController['data'] = null
            await expect(storageController.removeHash('device')).rejects.toThrow(DataNotInitializedError)
        })
    })

    describe('save', () => {
        it('should handle concurrent save operations', async () => {
            const savePromises = [
                storageController.save({ name: 'Data1' } as any),
                storageController.save({ name: 'Data2' } as any),
                storageController.save({ name: 'Data3' } as any)
            ]

            await Promise.all(savePromises)

            expect(mockedFs.writeFile).toHaveBeenCalledTimes(3)
            expect(mockedFs.writeFile).toHaveBeenLastCalledWith(
                testFilePath,
                expect.stringContaining('"name": "Data3"')
            )
        })
    })
});