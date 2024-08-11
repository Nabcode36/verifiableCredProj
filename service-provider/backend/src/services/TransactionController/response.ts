export interface TransactionResponse {
    vp_token: VPToken | VPToken[]
    presentation_submission: PresentationSubmission
    state: string
}

interface PresentationSubmission {
    id: string
    definition_id: string
    descriptor_map: DescriptorMap[]
}

export interface DescriptorMap {
    id: string
    format: string
    path: string
    path_nested: {
        format: string
        path: string
    }
}

export interface VPToken {
    '@context': string[]
    type: string[]
    verifiableCredential: VerifiableCredential[]
    id: string
    holder: string
    proof: Proof
}

export interface VerifiableCredential {
    '@context': string[]
    id: string
    type: string[]
    issuer: {
        id: string
    }
    credentialSubject: {
        [key: string]: any
    }
    expirationDate: Date
    proof: Proof
}

interface Proof {
    type: string
    created: string
    proofPurpose: string
    proofValue: string
    verificationMethod: string
    challenge: string
}
