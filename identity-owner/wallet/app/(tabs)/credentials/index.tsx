import { View, StyleSheet } from 'react-native'
import { CredentialsScreen } from 'screens/credentials'
import React from 'react'

export default function Tab() {
    return (
        <View style={styles.container}>
            <CredentialsScreen />
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
