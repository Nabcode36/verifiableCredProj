export type IssuerCredentialRequestIn = {
    url: string
    pre_authorized_code: string
}

interface CredentialRequest {
    access_token: string
    format: string
    proof?: Proof
    credential_identifier: string
    credential_response_encryption?: any
}

interface Proof {
    proof_type: string
}
