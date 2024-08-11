import {
    H4,
    YStack,
    YGroup,
    ListItem,
    Button,
    Spinner,
    RadioGroup,
} from 'tamagui'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { QrCamera } from 'components/qr-camera'
import { AuthResponse } from 'types/Provider/ProviderRequest'
import { RadioGroupItemWithLabel } from 'components/RadioGroup'
import { Check, X, ChevronDown, ChevronRight } from '@tamagui/lucide-icons'
import { Sheet } from '@tamagui/sheet'
import { getCredentialField } from 'packages/db/dbConnect'
import {
    ProviderResponseOut,
    VerifiableCredential,
} from 'types/Provider/ProviderResponse'
import axios from 'axios'
import React from 'react'

enum RequestFieldStatus {
    SEARCHING,
    FOUND,
    FAIL,
}

type RequestItem = {
    id: string
    name: string
    found: RequestFieldStatus
    fields: string[]
    credentialsFound: { name: string; data: VerifiableCredential }[]
    selectedIndex: number
}

// add the verifiable credential value to RequestItem + whats being sent

interface ChooseScreenProps {
    authResponse: AuthResponse
    response_uri: string
}

/**export interface AuthResponse {
    client_id: string,
    client_id_scheme: string,
    redirect_uri: string,
    response_type: string,
    response_mode: string,
    nonce: string,
    state: string,
    presentation_definition: PresentationDefinition,
    client_metadata: {
        vp_formats: {
            ldp_vp: {
                proof_type: string[]
            }
        },
        client_name: string,
        logo_uri: string,
        tos_uri: string,
        policy_uri: string
    }
}
    


interface PresentationDefinition {
    '@context': string[];
    id: string;
    format: {
      ldp_vc: {
        proof_type: string[];
      };
    };
    input_descriptors: {
      id: string;
      name: string;
      purpose: string;
      constraints: {
        fields: {
          path: string[];
          filter?: {
            type: string;
            pattern: string;
          };
        }[];
      };
    }[];
  }*/

interface input_descriptors {
    id: string
    name: string
    purpose: string
    constraints: {
        fields: {
            path: string
            filter?: {
                type: string
                pattern: string
            }
        }[]
    }
}

// function newRequestItem(name: string, found: RequestFieldStatus, inputDescriptor: input_descriptors, response_uri: string): RequestItem {

//   console.log("newRequestItem: ")

//   const [credentials, setcredentials] = useState<VerifiableCredential[]>([]);

//   console.log("newRequestItem: ")
//   const fields = inputDescriptor.constraints.fields

//   console.log("fields: ", fields)

//       // const fields = [
//     //   { path: 'credentialSubject.thing.stuff.passportNumber', filter: { pattern: 'RA111223323' } },
//     //   { path: 'issuer.id', filter: { pattern: 'did:web:issuer.com:3334:issuer:TEST DMV' } },
//     //   { path: 'issuer.name'}
//     // ];

//     // // Call the function to query the database

//     useEffect(() => {

//     getCredentialField(fields, (result) => {
//       if (result) {
//         console.log('Fetched Credentials:', result);
//         setcredentials(result)
//         return result
//       } else {
//         console.log('No credentials found matching the criteria.');
//       }
//     });

//   })

//     const credentialsFound = credentials.map(credential => {
//       return {name: credential.name,
//               data: credential
//       }
//     })

//     // printAllCredentials();

//     // testCredentialSubject();
//     // testIssuer();

//   return (
//     {
//       name: name,
//       found: found,
//       fields: [] as String[],
//       credentialsFound: credentialsFound,
//       selectedIndex: 0,
//     }
//   )
// }

