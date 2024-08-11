import { CredentialAddScan } from 'screens/add/add'
import { Stack } from 'expo-router'
import { useTheme } from 'tamagui'
import React from 'react'

export default function Screen() {
    const theme = useTheme()
    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Add Credential',
                    headerTintColor: theme.color.val,
                }}
            />
            <CredentialAddScan />
        </>
    )
}
