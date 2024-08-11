// DataBase functions. These functions interact with the database to extract
// and set data to it, and is called in the backend server's routes. If there
// are error lines, run pnpx prisma generate to generate the database types

import { Issuer, User, PrismaClient } from '@prisma/client'
import { JsonArray, JsonObject } from '@prisma/client/runtime/library'
import logger from './logger'

const prisma = new PrismaClient()

// Interface For Data Type
interface Data {
    issuerDID: string
    userId: string
    configurationId: string
    userPublicKey: string
    issuedAt?: string
    validUntil?: string
}

// Creates the issuer using the fields declared for issuers in the prisma database
export async function createIssuer(
    name: string,
    publicKey: string,
    privateKey: string,
    didDoc: JsonArray,
    issuerDID: string
) {
    const issuer = await prisma.issuer.create({
        data: {
            name: name,
            publicKey: publicKey,
            privateKey: privateKey,
            didDoc: didDoc,
            issuerDID: issuerDID,
        },
    })
    logger.info(issuer)
    return issuer
}

// Creates the user using the fields declared for users in the prisma database
export async function createUser(userDID: string, props: JsonObject) {
    const user = await prisma.user.create({
        data: {
            userDID: userDID,
            props: props,
        },
    })
    logger.info(user)
    return user
}

// Creates the create credential configuration for the current issuer using the
// fields declared for credential configurations in the prisma database
export async function createCredentialConfiguration(
    name: string,
    configuration: JsonArray[],
    issuerDID: string
) {
    const credentialConfiguration = await prisma.credentialConfiguration.create(
        {
            data: {
                name: name,
                credentialConfiguration: configuration,
                issuerDID: issuerDID,
            },
        }
    )
    logger.info(credentialConfiguration)
    return credentialConfiguration
}

// Creates a credential using the fields declared for credentials in the prisma database
export async function createCredential(
    issuerDID: string,
    userId: string,
    configurationId: string,
    userPublicKey: string,
    issuedAt?: string,
    validUntil?: string
) {
    const data: Data = {
        issuerDID: issuerDID,
        userId: userId,
        configurationId: configurationId,
        userPublicKey: userPublicKey,
    }

    if (issuedAt) {
        data.issuedAt = issuedAt
    }

    if (validUntil) {
        data.validUntil = validUntil
    }

    const credential = await prisma.credential.create({
        data: data,
    })

    logger.info(credential)

    return credential
}

// Creates a business using the fields declared for businesses in the prisma database
export async function createBusiness(
    name: string,
    publicKey: string,
    didDoc: JsonArray,
    businessDID: string,
    requiredCredentials: JsonArray
) {
    const credentialconfiguration = await prisma.business.create({
        data: {
            name: name,
            publicKey: publicKey,
            didDoc: didDoc,
            businessDID: businessDID,
            requiredCredentials: requiredCredentials,
        },
    })
    logger.info(credentialconfiguration)
    return credentialconfiguration
}

// Modifies the required credentials for a business in the database, where
// the specific business is identified through the businessId argument
export async function modifyBusinessRequiredCredentials(
    businessId: string,
    requiredCredentials: JsonArray
) {
    const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: {
            requiredCredentials: requiredCredentials,
        },
    })
    logger.info(updatedBusiness)
    return updatedBusiness
}

// GET REQUESTS

// Finds the credential configuration in the database for a specified credential
// type identified through the credentialId passed in as an argument
export async function findCredentialConfiguration(credentialId: string) {
    const credentialconfiguration =
        await prisma.credentialConfiguration.findUnique({
            where: { id: credentialId },
        })

    return credentialconfiguration
}

// This function gets a specific issuer based on the isserName argument
export async function getIssuer(issuerName: string) {
    const issuer = await prisma.issuer.findUnique({
        where: { name: issuerName },
    })

    return issuer
}

// Finds the issuer in the database through their DID passed in
// as an argument
export async function findIssuerByDID(issuerDID: string) {
    const issuer = await prisma.issuer.findUnique({
        where: { issuerDID: issuerDID },
    })

    return issuer
}

// Finds the user in the database through their Id passed in as
// an argument
export async function getUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { userDID: userId },
    })

    return user
}

// Finds the business configuration in the database through their DID
// passed in as an argument
export async function findBusinessConfigurationByDID(businessDID: string) {
    const business = await prisma.business.findUnique({
        where: { businessDID: businessDID },
    })

    return business
}

// Finds the credential in the database through mathcing the configurationId and
// userId arguments to the targeted credential fields
export async function findCredentialByUserIdAndCredentialConfigurationId(
    configurationId: string,
    userId: string
) {
    const credential = await prisma.credential.findFirst({
        where: {
            configurationId: configurationId,
            userId: userId,
        },
    })

    return credential
}

