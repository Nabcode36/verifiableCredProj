export type IssuerTokenRequestIn = {
    url: string
    pre_authorized_code: string
}
export type IssuerTokenRequestOut = TokenResponse

interface TokenResponse {
    access_token: string
    c_nonce?: string
    c_nonce_expires_in?: string
}
