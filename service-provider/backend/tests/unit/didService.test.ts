import { DIDResolver } from '../../src/services/DIDService';
import { documentLoader } from '../../src/services/DIDService';
import { CustomError } from '../../src/services/ErrorService';
import { Resolver } from 'did-resolver'

jest.mock('did-resolver', () => ({
    Resolver: jest.fn(),
}))

jest.mock('web-did-resolver', () => ({
    getResolver: jest.fn(),
}))

jest.mock('key-did-resolver', () => ({
    getResolver: jest.fn(),
}))

describe('DIDResolver', () => {
    it('should resolve a simple DID without additional path', () => {
        const did = 'did:example:123456789abcdefghi';
        const result = DIDResolver(did);
        expect(result).toBe('http://123456789abcdefghi/.well-known');
    });

    it('should resolve a DID with additional path', () => {
        const did = 'did:example:123456789abcdefghi/path/to/resource';
        const result = DIDResolver(did);
        expect(result).toBe('http://123456789abcdefghi/path/to/resource');
    });

    it('should handle DIDs with multiple colons', () => {
        const did = 'did:example:subdomain:123456789abcdefghi';
        const result = DIDResolver(did);
        expect(result).toBe('http://subdomain/123456789abcdefghi');
    });

    it('should handle DIDs with encoded colons', () => {
        const did = 'did:example:subdomain%3A123456789abcdefghi';
        const result = DIDResolver(did);
        expect(result).toBe('http://subdomain:123456789abcdefghi/.well-known');
    });

    it('should handle DIDs with encoded colons and additional path', () => {
        const did = 'did:example:subdomain%3A123456789abcdefghi/path/to/resource';
        const result = DIDResolver(did);
        expect(result).toBe('http://subdomain:123456789abcdefghi/path/to/resource');
    });

    it('should handle DIDs with multiple encoded colons', () => {
        const did = 'did:example:subdomain%3A123%3A456%3A789';
        const result = DIDResolver(did);
        expect(result).toBe('http://subdomain:123:456:789/.well-known');
    });

    it('should return correct URL for DID with IP address', () => {
        const did = 'did:example:192.168.0.1';
        const result = DIDResolver(did);
        expect(result).toBe('http://192.168.0.1/.well-known');
    });

    it('should handle DIDs with port numbers', () => {
        const did = 'did:example:localhost%3A8080';
        const result = DIDResolver(did);
        expect(result).toBe('http://localhost:8080/.well-known');
    });

    it('should preserve query parameters if present', () => {
        const did = 'did:example:123456789abcdefghi/path?query=param';
        const result = DIDResolver(did);
        expect(result).toBe('http://123456789abcdefghi/path?query=param');
    });

    it('should preserve fragments if present', () => {
        const did = 'did:example:123456789abcdefghi/path#fragment';
        const result = DIDResolver(did);
        expect(result).toBe('http://123456789abcdefghi/path#fragment');
    });
});

