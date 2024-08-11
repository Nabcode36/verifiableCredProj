import { H4, YStack } from 'tamagui'
import { QrCamera } from 'components/qr-camera'
import React from 'react'

// Screen to display Camera for adding a credential by QR Code
export function CredentialAddScan() {
    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                Add Credential
            </H4>
            <QrCamera />
        </YStack>
    )
}
