const { QRCodeGenerator } = require('../../src/services/QRCodeGenerator')

describe('The QR Code Generator', () => {
    let generator

    beforeEach(() => {
        generator = new QRCodeGenerator(
            'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
            'https://www.test.com/endpoint'
        )
    })

    describe('generates a QR Code', () => {
        it('that starts with openid4vp://', () => {
            let qrCode = generator.generateQRCode()
            expect(qrCode.substring(0, 12)).toBe('openid4vp://')
        })
    })

    it('that provides a valid endpoint', () => {
        let qrCode = generator.generateQRCode()
        let endpoint = require('node:querystring').parse(qrCode.slice(12))
        expect(endpoint['redirect_uri']).toEqual(
            'https://www.test.com/endpoint'
        )
    })
})