// This function extracts all credential configurations that exist in the database
// from all issuers
export async function getAllCredentialConfigurations(): Promise<
    { name: string; 'data-base-id': string }[]
> {
    try {
        const credentialconfigurations =
            await prisma.credentialConfiguration.findMany()

        // Mapping the credential configurations to the new configuration for
        // displaying purposes
        const configurationtedCredentialconfigurations =
            credentialconfigurations.map(
                (configuration: { name: string; id: string }) => ({
                    name: configuration.name,
                    'data-base-id': configuration.id,
                })
            )

        return configurationtedCredentialconfigurations
    } catch (error) {
        console.error(`Error fetching credential configurations: ${error}`)
        throw new Error('Failed to fetch credential configurations')
    }
}

// Finds a credential configuration from the database from its name, each
// configuration has a unique name
export async function getCredentialConfigurationFromName(name: string) {
    try {
        const credentialconfiguration =
            await prisma.credentialConfiguration.findUnique({
                where: {
                    name,
                },
            })

        return credentialconfiguration
    } catch (error) {
        console.error(`Error fetching credential configuration: ${error}`)
        throw new Error('Failed to fetch credential configuration')
    }
}

// Finds all credential configurations supported by a specified issuer,
// identified through the did argument
export async function getAllConfigerationsSupported(did: string) {
    try {
        const credentialconfigurations =
            await prisma.credentialConfiguration.findMany()

        // Map the credential configurations to the new configuration
        const formattedCredentialConfigurations = credentialconfigurations.map(
            (configuration: {
                name: string
                credentialConfiguration: JsonArray
            }) => ({
                name: configuration.name,
                configuration: 'jwt_vc_json',
                cryptographic_binding_methods_supported: did,
                credential_configuration: {
                    type: ['VerifiableCredential', configuration.name],
                    credentialSubject: {
                        ...configuration.credentialConfiguration,
                    },
                },
            })
        )

        return formattedCredentialConfigurations
    } catch (error) {
        console.error(`Error fetching credential configurations: ${error}`)
        throw new Error('Failed to fetch credential configurations')
    }
}

// Finds the did document for a specified issuer identified through the issuerDID
// argument
export async function getDidDoc(issuerDID: string) {
    const issuer = await prisma.issuer.findFirst({
        where: {
            issuerDID,
        },
    })
    return issuer
}

// Gets the current issuer from the database
export async function getCurrentIssuer() {
    try {
        const currentIssuer = await prisma.currentIssuer.findFirst({
            include: {
                issuer: true,
            },
        })
        return currentIssuer || null
    } catch (error) {
        console.error('Error fetching current issuer:', error)
        return null
    }
}

// Sets the current issuer in the database, through the issuer argument; a
// string which represents the issuer's didId
export async function setCurrentIssuer(issuer: Issuer) {
    try {
        await prisma.currentIssuer.deleteMany()

        await prisma.currentIssuer.create({
            data: {
                issuerDID: issuer.issuerDID,
            },
        })

        console.log(`Current issuer set to ${issuer.name}`)
    } catch (error) {
        console.error('Error setting current issuer:', error)
    }
}

// Gets the current user from the database
export async function getCurrentUser() {
    try {
        const currentUser = await prisma.currentUser.findFirst({
            include: {
                user: true,
            },
        })
        return currentUser || null
    } catch (error) {
        console.error('Error fetching current user:', error)
        return null
    }
}

// Sets the current user in the database, through the user argument; a
// string which represents the user's didId
export async function setCurrentUser(user: User) {
    try {
        await prisma.currentUser.deleteMany()

        await prisma.currentUser.create({
            data: {
                userDID: user.userDID,
            },
        })

        console.log(`Current issuer set to ${user.userDID}`)
    } catch (error) {
        console.error('Error setting current user:', error)
    }
}

// Deletes all data in the database, removing referred fields first
// to prevent errors
export async function deleteAll() {
    try {
        await prisma.currentIssuer.deleteMany()
        await prisma.currentUser.deleteMany()
        await prisma.credential.deleteMany()
        await prisma.credentialConfiguration.deleteMany()
        await prisma.issuer.deleteMany()
        await prisma.user.deleteMany()
        await prisma.business.deleteMany()

        console.log('All data has been deleted successfully.')
    } catch (error) {
        console.error('Error deleting data:', error)
    }
}

// Gets a list of all existing issuers in the database
export async function getIssuerList() {
    const issuerList = await prisma.issuer.findMany()
    return issuerList
}

// Gets a list of all existing users in the database
export async function getUserList() {
    const userList = await prisma.user.findMany()
    return userList
}

// Gets the userprops of a specified user through the userDID
// argument. User props is the user data that is provided to issuers
export async function getUserProps(userDID: string) {
    const user = await prisma.user.findFirst({
        where: {
            userDID,
        },
    })
    return user?.props
}
