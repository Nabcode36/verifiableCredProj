import type { SizeTokens } from 'tamagui'
import { H4, YStack, Button, Label, RadioGroup, XStack } from 'tamagui'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import axios from 'axios'
import React from 'react'

interface CredentialConfiguration {
    name: string
    configuration: string
    cryptographic_binding_methods_supported: string
    credential_configuration: {
        type: string[]
        credentialSubject: any
    }
}

interface ChooseScreenProps {
    tokenResponse?: {
        accesstoken: string
        tokenType: string
        expiresIn: string
    }
    validatedMetaData?: {
        credential_issuer: string
        credential_endpoint: string
        credential_configurations_supported: CredentialConfiguration[]
    }
    feedThroughUrl: string
}

// Screen to choose which Credential to request from the issuer
export function ChooseScreen({
    tokenResponse,
    validatedMetaData,
    feedThroughUrl,
}: ChooseScreenProps) {
    const [credentialOptions, setCredentialOptions] = useState<
        CredentialConfiguration[]
    >([])
    const [selectedCredentialType, setSelectedCredentialType] = useState<
        string | null
    >(null)

    console.log('Token Response:', tokenResponse?.accesstoken)
    console.log('Validated Metadata:', validatedMetaData)
    console.log('feedThroughUrl:', feedThroughUrl)

    useEffect(() => {
        if (validatedMetaData) {
            setCredentialOptions(
                validatedMetaData.credential_configurations_supported
            )
        }
    }, [validatedMetaData])

    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                Choose Credential Type
            </H4>
            <CredentialChooser
                list={credentialOptions}
                onSelect={(selected) => setSelectedCredentialType(selected)}
            />
            <Button
                themeInverse
                onPress={() => {
                    if (selectedCredentialType && tokenResponse?.accesstoken) {
                        console.log(
                            'selectedCredentialType: ',
                            selectedCredentialType
                        )
                        handleConfirm(
                            selectedCredentialType,
                            tokenResponse.accesstoken,
                            feedThroughUrl
                        )
                    } else {
                        console.error(
                            'No credential type selected or missing access token'
                        )
                    }
                }}
            >
                Confirm
            </Button>
            <Button onPress={() => router.navigate('(tabs)/credentials')}>
                Cancel
            </Button>
        </YStack>
    )
}

// Component which chooses credential using radio group
export function CredentialChooser({
    list,
    onSelect,
}: {
    list: CredentialConfiguration[]
    onSelect: (selected: string) => void
}) {
    const listItems = list.map((item, index) => (
        <RadioGroupItemWithLabel
            size="$5"
            value={item.name}
            label={item.name}
            key={index}
        />
    ))

    return (
        <RadioGroup
            aria-labelledby="Select one credential"
            defaultValue="0"
            name="form"
            onValueChange={onSelect}
        >
            <YStack width={300} alignItems="center" space="$2">
                {listItems}
            </YStack>
        </RadioGroup>
    )
}

// radio group item with label component
export function RadioGroupItemWithLabel(props: {
    size: SizeTokens
    value: string
    label: string
}) {
    const id = `radiogroup-${props.value}`
    return (
        <XStack width={300} alignItems="center" space="$4">
            <RadioGroup.Item value={props.value} id={id} size={props.size}>
                <RadioGroup.Indicator />
            </RadioGroup.Item>

            <Label size={props.size} htmlFor={id}>
                {props.label}
            </Label>
        </XStack>
    )
}

// handle confirmation logic of credential request
async function handleConfirm(format: string, token: string, url: string) {
    // Implement the logic for confirming the selection +here
    console.log('Confirmed format:', format)
    console.log('Access Token:', token)

    const createCredentialUrl = `http://${url}/credential-request`

    console.log('URL:', createCredentialUrl)

    const CredentialResponse = await axios.post(createCredentialUrl, {
        format: format,
        proof: {
            proof_type: 'ldp_vp',
            ldp_vp: token,
        },
    })

    const finalCredential = JSON.stringify(CredentialResponse.data.credential)

    console.log()
    console.log(
        'CredentialResponse.data NOT JSON: ',
        JSON.parse(JSON.stringify(CredentialResponse.data.credential))
    )

    router.push({
        pathname: '/add/confirm',
        params: {
            CredentialResponseData: JSON.stringify(CredentialResponse.data),
            finalCredential: finalCredential,
        },
    })
}
