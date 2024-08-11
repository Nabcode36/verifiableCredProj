export class CustomError extends Error {
    constructor(
        public message: string,
        public statusCode: number,
        public isOperational = true
    ) {
        super(message)
        Error.captureStackTrace(this, this.constructor)
    }
}

export class FileNotFoundError extends CustomError {
    constructor(message: string = 'File not found') {
        super(message, 404)
    }
}

export class DataNotInitializedError extends CustomError {
    constructor(message: string = 'Data not initialized') {
        super(message, 500)
    }
}

export class FileOperationError extends CustomError {
    constructor(message: string) {
        super(message, 500)
    }
}
