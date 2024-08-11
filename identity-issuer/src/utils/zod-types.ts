// This file uses the zod package to ensure that several response objects generated
// in ../routes.ts (path relative to this file) are of the correct structure and that
// each field/component is of the correct type.

import { z } from 'zod'

// Structure and field types derived from
// https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-offer-parameters
export const credentialOfferSchema = z.object({
    credential_issuer: z.string().url(),
    credential_configuration_ids: z.array(
        z.object({
            name: z.string(),
            'data-base-id': z.string(),
        })
    ),
    grants: z.object({
        'Urn:ietf:params:oauth:grant-type:pre-authorized_code': z.object({
            'pre-authorized_code': z.string(),
            interval: z.string(),
        }),
    }),
})

// Structure and field types derived from
// https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-issuer-metadata-p
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

// Added fields for the Token-Endpoint and the Credential-Request-Endpoint
// to the credentialIssuerMetadataSchema so that identity owner's can access
// these routes
export const step3ResponseObject = z.object({
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
    'Token-Endpoint': z.string(),
    'Credential-Request-Endpoint': z.string(),
})

// Structure and field types derived from
// https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-successful-token-response
// Several fields were omitted due to optionality and the choice of using the Pre-Authorized Code Flow
export const tokenResponseSchema = z.object({
    accesstoken: z.string(),
    token_type: z.string(),
    expires_in: z.string(),
})
