import { H4, YStack } from 'tamagui'
import { useLocalSearchParams } from 'expo-router'
import React from 'react'

// Displays each credential
export function CredentialDisplayScreen() {
    const { id } = useLocalSearchParams()
    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                Details of credential {id}
            </H4>
        </YStack>
    )
}
