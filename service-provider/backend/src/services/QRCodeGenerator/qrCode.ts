export class QRCode {
    private readonly wallet: string
    private readonly client_id: string
    private readonly redirect_uri: string

    public constructor(
        client_id: string,
        redirect_uri: string,
        wallet = 'openid4vp://'
    ) {
        this.client_id = client_id
        this.redirect_uri = redirect_uri
        this.wallet = wallet
    }

    public getCode(): string {
        let url = new URLSearchParams()
        url.append('client_id', this.client_id)
        url.append('redirect_uri', this.redirect_uri)
        return this.wallet + url
    }
}
