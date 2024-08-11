import { Request, Response } from 'express'
import {
    errorHandler,
    CustomError,
    FileNotFoundError,
    DataNotInitializedError,
    FileOperationError,
} from '../../src/services/ErrorService'

describe('Error Handler', () => {
    let mockRequest: Partial<Request>
    let mockResponse: Partial<Response>
    let nextFunction: jest.Mock

    beforeEach(() => {
        mockRequest = {}
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }
        nextFunction = jest.fn()
    })

    it('should handle CustomError and return correct status and message', () => {
        const customError = new CustomError('Custom error message', 400)
        errorHandler(
            customError,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        )

        expect(mockResponse.status).toHaveBeenCalledWith(400)
        expect(mockResponse.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Custom error message',
        })
    })

    it('should handle unexpected errors and return 500 status', () => {
        const unexpectedError = new Error('Unexpected error')
        errorHandler(
            unexpectedError,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        )

        expect(mockResponse.status).toHaveBeenCalledWith(500)
        expect(mockResponse.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'An unexpected error occurred',
        })
    })

    it('should log unexpected errors to console', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
        const unexpectedError = new Error('Unexpected error')
        errorHandler(
            unexpectedError,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        )

        expect(consoleSpy).toHaveBeenCalledWith(
            'Unexpected error:',
            unexpectedError
        )
        consoleSpy.mockRestore()
    })
})

describe('Custom Errors', () => {
    describe('CustomError', () => {
        it('should create CustomError with correct properties', () => {
            const error = new CustomError('Test error', 418)
            expect(error.message).toBe('Test error')
            expect(error.statusCode).toBe(418)
            expect(error.isOperational).toBe(true)
        })
    })

    describe('FileNotFoundError', () => {
        it('should create FileNotFoundError with default message and correct status code', () => {
            const error = new FileNotFoundError()
            expect(error.message).toBe('File not found')
            expect(error.statusCode).toBe(404)
        })

        it('should create FileNotFoundError with custom message', () => {
            const error = new FileNotFoundError('Custom file not found message')
            expect(error.message).toBe('Custom file not found message')
            expect(error.statusCode).toBe(404)
        })
    })

    describe('DataNotInitializedError', () => {
        it('should create DataNotInitializedError with default message and correct status code', () => {
            const error = new DataNotInitializedError()
            expect(error.message).toBe('Data not initialized')
            expect(error.statusCode).toBe(500)
        })

        it('should create DataNotInitializedError with custom message', () => {
            const error = new DataNotInitializedError(
                'Custom data not initialized message'
            )
            expect(error.message).toBe('Custom data not initialized message')
            expect(error.statusCode).toBe(500)
        })
    })

    describe('FileOperationError', () => {
        it('should create FileOperationError with correct message and status code', () => {
            const error = new FileOperationError('File operation failed')
            expect(error.message).toBe('File operation failed')
            expect(error.statusCode).toBe(500)
        })
    })
})
