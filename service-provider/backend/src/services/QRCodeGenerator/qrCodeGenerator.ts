import { QRCode } from './qrCode'

export class QRCodeGenerator {
    private client_id: string
    private redirect_uri: string
    private wallet: string

    public constructor(
        client_id: string,
        redirect_uri: string,
        wallet = 'openid4vp://'
    ) {
        this.client_id = client_id
        this.redirect_uri = redirect_uri
        this.wallet = wallet
    }

    public generateQRCode(): string {
        let qrCode = new QRCode(this.client_id, this.redirect_uri, this.wallet)
        return qrCode.getCode()
    }
}
