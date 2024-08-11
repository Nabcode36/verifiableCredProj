import { CredentialDisplayScreen } from 'screens/credentialsDisplay'
import { View, StyleSheet } from 'react-native'
import React from 'react'

export default function Screen() {
    return (
        <View style={styles.container}>
            <CredentialDisplayScreen />
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
