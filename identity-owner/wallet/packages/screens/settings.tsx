import { H4, YStack, YGroup, ListItem } from 'tamagui'
import { deleteAll } from 'packages/db/dbConnect'
import * as LocalAuthentication from 'expo-local-authentication'
import { router } from 'expo-router'
import React from 'react'

// Screen displaying settings
export function SettingsScreen() {
    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                Settings
            </H4>
            <YGroup alignSelf="center" bordered width={240} size="$4">
                <YGroup.Item>
                    <ListItem
                        title="Clear Wallet"
                        onPress={() => clearWallet()}
                    />
                </YGroup.Item>
                <YGroup.Item>
                    <ListItem
                        title="Lock Wallet"
                        onPress={() => lockWallet()}
                    />
                </YGroup.Item>
            </YGroup>
        </YStack>
    )
}

// function to clear everything in the wallet
// requires authentication
async function clearWallet() {
    const authenticated = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Delete all your credentials from your wallet',
    })

    if (authenticated.success) {
        deleteAll()
    }
}

// function to lock the wallet
function lockWallet() {
    router.navigate('/')
}
