import { PresentStart } from 'screens/present'
import { View, StyleSheet } from 'react-native'
import { useTheme } from 'tamagui'
import { useLocalSearchParams } from 'expo-router'
import React from 'react'

export default function Screen() {
    useTheme()
    const params = useLocalSearchParams()

    // Ensure authResponseString is a string
    const authResponseString = Array.isArray(params.validatedAuthResponse)
        ? params.validatedAuthResponse[0] // Take the first element if it's an array
        : params.validatedAuthResponse

    // Parse the authResponse string if it's defined
    const authResponse = authResponseString
        ? JSON.parse(authResponseString)
        : null

    const responseURIString = Array.isArray(params.response_uri)
        ? params.response_uri[0] // Take the first element if it's an array
        : params.response_uri || ''

    console.log('PresentStart authResponse: ', authResponse)
    console.log('PresentStart responseURIString: ', responseURIString)
    return (
        <View style={styles.container}>
            <PresentStart
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
