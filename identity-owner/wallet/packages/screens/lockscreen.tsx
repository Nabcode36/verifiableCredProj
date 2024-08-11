import { H4, YStack, Button } from 'tamagui'
import { router } from 'expo-router'
import { LockKeyhole } from '@tamagui/lucide-icons'
import * as LocalAuthentication from 'expo-local-authentication'
import React from 'react'

// Default screen upon starting the app. Locks the app to be unlocked by the users Local Authentication
export function LockScreen() {
    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                Tap to unlock
            </H4>
            <Button
                circular
                variant="outlined"
                size="$14"
                icon={<LockKeyhole size="$10" strokeWidth={2} />}
                onPress={() => unlockWallet()}
            />
        </YStack>
    )
}

async function unlockWallet() {
    const authenticated = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your Wallet',
    })

    if (authenticated.success) {
        router.navigate('/(tabs)/credentials')
    }
}
