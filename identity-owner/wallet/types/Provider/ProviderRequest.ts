export type ProviderRequestIn = {
    request_uri: string
}

export interface AuthResponse {
    client_id: string
    client_id_scheme: string
    redirect_uri: string
    response_type: string
    response_mode: string
    nonce: string
    state: string
    presentation_definition: PresentationDefinition
    client_metadata: {
        vp_formats: {
            ldp_vp: {
                proof_type: string[]
            }
        }
        client_name: string
        logo_uri: string
        tos_uri: string
        policy_uri: string
    }
}

interface PresentationDefinition {
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
                path: string
                filter?: {
                    type: string
                    pattern: string
                }
            }[]
        }
    }[]
}
