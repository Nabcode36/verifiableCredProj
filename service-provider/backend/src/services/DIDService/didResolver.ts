/**
 * Resolves a Decentralized Identifier (DID) to a URL.
 *
 * @param {string} did - The DID to resolve.
 * @returns {string} The resolved URL.
 */
export function DIDResolver(did: string): string {
    // Split the DID and rejoin the parts after the method, replacing '%3A' with ':'
    did = did.split(':').slice(2).join('/').replaceAll('%3A', ':')

    // If the DID doesn't include a path, append '/.well-known'
    if (!did.includes('/')) {
        did = `${did}/.well-known`
    }

    // Return the full URL
    return `http://${did}`
}
