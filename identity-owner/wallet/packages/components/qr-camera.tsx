import { Button, View, Text, Spinner } from 'tamagui'
import { useState } from 'react'
import { router } from 'expo-router'
import {
    BarcodeScanningResult,
    CameraView,
    useCameraPermissions,
} from 'expo-camera'
import { StyleSheet } from 'react-native'
import axios from 'axios'
import {
    AuthorisationResponseSchema,
    credentialIssuerMetadataSchema,
    CredentialOfferSchema,
    tokenResponseSchema,
} from 'zodTypes/zodTypes'
import { Check } from '@tamagui/lucide-icons'
import React from 'react'

export function QrCamera({ present = false }: { present?: boolean }) {
    const [permission, requestPermission] = useCameraPermissions()
    const [scanned, setScanned] = useState(false)

    // pass if add or present

    if (!permission) {
        // Camera permissions are still loading.
        return <View />
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet. Prompt to grant them
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>
                    We need your permission to show the camera
                </Text>
                <Button onPress={requestPermission}>grant permission</Button>
            </View>
        )
    }

    const handleBarCodeScanned = async ({
        type,
        data,
    }: BarcodeScanningResult) => {
        setScanned(true)
        if (present) {
            await onPresent(data)
        } else {
            await onAdd(data)
        }
        // alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    }

    // Return Camera Component to display, and status display button underneath
    return (
        <View height={400} width={300} gap="$8">
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            ></CameraView>
            <Button icon={scanned === false ? () => <Spinner /> : <Check />}>
                {scanned === false ? 'Waiting for QR code' : 'QR code Scanned'}
            </Button>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
})

async function onPresent(data: string) {
    console.log(data)

    // Present Credential using URL
    try {
        // Split response_uri from rest of data
        let response_uri = decodeURIComponent(data.split('response_uri=')[1])

        response_uri = `http://${response_uri}`

        // Log the response_uri
        console.log('response_uri:', response_uri)

        // Get Authorisation Response from endpoint
        const authorisationResponse = await axios.get(response_uri)
        console.log(
            'authorisationResponse: -------------------------------->',
            JSON.stringify(authorisationResponse.data)
        )

        // Conform to type
        const validatedAuthResponse = AuthorisationResponseSchema.parse(
            authorisationResponse.data
        )

        console.log(
            validatedAuthResponse.presentation_definition.input_descriptors
        )

        // Log conformed response
        console.log('Validated authResponse:', validatedAuthResponse)

        // Go to next page
        router.push({
            pathname: '/present/request',
            params: {
                validatedAuthResponse: JSON.stringify(validatedAuthResponse),
                response_uri: response_uri,
            },
        })
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Axios error
            console.error('Error fetching data:')
            if (error.response) {
                // Server responded with a status code out of 2xx range
                console.error('Status:', error.response.status)
                console.error('Status Text:', error.response.statusText)
                console.error('Headers:', error.response.headers)
                console.error('Data:', error.response.data)
            } else if (error.request) {
                // No response was received
                console.error('No response received:', error.request)
            } else {
                // Error setting up the request
                console.error('Error setting up request:', error.message)
            }
            console.error('Config:', error.config)
            console.error('Message:', error.message)
        } else {
            // Other errors
            console.error('Unexpected Error:', error)
        }
    }
}

async function onAdd(data: string) {
    //const response_uri = decodeURIComponent(data.split("response_uri:")[1]);
    console.log(data)
    // get credential offer using the url
    try {
        // Log the URL (data)
        const issuerURL = data.split('/', 3)[2]
        console.log('URL:', data)

        // Get Credential offer
        const CredentialOfferresponse = await axios.get(data)
        console.log(CredentialOfferresponse.data)

        const validatedData = CredentialOfferSchema.parse(
            CredentialOfferresponse.data
        )
        console.log('Validated data:', validatedData)

        // Get metadata
        const metaDataUrl = `http://${issuerURL}/credential-issuer-metadata`
        console.log(metaDataUrl)

        const IssuerMetaDataResponse = await axios.get(metaDataUrl)
        console.log(IssuerMetaDataResponse.data)

        const validatedMetaData = credentialIssuerMetadataSchema.parse(
            IssuerMetaDataResponse.data
        )

        console.log(validatedMetaData)

        // Token request
        const tokenUrl = `http://${issuerURL}/token`

        const TokenResponse = await axios.post(tokenUrl, {
            grantType: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
            preAuthorizedCode:
                validatedData.grants[
                    'Urn:ietf:params:oauth:grant-type:pre-authorized_code'
                ]['pre-authorized_code'],
            userDid: 'did:123123123124123',
        })

        const validatedTokenResponse = tokenResponseSchema.parse(
            TokenResponse.data
        )

        console.log(validatedTokenResponse)

        router.push({
            pathname: '/add/choose',
            params: {
                tokenResponse: JSON.stringify(validatedTokenResponse),
                validatedMetaData: JSON.stringify(validatedMetaData),
                feedThroughUrl: issuerURL,
            },
        })
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Axios error
            console.error('Error fetching data:')
            if (error.response) {
                // Server responded with a status code out of 2xx range
                console.error('Status:', error.response.status)
                console.error('Status Text:', error.response.statusText)
                console.error('Headers:', error.response.headers)
                console.error('Data:', error.response.data)
            } else if (error.request) {
                // No response was received
                console.error('No response received:', error.request)
            } else {
                // Error setting up the request
                console.error('Error setting up request:', error.message)
            }
            console.error('Config:', error.config)
            console.error('Message:', error.message)
        } else {
            // Other errors
            console.error('Unexpected Error:', error)
        }
    }
}
