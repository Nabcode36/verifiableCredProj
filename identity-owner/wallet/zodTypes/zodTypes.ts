import { z } from 'zod'

export const CredentialOfferSchema = z.object({
    credential_issuer: z.string().url(),
    credential_configuration_ids: z.array(
        z.object({
            name: z.string(),
            'data-base-id': z.string().uuid(),
        })
    ),
    grants: z.object({
        'Urn:ietf:params:oauth:grant-type:pre-authorized_code': z.object({
            'pre-authorized_code': z.string(),
            interval: z.string().or(z.number()),
        }),
    }),
})

export const AuthorisationResponseSchema = z.object({
    client_id: z.string(),
    client_id_scheme: z.string(),
    redirect_uri: z.string(),
    response_type: z.string(),
    response_mode: z.string(),
    nonce: z.string(),
    state: z.string(),
    presentation_definition: z.object({
        '@context': z.array(z.string()),
        id: z.string(),
        format: z.object({
            ldp_vc: z.object({
                proof_type: z.array(z.string()),
            }),
        }),
        input_descriptors: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                purpose: z.string(),
                constraints: z.object({
                    fields: z.array(
                        z.object({
                            path: z.array(z.string()),
                            filter: z.optional(
                                z.object({
                                    type: z.string(),
                                    pattern: z.string(),
                                })
                            ),
                        })
                    ),
                }),
            })
        ),
    }),
    client_metadata: z.object({
        vp_formats: z.object({
            ldp_vp: z.object({
                proof_type: z.array(z.string()),
            }),
        }),
        client_name: z.string(),
        logo_uri: z.string(),
        tos_uri: z.string(),
        policy_uri: z.string(),
    }),
})

export const credentialIssuerMetadataSchema = z.object({
    credential_issuer: z.string(),
    credential_endpoint: z.string(),
    credential_configurations_supported: z.array(
        z.object({
            name: z.string(),
            configuration: z.string(),
            cryptographic_binding_methods_supported: z.string(),
            credential_configuration: z.object({
                type: z.array(z.string()),
                credentialSubject: z.any(),
            }),
        })
    ),
})

export const tokenResponseSchema = z.object({
    accesstoken: z.string(),
    token_type: z.string(),
    expires_in: z.string(),
})
