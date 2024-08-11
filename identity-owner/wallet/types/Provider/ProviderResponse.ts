export type ProviderResponseIn = {
    request_uri: string
    transaction_response: TransactionResponse
}

export type ProviderResponseOut = {
    redirect_uri: string
}

interface TransactionResponse {
    vp_token: VPToken | VPToken[]
    presentation_submission: PresentationSubmission
    state: string
}

interface PresentationSubmission {
    id: string
    definition_id: string
    descriptor_map: DescriptorMap[]
}

interface DescriptorMap {
    id: string
    format: string
    path: string
    path_nested: {
        format: string
        path: string
    }
}

interface VPToken {
    '@context': string[]
    type: string[]
    verifiableCredential: VerifiableCredential[]
    proof: Proof
}

export interface VerifiableCredential {
    '@context': string[]
    id: string
    type: string[]
    issuer: {
        id: string
        name: string
    }
    name: string
    expirationDate: string
    credentialSubject: {
        [key: string]: any
    }
    proof?: Proof
}

interface Proof {
    type: string
    created: string
    proofPurpose: string
    proofValue: string
    verificationMethod: string
    challenge: string
}
