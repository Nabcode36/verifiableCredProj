import { Resolver } from 'did-resolver';
import * as webResolver from 'web-did-resolver';
import {CustomError} from "../ErrorService";
import fs from 'fs';
import path from 'path';

type DocumentLoader = (url: string) => Promise<{
    contextUrl: string | null;
    documentUrl: string;
    document: any;
} | null>;


// Helper function to load JSON-LD contexts
function loadJsonLdContext(filePath: string): any {
    try {
        const fullPath = path.resolve(__dirname, filePath);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error loading context file ${filePath}:`, error);
        throw error;
    }
}

// Preloaded contexts
const contexts: { [url: string]: any } = {
    // Base Verifiable Credentials contexts
    "https://www.w3.org/2018/credentials/v1": loadJsonLdContext('./contexts/credentials-v1.json'),
    "https://www.w3.org/2018/credentials/examples/v1": loadJsonLdContext('./contexts/credentials-examples-v1.json'),

    // Schema.org context
    "https://schema.org": loadJsonLdContext('./contexts/schemaorg-current-https.jsonld'),

    // BBS context
    "https://w3id.org/security/bbs/v1": loadJsonLdContext('./contexts/security-bbs-v1.json'),

};

let didResolver: Resolver;

async function initializeResolver(): Promise<Resolver> {
    const keyResolver = await import('key-did-resolver');
    return new Resolver({
        ...webResolver.getResolver(),
        ...keyResolver.getResolver()
    });
}

export async function documentLoader(url: string, resolver?: Resolver): Promise<{
    contextUrl: string | null
    documentUrl: string
    document: any
} | null> {
    // Use the provided resolver or initialize a new one if not provided
    if (!resolver) {
        if (!didResolver) {
            didResolver = await initializeResolver()
        }
        resolver = didResolver
    }

    // Check preloaded contexts
    if (contexts[url]) {
        return {
            contextUrl: null,
            documentUrl: url,
            document: contexts[url],
        }
    }

    // Handle DID resolution for did:web and did:key
    if (url.startsWith('did:web:') || url.startsWith('did:key:')) {
        try {
            const didResolutionResult = await resolver.resolve(url)
            if (didResolutionResult.didDocument) {
                return {
                    contextUrl: null,
                    documentUrl: url,
                    document: didResolutionResult.didDocument,
                }
            } else {
                throw new CustomError(`Failed to resolve DID: ${url}`, 400)
            }
        } catch (error) {
            throw new CustomError(`Failed with error: ${error}`, 400)
        }
    }

    // For all other URLs, log a warning and return null
    console.warn(`Attempt to load unsupported URL: ${url}`)
    return null
}