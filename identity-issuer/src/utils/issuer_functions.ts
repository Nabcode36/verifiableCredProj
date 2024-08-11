import crypto from 'crypto'
import { CompactEncrypt, SignJWT } from 'jose'

// This function generates the pre-authorized code which is provided to the
// user when the request for the credential offer
export function generatePreAuthCode() {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const getRandomLetterOrNumber = () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    // base64 encryption and the addition of 2 random letters/numbers was to
    // match the example structure of pre-authorized codes in the openid
    // specification at
    // https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-offer-parameters
    let preAuthCode = crypto.randomBytes(15).toString('base64')
    preAuthCode =
        preAuthCode.replace(/[^a-zA-Z0-9]/g, () => getRandomLetterOrNumber()) +
        getRandomLetterOrNumber() +
        getRandomLetterOrNumber()

    return preAuthCode
}

// This function creates a didDocument when an issuer is created and is formatted as per
// W3C spec: https://www.w3.org/TR/did-core/#core-properties
export async function generateDid(name: string) {
    try {
        // Replacing space characters with '%20' for percent encoding when the issuer's name
        // will be a part of a url
        name = name.replace(/ /g, '%20')
        // Issuer didIds will be using the did:web type https://w3c-ccg.github.io/did-method-web/
        const didId = `did:web:issuer.com%3A3334:issuer:${name}`
        const keypair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
            publicKeyEncoding: { format: 'pem', type: 'spki' },
        })

        // didDoc contains the essential didDoc elements: https://www.w3.org/TR/did-core/#core-properties
        const didDoc = [
            {
                '@context': [
                    'https://www.w3.org/ns/did/v1',
                    'https://www.w3.org/2018/credentials/v1',
                ],
                id: didId,
                verificationMethod: [
                    {
                        id: didId,
                        type: 'RsaVerificationKey2018',
                        controller: didId,
                        publicKeyPem: keypair.publicKey,
                    },
                ],
                keys: [
                    {
                        id: didId,
                        passphrase: null,
                        controller: `${didId}`,
                        owner: `${didId}`,
                        type: 'RsaVerificationKey2018',
                        privateKey: keypair.privateKey,
                        publicKey: keypair.publicKey,
                    },
                ],
            },
        ]

        // This ensures the keys field is not directly accessible
        Object.defineProperty(didDoc, 'keys', {
            value: didDoc.keys,
            writable: true,
            // This makes the property non-enumerable
            enumerable: false,
            configurable: true,
        })

        return didDoc
    } catch (error) {
        console.error('Error generating DID:', error)
    }
}

// This functions generates an access token to be provided to the identity owner upon
// calling the token endpoint to be used as an added proof on top of the pre-authorized code
// when requesting a credential
// https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-token-endpoint
export async function generateAccessToken(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    issuerDidDoc: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    privateKey: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    identityOwnerpublicKey: any,
    userDid: string
) {
    // The following payload will be signed by multiple keys
    const payload = {
        '@context': [
            'https://www.w3.org/ns/credentials/v2',
            'https://www.w3.org/ns/credentials/examples/v2',
        ],
        type: ['VerifiablePresentation'],
        holder: userDid,
        proof: [
            {
                type: '',
                domain: issuerDidDoc.id,
            },
        ],
    }

    const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setExpirationTime('5 minutes')
        // Signed using the issuer's private RSA key
        .sign(privateKey)

    console.log(`JWT = ${jwt}`)

    // The generated JWT token will be further encrypted using the identity owner's public key
    // for an added layer of security
    const encryptedJwt = await new CompactEncrypt(new TextEncoder().encode(jwt))
        .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
        .encrypt(identityOwnerpublicKey)

    console.log(`encryptedJwt = ${encryptedJwt}`)
    return encryptedJwt
}
