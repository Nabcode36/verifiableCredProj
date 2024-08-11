import { value } from 'jsonpath'

export class PresentedCredential {
    private _cred: string
    private _key: string
    private _value: string
    private _issuer: string

    constructor(cred: string, key: string, value: string, issuer: string) {
        this._cred = cred
        this._key = key
        this._value = value
        this._issuer = issuer
    }

    get cred(): string {
        return this._cred
    }

    get key(): string {
        return this._key
    }

    get value(): string {
        return this._value
    }

    get issuer(): string {
        return this._issuer
    }
}
