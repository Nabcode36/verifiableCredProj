import { PresentApprove } from 'screens/present'
import { View, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import React from 'react'

export default function Screen() {
    const params = useLocalSearchParams()

    // Ensure authResponseString is a string
    const authResponseString = Array.isArray(params.authResponse)
        ? params.authResponse[0] // Take the first element if it's an array
        : params.authResponse

    // Parse the authResponse string if it's defined
    const authResponse = authResponseString
        ? JSON.parse(authResponseString)
        : null

    const responseURIString = Array.isArray(params.response_uri)
        ? params.response_uri[0] // Take the first element if it's an array
        : params.response_uri || ''

    console.log('PresentApprove authResponse: ', authResponse)
    console.log('PresentApprove response_uri: ', responseURIString)

    return (
        <View style={styles.container}>
            <PresentApprove
                authResponse={authResponse}
                response_uri={responseURIString}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
})
