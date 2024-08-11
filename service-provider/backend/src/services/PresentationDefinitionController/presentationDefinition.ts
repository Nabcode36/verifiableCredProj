export interface Field {
    path: string
    filter: string
}

export interface Credential {
    name: string
    purpose: string
    id: string
    fields: Field[]
    issuerFilter: string
    credentialFilter: string
    selectedIssuers: string[]
    selectedCredentialOptions: string[]
}

export interface PresentationDefinition {
    '@context': string[]
    id: string
    format: {
        ldp_vc: {
            proof_type: string[]
        }
    }
    input_descriptors: {
        id: string
        name: string
        purpose: string
        constraints: {
            fields: {
                path: string[]
                filter?: {
                    type: string
                    pattern: string
                }
            }[]
        }
    }[]
}