// sheet that appears during credential selection for presentation, you can select between found credentials
// changes the states of what credentials are chosen to be sent for presentation
export function CredentialSelectionSheet({
    open,
    setOpen,
    request,
    setRequest,
    requestItems,
    setRequestItems,
}) {
    const [position, setPosition] = useState(0)
    console.log('request:', request)

    // displays the content of the request, the requested credentials
    // provides screen for if no credentials found
    const content = request ? (
        <YStack alignItems="center" justifyContent="center">
            <H4 ta="center" col="$color12">
                {request.name}
            </H4>
            <RadioGroup
                key={request.id}
                aria-labelledby="Select credential to use"
                value={request.selectedIndex}
                name="form"
                onValueChange={(value) => {
                    setRequest({
                        ...request,
                        selectedIndex: value as unknown as number,
                    })
                }}
            >
                <YStack width={300} alignItems="center">
                    {request.credentialsFound.map((item, index) => (
                        <RadioGroupItemWithLabel
                            size="$5"
                            value={index as string}
                            label={item.name}
                            key={index}
                        />
                    ))}
                </YStack>
            </RadioGroup>
        </YStack>
    ) : (
        <H4 ta="center" col="$color12">
            No Request
        </H4>
    )

    // return sheet with components configured
    // changes the state of what will be returned upon close
    return (
        <Sheet
            forceRemoveScrollEnabled={open}
            modal
            open={open}
            onOpenChange={setOpen}
            snapPoints={[75, 50, 25]}
            dismissOnSnapToBottom
            position={position}
            onPositionChange={setPosition}
            zIndex={100_000}
            animation="medium"
        >
            <Sheet.Overlay
                animation="lazy"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
            />
            <Sheet.Handle />
            <Sheet.Frame
                padding="$4"
                justifyContent="flex-start"
                alignItems="center"
            >
                <Button
                    size="$6"
                    circular
                    icon={ChevronDown}
                    onPress={() => {
                        setOpen(false)
                        const updatedReqItems = requestItems.map((reqItem) => {
                            if (request.name === reqItem.name) {
                                // change to display req
                                return request
                            } else {
                                // The rest haven't changed
                                return reqItem
                            }
                        })
                        setRequestItems(updatedReqItems)
                    }}
                />
                {content}
            </Sheet.Frame>
        </Sheet>
    )
}

// Screen to start credential presentation
export function PresentScanScreen() {
    // Scan service provider code using QR Camera in present mode
    return (
        <YStack fullscreen ai={'center'} jc={'space-evenly'}>
            <H4 ta="center" col="$color12">
                Scan Service Provider Code
            </H4>
            <QrCamera present />
        </YStack>
    )
}

// Screen to start credential presentation
export function PresentStart({
    authResponse,
    response_uri,
}: ChooseScreenProps) {
    // Grab provider name and names of credentials they are requesting
    const name = authResponse.client_metadata.client_name

    const approvalText = String(' is requesting your credentials')
    console.log('PresentStart authResponse: ', authResponse)
    console.log('PresentStart response_uri: ', response_uri)

    // display provider requesting credentials
    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                {name.concat(approvalText)}
            </H4>
            <Button
                onPress={() =>
                    router.push({
                        pathname: 'present/approve',
                        params: {
                            authResponse: JSON.stringify(authResponse),
                            response_uri: response_uri,
                        },
                    })
                }
            >
                Continue
            </Button>
        </YStack>
    )
}

