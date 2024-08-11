import {
    H4,
    YStack,
    Separator,
    YGroup,
    ListItem,
    SizableText,
    Button,
} from 'tamagui'
import { Plus } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
    getAllDisplayCredentials,
    getCredential,
    getFavDisplayCredentials,
    testCredentialSubject,
} from 'packages/db/dbConnect'
import { useFocusEffect } from '@react-navigation/native'

// Screen which displays the credentials on the tab
export function CredentialsScreen() {
    // credential db
    const [favourites, setFavourites] = useState([])
    const [allCredentials, setAllCredentials] = useState([])

    useFocusEffect(
        React.useCallback(() => {
            const fetchData = async () => {
                try {
                    console.log('Inside display credential use effect')
                    await getAllDisplayCredentials((credentials) => {
                        console.log('Fetched Display cred:', credentials)
                        // Assuming the data contains favourites and other credentials
                        // Update the state based on the fetched data
                        setAllCredentials(credentials)
                    })

                    getFavDisplayCredentials((favCredentials) => {
                        console.log(
                            'Fetched fav display creds:',
                            favCredentials
                        )
                        setFavourites(favCredentials)
                    })

                    getCredential((callback) => {
                        console.log('ALL CREDENTIALS: ', callback)
                    })

                    testCredentialSubject()
                } catch (error) {
                    console.error('Error fetching credentials:', error)
                }
            }

            fetchData()
        }, [])
    )

    return (
        <YStack fullscreen alignItems="center">
            <YStack
                fullscreen
                alignItems="flex-start"
                flex={1}
                padding="$7"
                gap="$4"
            >
                <YStack gap="$1">
                    <H4>Favourites</H4>
                    <Separator marginVertical={15} />
                    <CredentialGroup list={favourites} />
                </YStack>
                <YStack gap="$0">
                    <H4>Other</H4>
                    <Separator marginVertical={15} />
                    <CredentialGroup list={allCredentials} />
                </YStack>
            </YStack>
            <YStack
                fullscreen
                position="absolute"
                justifyContent="flex-end"
                padding="$3"
                alignItems="flex-end"
            >
                <Button
                    themeInverse
                    circular
                    size="$5"
                    icon={<Plus size="$4" strokeWidth={2} />}
                    onPress={() => router.navigate('/add')}
                />
            </YStack>
        </YStack>
    )
}

// Loads group of credentials from list and displays them
// screen provided for no credentials
function CredentialGroup({ list }) {
    if (list.length === 0) {
        return (
            <YGroup alignSelf="center" bordered size="$4">
                <YGroup.Item>
                    <ListItem hoverTheme icon={Plus}>
                        No credentials added.
                    </ListItem>
                </YGroup.Item>
            </YGroup>
        )
    }

    const listItems = list.map((item, index) => (
        <YGroup.Item key={index}>
            <ListItem
                hoverTheme
                icon={<SizableText>{item.displayIcon}</SizableText>}
                onPress={() => router.push(`credentials/${item.id}`)}
            >
                {item.displayName}
            </ListItem>
        </YGroup.Item>
    ))

    return (
        <YGroup alignSelf="center" bordered size="$4">
            {listItems}
        </YGroup>
    )
}
