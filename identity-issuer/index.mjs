#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

// This is the main file for the issuer CLI (command line interface). The purpose
// of the issuer CLI is to provide the functionality for the setup of issuing credentials.
// The functionality involved is mainly calling the routes defined in './src/routes.ts'
// which is ran in the issuer's backend server. The specific functionality involves creating
// issuers, users and credential configurations. The functions for this is imported from
// './cli/cliFunctions.mjs'
//
// *****NOTE*****
// It's important that the CLI is used to create an issuer and a user upon initial use when
// there aren't any existing issuers and users.

import axios from 'axios'
import chalk from 'chalk'
import readline from 'node:readline'
import {
    checkStatus,
    getIssuerList,
    createIssuer,
    getCurrentIssuer,
    setCurrentIssuer,
    createCredConfig,
    getUserList,
    createUser,
    getCurrentUser,
    setCurrentUser,
} from './cli/cliFunctions.mjs'

// Logo created in https://www.asciiart.eu/
const logo = `
 _____                                                                                _____ 
( ___ )------------------------------------------------------------------------------( ___ )
 |   |                                                                                |   | 
 |   | ~██████╗██████╗~███████╗██████╗~███████╗███╗~~~██╗████████╗██╗~█████╗~██╗~~~~~ |   | 
 |   | ██╔════╝██╔══██╗██╔════╝██╔══██╗██╔════╝████╗~~██║╚══██╔══╝██║██╔══██╗██║~~~~~ |   | 
 |   | ██║~~~~~██████╔╝█████╗~~██║~~██║█████╗~~██╔██╗~██║~~~██║~~~██║███████║██║~~~~~ |   | 
 |   | ██║~~~~~██╔══██╗██╔══╝~~██║~~██║██╔══╝~~██║╚██╗██║~~~██║~~~██║██╔══██║██║~~~~~ |   | 
 |   | ╚██████╗██║~~██║███████╗██████╔╝███████╗██║~╚████║~~~██║~~~██║██║~~██║███████╗ |   | 
 |   | ~╚═════╝╚═╝~~╚═╝╚══════╝╚═════╝~╚══════╝╚═╝~~╚═══╝~~~╚═╝~~~╚═╝╚═╝~~╚═╝╚══════╝ |   | 
 |   | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |   | 
 |   | ███████╗███████╗██████╗~██╗~~~██╗██╗~██████╗███████╗███████╗~~~~~~~~~~~~~~~~~~ |   | 
 |   | ██╔════╝██╔════╝██╔══██╗██║~~~██║██║██╔════╝██╔════╝██╔════╝~~~~~~~~~~~~~~~~~~ |   | 
 |   | ███████╗█████╗~~██████╔╝██║~~~██║██║██║~~~~~█████╗~~███████╗~~~~~~~~~~~~~~~~~~ |   | 
 |   | ╚════██║██╔══╝~~██╔══██╗╚██╗~██╔╝██║██║~~~~~██╔══╝~~╚════██║~~~~~~~~~~~~~~~~~~ |   | 
 |   | ███████║███████╗██║~~██║~╚████╔╝~██║╚██████╗███████╗███████║~~~~~~~~~~~~~~~~~~ |   | 
 |   | ╚══════╝╚══════╝╚═╝~~╚═╝~~╚═══╝~~╚═╝~╚═════╝╚══════╝╚══════╝~~~~~~~~~~~~~~~~~~ |   | 
 |___|                                                                                |___| 
(_____)------------------------------------------------------------------------------(_____)                                       
   `
// Takes in user input in several prompts of the CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Function to prompt the user for input
const promptUser = async () => {
    rl.question('🔸 ', handleUserInput)
}