// screen to approve the presentation, use found to load if the credential found
export function PresentApprove({
    authResponse,
    response_uri,
}: ChooseScreenProps) {
    const [serviceProvider, setServiceProvider] = useState('')
    const [requestItems, setRequestItems] = useState<RequestItem[]>([])
    const [open, setOpen] = useState(false)
    const [displayRequest, setDisplayRequest] = useState<RequestItem | null>(
        null
    )

    useEffect(() => {
        console.log('Setting serviceProvider...')
        setServiceProvider(authResponse.client_metadata.client_name)
        console.log(
            'Service provider set to: ',
            authResponse.client_metadata.client_name
        )

        const fetchCredentials = (descriptor: input_descriptors) => {
            console.log('Fetching credentials for descriptor: ', descriptor)
            return new Promise<RequestItem>((resolve) => {
                const fields = descriptor.constraints.fields
                console.log('Fields for descriptor: ', fields)

                getCredentialField(fields, (result: any[] | false) => {
                    console.log('Result from getCredentialField: ', result)
                    if (result && Array.isArray(result)) {
                        const credentialsFound = result.map((credential) => ({
                            name: credential.name,
                            data: credential,
                        }))
                        console.log('Credentials found: ', credentialsFound)

                        resolve({
                            id: descriptor.id,
                            name: descriptor.name,
                            found: RequestFieldStatus.FOUND,
                            fields: [],
                            credentialsFound,
                            selectedIndex: 0,
                        })
                    } else {
                        console.log(
                            'No credentials found matching the criteria for descriptor: ',
                            descriptor.name
                        )
                        resolve({
                            id: descriptor.id,
                            name: descriptor.name,
                            found: RequestFieldStatus.FAIL,
                            fields: [],
                            credentialsFound: [],
                            selectedIndex: 0,
                        })
                    }
                })
            })
        }

        const fetchAllCredentials = async () => {
            console.log('Fetching all credentials...')
            try {
                const items = await Promise.all(
                    authResponse.presentation_definition.input_descriptors.map(
                        (descriptor) => fetchCredentials(descriptor)
                    )
                )
                console.log('All credentials fetched: ', items)
                console.log(
                    'All credentials fetched: ',
                    items[0].credentialsFound
                )
                setRequestItems(items)
            } catch (error) {
                console.error('Error fetching credentials: ', error)
            }
        }

        fetchAllCredentials()
    }, [authResponse])

    const approvalText = ' is requesting your credentials'

    const requestItemsDisplay = requestItems.map((item, index) => (
        <YGroup.Item key={index}>
            <ListItem
                key={1}
                hoverTheme
                pressTheme
                title={item.name}
                subTitle={
                    item.credentialsFound[item.selectedIndex]?.name ||
                    'No credentials'
                }
                icon={
                    item.found === RequestFieldStatus.SEARCHING ? (
                        <Spinner />
                    ) : item.found === RequestFieldStatus.FOUND ? (
                        <Check />
                    ) : (
                        <X />
                    )
                }
                iconAfter={ChevronRight}
                onPress={() => {
                    console.log('Opening item: ', item)
                    setOpen(true)
                    setDisplayRequest(item)
                }}
            />
        </YGroup.Item>
    ))

    console.log('Rendered requestItems: ', requestItems)

    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                {serviceProvider.concat(approvalText)}
            </H4>
            <YGroup alignSelf="center" bordered width={240} size="$4">
                {requestItemsDisplay}
            </YGroup>
            <Button
                themeInverse
                onPress={() => {
                    console.log('Approving with requestItems: ', requestItems)
                    console.log('authResponse: ', authResponse)
                    console.log('response_uri: ', response_uri)
                    presentationSend(requestItems, authResponse, response_uri)
                }}
            >
                Approve
            </Button>
            <Button
                onPress={() => {
                    console.log('Rejecting, navigating to (tabs)/present')
                    router.navigate('(tabs)/present')
                }}
            >
                Reject
            </Button>
            <CredentialSelectionSheet
                open={open}
                setOpen={setOpen}
                request={displayRequest}
                setRequest={setDisplayRequest}
                requestItems={requestItems}
                setRequestItems={setRequestItems}
            />
        </YStack>
    )
}

// interface TransactionResponse {
//   vp_token: VPToken | VPToken[],
//   presentation_submission: PresentationSubmission,
//   state: string,
// }

// interface VPToken {
//   '@context': string[],
//   type: string[],
//   verifiableCredential: VerifiableCredential[],
//   proof: Proof
// }

