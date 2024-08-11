import { CredentialConfirm } from 'screens/add/confirm'
import { Stack } from 'expo-router'
import { useTheme } from 'tamagui'
import React from 'react'

export default function Screen() {
    const theme = useTheme()
    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Customise',
                    headerTintColor: theme.color.val,
                }}
            />
            <CredentialConfirm />
        </>
    )
}
