import { View, StyleSheet } from 'react-native'
import { PresentScanScreen } from 'screens/present'
import React from 'react'

export default function Tab() {
    return (
        <View style={styles.container}>
            <PresentScanScreen />
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
