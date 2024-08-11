import { PresentConfirm } from 'screens/present'
import { View, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import React from 'react'

export default function Screen() {
    const params = useLocalSearchParams()

    // Ensure axiosResponseObject is a string
    const axiosResponseObject = Array.isArray(params.axiosResponseObject)
        ? params.axiosResponseObject[0] // Take the first element if it's an array
        : params.axiosResponseObject

    // Parse the axiosResponseObjectResponse string if it's defined
    const axiosResponseObjectResponse = axiosResponseObject
        ? JSON.parse(axiosResponseObject)
        : null

    const authResponse = Array.isArray(params.authResponse)
        ? params.authResponse[0] // Take the first element if it's an array
        : params.authResponse || ''

    const authResponseResponse = authResponse ? JSON.parse(authResponse) : null

    return (
        <View style={styles.container}>
            <PresentConfirm
                axiosResponseObject={axiosResponseObjectResponse}
                authResponse={authResponseResponse}
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
