import { PresentedCredential } from './presentedCredential'
import { value } from 'jsonpath'

export class Transaction {
    constructor(
        endpoint: string,
        transaction_id: string,
        request_id: string,
        nonce: string
    ) {
        this._transaction_id = transaction_id
        this._request_id = request_id
        this._endpoint = endpoint
        this._nonce = nonce
    }

    private _transaction_id: string
    private _request_id: string
    private _endpoint: string
    private _response_code = ''
    private _nonce: string
    private _presented_credentials: PresentedCredential[] = []

    get transaction_id(): string {
        return this._transaction_id
    }

    get request_id(): string {
        return this._request_id
    }

    get endpoint(): string {
        return this._endpoint
    }

    set endpoint(value: string) {
        this._endpoint = value
    }

    get response_code(): string {
        return this._response_code
    }

    set response_code(value: string) {
        this._response_code = value
    }

    get nonce(): string {
        return this._nonce
    }

    get presented_credentials(): PresentedCredential[] {
        return this._presented_credentials
    }

    set presented_credentials(value: PresentedCredential[]) {
        this._presented_credentials = value
    }

    public authorizationResponse(): {
        response_uri: string
        transaction_id: string
        request_id: string
        client_id: string
    } {
        return {
            response_uri: this._endpoint,
            transaction_id: this._transaction_id,
            request_id: this._request_id,
            client_id: '',
        }
    }
}