// Function to handle different cases of user input
const handleUserInput = async (input) => {
    switch (input.toLowerCase()) {
        case 'help':
            console.log(
                chalk.blue('Available commands:\n') +
                    chalk.green('  - help:') +
                    ' Show this help message\n' +
                    chalk.green('  - status:') +
                    ' Check server status and current issuer and user\n' +
                    chalk.green('  - exit:') +
                    ' Exit the CLI\n' +
                    chalk.yellow('  Issuer Commands\n') +
                    chalk.green('    - issuer list:') +
                    ' Get a list of existing issuers\n' +
                    chalk.green('    - current issuer:') +
                    ' Shows the active issuer\n' +
                    chalk.green('    - set issuer:') +
                    ' Makes a specified issuer the current/active issuer\n' +
                    chalk.green('    - create issuer:') +
                    ' Creates a new issuer\n' +
                    chalk.green('    - create cred config:') +
                    ' Creates a credential configuration for the current issuer given the following fields:\n' +
                    chalk.magenta('      • name: ') +
                    'name of the credential configuration\n' +
                    chalk.magenta('      • configuration: ') +
                    'the required/unique fields for the credential separated by commas `,` (use `.` for nested fields)\n' +
                    chalk.yellow('  User Commands\n') +
                    chalk.green('    - user list:') +
                    ' Get a list of existing users\n' +
                    chalk.green('    - current user:') +
                    ' Shows the active user\n' +
                    chalk.green('    - set user:') +
                    ' Makes a specified issuer the current/active user\n' +
                    chalk.green('    - create user:') +
                    ' Creates a new user given the following fields:\n' +
                    chalk.magenta('      • user id: ') +
                    'id of the user\n' +
                    chalk.magenta('      • claims: ') +
                    'the relevant claim (type: value) to be used in the appropriate credential,\n' +
                    '                each claim needs to be separated by commas `,`\n'
            )
            break
        case 'status':
            await checkStatus()
            break
        case 'exit':
            console.log(chalk.green('See ya :)\n'))
            rl.close()
            // Exit the function without prompting the user again
            return
        case 'issuer list':
            await getIssuerList()
            break
        case 'current issuer':
            await getCurrentIssuer()
            break
        case 'set issuer':
            // Another prompt for entering the issuer's name when
            // enterting the set issuer command
            rl.question(
                chalk.green('Enter issuer name: '),
                async (issuerName) => {
                    await setCurrentIssuer(issuerName)
                    promptUser()
                }
            )
            break
        case 'create issuer':
            // Another prompt for entering the issuer's name when
            // enterting the create issuer command
            rl.question(
                chalk.green('Enter issuer name: '),
                async (issuerName) => {
                    await createIssuer(issuerName)
                    promptUser()
                }
            )
            break
        case 'create cred config':
            // Two sub prompts for entering the credential configuration's
            // name and then the configuration when enterting the
            // create cred config command
            rl.question(
                chalk.green('Enter credential configuration name: '),
                async (name) => {
                    rl.question(
                        chalk.green(
                            'Enter configuration fields (use `.` for nested fields, e.g., address.street, address.number, address.type}): '
                        ),
                        async (configuration) => {
                            const configurationArray =
                                parseConfiguration(configuration)
                            await createCredConfig(name, configurationArray)
                            promptUser()
                        }
                    )
                }
            )
            break
        case 'user list':
            await getUserList()
            break
        case 'current user':
            await getCurrentUser()
            break
        case 'set user':
            // Another prompt for entering the user's id when
            // enterting the set user command
            rl.question(chalk.green('Enter user id: '), async (userId) => {
                await setCurrentUser(userId)
                promptUser()
            })
            break
        case 'create user':
            // Two sub prompts for entering the user's id and then
            // the props/claims when enterting the create user command
            rl.question(chalk.green('Enter user id: '), async (userId) => {
                rl.question(
                    chalk.green(
                        'Enter claims (type: value) separated by commas: '
                    ),
                    async (claims) => {
                        const props = await parseProps(claims)
                        await createUser(userId, props)
                        promptUser()
                    }
                )
            })
            break
        default:
            // When an unsupported command is entered, print the following message
            console.log(
                chalk.red(
                    'Unknown command. Type "help" for a list of available commands.\n'
                )
            )
    }
    promptUser()
}

// This functions conforms the user props entered under the 'create user command'
// to the appropriate json format for the create user response route in the backend
// './src/routes.ts'
const parseProps = async (claims) => {
    const result = {}

    claims.split(',').forEach((claim) => {
        const [key, value] = claim.split(':').map((item) => item.trim())
        const keys = key.split('.')
        let current = result

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i]
            if (i === keys.length - 1) {
                current[k] = isNaN(value) ? value : Number(value)
            } else {
                current[k] = current[k] || {}
                current = current[k]
            }
        }
    })

    return result
}

// This functions conforms the configuration entered under the 'create cred config command'
// to the appropriate json array format for the create credential configuration route response
// in the backend './src/routes.ts'
function parseConfiguration(configuration) {
    function parseFields(fields) {
        const result = {}
        let stack = [result]
        let current = result

        fields.split(',').forEach((field) => {
            field = field.trim()

            if (field.includes('{')) {
                const [key, subFields] = field.split('{')
                current[key.trim()] = {}
                stack.push(current)
                current = current[key.trim()]
                field = subFields.slice(0, -1)
            }

            if (field.includes('}')) {
                const subFields = field.split('}')
                current[subFields[0].trim()] = subFields[0].trim()
                current = stack.pop()
                if (subFields[1]) {
                    stack[stack.length - 1][subFields[1].trim()] = {}
                    current = stack[stack.length - 1][subFields[1].trim()]
                }
            } else {
                current[field] = field
            }
        })

        return result
    }

    const parsedConfig = parseFields(configuration)
    return transformToArray(parsedConfig)
}

// This function is called by the parseConfiguration function and transforms the
// configuration data into an array to conform to the json array type
function transformToArray(obj) {
    const result = []
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            result.push({ [key]: transformToArray(obj[key]) })
        } else {
            result.push(key)
        }
    }
    return result
}

// This function runs upon the CLI initilisation to check that the server is
// up and running and can be successfully connected to
async function cliInitialise() {
    try {
        const response = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/health'
        )
        if (response.statusText == 'OK') {
            console.log(
                '\nCredential Issuance Services (CIS). All credentials reserved'
            )
            console.log(chalk.magenta(logo))
            console.log(
                chalk.yellow(
                    "Welcome to the Credential Issuance Services \nFor a list of available commands, type 'help'\n"
                )
            )

            promptUser()
        } else {
            console.log(chalk.redBright('server is down\n'))
            process.exit(1)
        }
    } catch (error) {
        console.log(chalk.redBright('Server is down\n'))
        process.exit(1)
    }
}

cliInitialise()
