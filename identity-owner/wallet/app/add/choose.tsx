import { ChooseScreen } from 'screens/add/choose'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useTheme } from 'tamagui'
import React from 'react'

export default function Screen() {
    const theme = useTheme()
    const params = useLocalSearchParams()

    // Ensure tokenResponse is a string
    const tokenResponseString = Array.isArray(params.tokenResponse)
        ? params.tokenResponse[0] // Take the first element if it's an array
        : params.tokenResponse

    // Parse the tokenResponse string if it's defined
    const tokenResponse = tokenResponseString
        ? JSON.parse(tokenResponseString)
        : null

    // Ensure validatedMetaData is a string
    const validatedMetaDataString = Array.isArray(params.validatedMetaData)
        ? params.validatedMetaData[0] // Take the first element if it's an array
        : params.validatedMetaData

    // Parse the validatedMetaData string if it's defined
    const validatedMetaData = validatedMetaDataString
        ? JSON.parse(validatedMetaDataString)
        : null

    const feedThroughUrlString = Array.isArray(params.feedThroughUrl)
        ? params.feedThroughUrl[0] // Take the first element if it's an array
        : params.feedThroughUrl || ''

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Customise',
                    headerTintColor: theme.color.val,
                }}
            />
            <ChooseScreen
                tokenResponse={tokenResponse}
                validatedMetaData={validatedMetaData}
                feedThroughUrl={feedThroughUrlString}
            />
        </>
    )
}
