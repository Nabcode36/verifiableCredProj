import { H4, YStack, Button, Input } from 'tamagui'
import { Plus } from '@tamagui/lucide-icons'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { createCredential } from 'packages/db/dbConnect'

interface Proof {
    created: string
    proofPurpose: string
    proofValue: string
    type: string
    verificationMethod: string
}

interface CredentialSubject {
    address: string
    expiryDate: string
    id: string
    name: string
    passportNumber: string
    type: string[]
}

interface Credential {
    '@context': string[]
    credentialSubject: CredentialSubject
    issuer: string
    name: string
    proof: Proof
    type: string[]
}

// interface CredentialConfirmScreenProps {
//     credential: Credential
// }

// Screen to confirm credential added and customise credential
export function CredentialConfirm() {
    const params = useLocalSearchParams()
    const [credentialData, setCredentialData] = useState<Credential | null>(
        null
    )
    const [textValue, onChangeTextValue] = React.useState('')

    useEffect(() => {
        // Parse and set the credential data
        const credentialResponseDataString = Array.isArray(
            params.CredentialResponseData
        )
            ? params.CredentialResponseData[0]
            : params.CredentialResponseData

        const finalCredential = Array.isArray(params.finalCredential)
            ? params.finalCredential[0]
            : params.finalCredential

        console.log('params: ', params)
        console.log('params.CredentialResponseData: ', params)

        if (credentialResponseDataString && finalCredential) {
            try {
                const parsedData = JSON.parse(credentialResponseDataString)
                const parsedfinalCredential = JSON.parse(finalCredential)

                console.log(
                    'parsedData.credential: ',
                    parsedfinalCredential.name
                )
                setCredentialData(parsedData.credential)
                onChangeTextValue(
                    parsedfinalCredential.name || 'NSW Drivers License'
                )
            } catch (error) {
                console.error('Error parsing credential data:', error)
            }
        }
    }, [params.CredentialResponseData])

    async function handleConfirm() {
        if (!credentialData) {
            console.error('No credential data available.')
            return
        }

        console.log('Data before navigation:', credentialData)

        // Implement your credential handling logic here
        createCredential(credentialData)

        // Navigate to the confirm page
        router.navigate({
            pathname: '(tabs)/credentials',
        })
    }

    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                Confirm and Customise Credential
            </H4>
            <Button
                circular
                variant="outlined"
                size="$14"
                icon={<Plus size="$10" strokeWidth={2} />}
                onPress={() => {
                    console.log(
                        'Button pressed with credential data:',
                        credentialData
                    )
                    handleConfirm()
                }}
            />
            <Input
                size="$4"
                borderWidth={2}
                minWidth={300}
                onChangeText={(text) => onChangeTextValue(text)}
                value={textValue}
            />
        </YStack>
    )
}
/* This is a demo result:
const result = {
    credential: {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/bbs/v1',
        ],
        credentialSubject: {
            address: '77a West Pymble NSW',
            expiryDate: '2029-07-27T12:52:28.684Z',
            id: 'did:web:issuer.com%3A3334:issuer:TEST%20DMV%203',
            name: 'John Smith',
            passportNumber: 'RA111223323',
            type: [Array],
        },
        issuer: 'did:web:issuer.com%3A3334:issuer:TEST%20DMV%203',
        name: 'Passport',
        proof: {
            created: '2020-04-26T04:21:07Z',
            proofPurpose: 'assertionMethod',
            proofValue: '',
            type: 'BbsBlsSignature2020',
            verificationMethod: 'did:example:489398593#test',
        },
        type: ['VerifiableCredential', 'Passport'],
    },
}
*/