// do all the stuff to send the presentation here
export async function presentationSend(
    requestItems: RequestItem[],
    authResponse: AuthResponse,
    response_uri: string
) {
    console.log('presentationSend')

    console.log('authResponse: ', authResponse)

    const finalSelectedCredentials = requestItems.map((requestItem) => {
        console.log('requestItem', requestItem)
        console.log(
            'requestItem.credentialsFound',
            requestItem.credentialsFound
        )
        return requestItem.credentialsFound[requestItem.selectedIndex]
    })

    console.log('finalSelectedCredentials: ', finalSelectedCredentials)

    const finalDescriptorMap = requestItems.map((requestItem, index) => {
        return {
            id: requestItem.id,
            format: 'ldp_vp',
            path: '$',
            path_nested: {
                format: 'ldp_vc',
                path: `$.verifiableCredential[${index}]`,
            },
        }
    })

    console.log('finalDescriptorMap: ', finalDescriptorMap)

    const finalVerifiableCredential = finalSelectedCredentials.map(
        (credential) => {
            return credential.data
        }
    )

    const finalQuerryObject = {
        state: authResponse.state,
        presentation_submission: {
            id: '12312312312412',
            definition_id: authResponse.presentation_definition.id,
            descriptor_map: finalDescriptorMap,
        },
        vp_token: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            verifiableCredential: finalVerifiableCredential,
            id: '123123112315324635646856724342312412',
            holder: 'did:example:holder',
            proof: {
                type: 'Ed25519Signature2018',
                created: '2021-03-19T15:30:15Z',
                challenge: 'n-0S6_WzA2Mj',
                domain: 'https://client.example.org/cb',
                jws: 'eyJhbG...IAoDA',
                proofPurpose: 'authentication',
                verificationMethod: 'did:example:holder#key-1',
            },
        },
    }

    console.log('-----------------------------------------------------------')
    console.log('authResponse.state: ', authResponse.state)
    console.log(
        'authResponse.presentation_definition.id: ',
        authResponse.presentation_definition.id
    )
    console.log('finalDescriptorMap: ', finalDescriptorMap)
    console.log(
        'finalSelectedCredentials: ',
        finalSelectedCredentials[0].data.type
    )
    console.log('finalQuerryObject: ', finalQuerryObject)
    console.log(JSON.stringify(finalQuerryObject, null, 4))

    console.log('-----------------------------------------------------------')

    try {
        console.log('response_uri: ', response_uri)
        const axiosResponseObject = await axios.post(
            response_uri,
            finalQuerryObject
        )

        console.log('axiosResponseObject: ', axiosResponseObject.data)

        router.push({
            pathname: 'present/confirm',
            params: {
                axiosResponseObject: JSON.stringify(axiosResponseObject.data),
                authResponse: JSON.stringify(authResponse),
            },
        })
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Axios error
            console.error('Error fetching data:')
            if (error.response) {
                // Server responded with a status code out of 2xx range
                console.error('Status:', error.response.status)
                console.error('Status Text:', error.response.statusText)
                console.error('Headers:', error.response.headers)
                console.error('Data:', error.response.data)
            } else if (error.request) {
                // No response was received
                console.error('No response received:', error.request)
            } else {
                // Error setting up the request
                console.error('Error setting up request:', error.message)
            }
            console.error('Config:', error.config)
            console.error('Message:', error.message)
        } else {
            // Other errors
            console.error('Unexpected Error:', error)
        }
        router.push({ pathname: '(tabs)/credentials' })
    }
}

// screen to confirm presentation has been sent and display code

interface PresentConfirmProps {
    axiosResponseObject: ProviderResponseOut
    authResponse: AuthResponse
}

export function PresentConfirm({
    axiosResponseObject,
    authResponse,
}: PresentConfirmProps) {
    const confirmCode =
        axiosResponseObject.redirect_uri.split('response_code=')[1]

    const [confirmationCode, setConfirmationCode] = useState('')
    const [serviceProvider, setServiceProvider] = useState('')

    useEffect(() => {
        setConfirmationCode(confirmCode)
        setServiceProvider(authResponse.client_metadata.client_name)
    }, [])

    return (
        <YStack f={1} jc="center" ai="center" gap="$8" p="$4">
            <H4 ta="center" col="$color12">
                {serviceProvider + ' has recieved your credentials'}
            </H4>
            <H4 ta="center" col="$color12">
                {confirmationCode}
            </H4>
            <Button
                themeInverse
                onPress={() => router.navigate('(tabs)/present')}
            >
                Present Again
            </Button>
        </YStack>
    )
}