describe('documentLoader', () => {
    let mockResolver: jest.Mocked<Resolver>;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.resetModules()
        jest.clearAllMocks()

        mockResolver = {
            resolve: jest.fn(),
        } as unknown as jest.Mocked<Resolver>;

        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    })

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    })

    it('should load a preloaded context', async () => {
        const url = 'https://www.w3.org/2018/credentials/v1'
        const result = await documentLoader(url, mockResolver)
        expect(result).not.toBeNull()
        expect(result?.documentUrl).toBe(url)
        expect(result?.document).toBeDefined()
    })

    it('should resolve a did:web DID', async () => {
        const url = 'did:web:example.com'
        const mockDidDocument = { id: url, authentication: [] }
        mockResolver.resolve.mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: mockDidDocument,
            didDocumentMetadata: {}
        });

        const result = await documentLoader(url, mockResolver)
        expect(result).not.toBeNull()
        expect(result?.documentUrl).toBe(url)
        expect(result?.document).toEqual(mockDidDocument)
    })

    it('should resolve a did:key DID', async () => {
        const url = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'
        const mockDidDocument = { id: url, authentication: [] }
        mockResolver.resolve.mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: mockDidDocument,
            didDocumentMetadata: {}
        });

        const result = await documentLoader(url, mockResolver)
        expect(result).not.toBeNull()
        expect(result?.documentUrl).toBe(url)
        expect(result?.document).toEqual(mockDidDocument)
    })

    it('should return null for DIDs with empty didDocument', async () => {
        const url = 'did:web:empty'
        mockResolver.resolve.mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: null,
            didDocumentMetadata: {}
        });

        await expect(documentLoader(url, mockResolver)).rejects.toThrow('Failed with error: Error: Failed to resolve DID: did:web:empty')
    })

    it('should return null for unsupported URLs', async () => {
        const url = 'https://unsupported.com/document'
        const result = await documentLoader(url, mockResolver)
        expect(result).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempt to load unsupported URL: ${url}`)
    })

    it('should load other preloaded contexts', async () => {
        const contexts = [
            'https://www.w3.org/2018/credentials/examples/v1',
            'https://schema.org',
            'https://w3id.org/security/bbs/v1'
        ];

        for (const url of contexts) {
            const result = await documentLoader(url, mockResolver)
            expect(result).not.toBeNull()
            expect(result?.documentUrl).toBe(url)
            expect(result?.document).toBeDefined()
        }
    })

    it('should resolve a did:web DID with path', async () => {
        const url = 'did:web:example.com:user:alice'
        const mockDidDocument = { id: url, authentication: [] }
        mockResolver.resolve.mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: mockDidDocument,
            didDocumentMetadata: {}
        });

        const result = await documentLoader(url, mockResolver)
        expect(result).not.toBeNull()
        expect(result?.documentUrl).toBe(url)
        expect(result?.document).toEqual(mockDidDocument)
    })

    it('should return null for DIDs with empty didDocument', async () => {
        const url = 'did:example:empty'
        mockResolver.resolve.mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: null,
            didDocumentMetadata: {}
        });

        const result = await documentLoader(url, mockResolver)
        expect(result).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempt to load unsupported URL: ${url}`)
    })

    it('should return null when resolver throws an error', async () => {
        const url = 'did:example:error'
        mockResolver.resolve.mockRejectedValue(new Error('Resolver error'))

        const result = await documentLoader(url, mockResolver)
        expect(result).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempt to load unsupported URL: ${url}`)
    })

    it('should handle non-DID and non-preloaded URLs', async () => {
        const url = 'https://example.com/random-document'
        const result = await documentLoader(url, mockResolver)
        expect(result).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempt to load unsupported URL: ${url}`)
    })

    // Note: The following two tests might need to be adjusted based on how initializeResolver is actually implemented
    it('should use provided resolver if available', async () => {
        const url = 'did:web:example.com'
        const mockDidDocument = { id: url, authentication: [] }
        mockResolver.resolve.mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: mockDidDocument,
            didDocumentMetadata: {}
        });

        const result = await documentLoader(url, mockResolver)
        expect(result).not.toBeNull()
        expect(result?.documentUrl).toBe(url)
        expect(result?.document).toEqual(mockDidDocument)
        expect(mockResolver.resolve).toHaveBeenCalledWith(url)
    })

    it('should use default resolver if not provided', async () => {
        const url = 'did:web:example.com'
        const mockDidDocument = { id: url, authentication: [] }

        // Mock the default resolver
        const mockDefaultResolve = jest.fn().mockResolvedValue({
            didResolutionMetadata: {},
            didDocument: mockDidDocument,
            didDocumentMetadata: {}
        });
        (Resolver as jest.MockedClass<typeof Resolver>).mockImplementation(() => ({
            resolve: mockDefaultResolve
        } as unknown as Resolver));

        const result = await documentLoader(url)
        expect(result).not.toBeNull()
        expect(result?.documentUrl).toBe(url)
        expect(result?.document).toEqual(mockDidDocument)
        expect(mockDefaultResolve).toHaveBeenCalledWith(url)
    })
})