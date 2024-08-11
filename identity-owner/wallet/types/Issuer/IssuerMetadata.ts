export type IssuerMetadataIn = {
    url: string
}

export type IssuerMetadataOut = CredentialIssuerMetadata

interface CredentialIssuerMetadata {
    credential_issuer: string
    credential_endpoint: string
    credential_configurations_supported: CredentialConfiguration[]
}

interface CredentialConfiguration {
    name: string
    format: string
    cryptographic_binding_methods_supported?: string
    credential_definition?: string
    type?: string
    credentialSubject?: string
}
