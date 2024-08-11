import { View, StyleSheet } from 'react-native'
import { SettingsScreen } from 'screens/settings'
import React from 'react'

export default function Tab() {
    return (
        <View style={styles.container}>
            <SettingsScreen />
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
