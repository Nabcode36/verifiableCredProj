/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

// This is where the functions used in '../index.mjs' are called from
// These functions call the routes defined in '../src/routes.ts' of the
// issuer backend server and the arguments in each function is passed in
// via the command line input in the issuer CLI which then manifests in the
// body of the http route requests in the backend server.

import axios from 'axios'
import chalk from 'chalk'

// Checks the status of the server by calling the '/health' route and
// retrieves the current issuer and current user for display and UI purposes
export async function checkStatus() {
    try {
        const response = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/health'
        )
        if (response.statusText == 'OK') {
            console.log(
                chalk.blue('server status: ') +
                    chalk.green(response.statusText) +
                    '\n'
            )
            await getCurrentIssuer()
            await getCurrentUser()
        } else {
            console.log(chalk.redBright(response.statusText) + '\n')
        }
    } catch (error) {
        console.error(chalk.redBright('server is down\n'))
    }
}

// Gets the list of all issuers in the database by calling the
// '/get/issuer-list' route for display and UI purposes
export async function getIssuerList() {
    try {
        const response = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/get/issuer-list'
        )

        if (!Array.isArray(response.data)) {
            console.error('Invalid data format')
            return
        }
        // If the response data from the route is empty, then there are no issuers
        if (response.data.length === 0) {
            console.log(
                chalk.red(
                    'No issuers available. To create a new issuer run the `create issuer` command\n'
                )
            )
            return
        }

        // Nicely formatting the existing issuers
        console.log(chalk.magenta('Available issuers:'))
        response.data.forEach((issuer) => {
            console.log(chalk.green('- ' + issuer.name))
        })
        console.log('\n')
    } catch (error) {
        console.error('Error:', error)
    }
}

// Gets the list of all users in the database by calling the
// '/get/user-list' route for display and UI purposes
export async function getUserList() {
    try {
        const response = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/get/user-list'
        )

        if (!Array.isArray(response.data)) {
            console.error('Invalid data format')
            return
        }
        // If the response data from the route is empty, then there are no users
        if (response.data.length === 0) {
            console.log(
                chalk.red(
                    'No users available. To create a new user run the `create user` command\n'
                )
            )
            return
        }

        // Nicely formatting the existing users
        console.log(chalk.magenta('Existing users:'))
        response.data.forEach((user) => {
            console.log(chalk.green('- ' + user.userDID))
        })
        console.log('\n')
    } catch (error) {
        console.error('Error:', error)
    }
}

// Calls the '/create/issuer' route to create an issuer from the
// issuerName argument passed in from the CLI
export async function createIssuer(issuerName) {
    try {
        const response = await axios.post(
            'http://identity-issuer-identity-issuer-1:3000/create/issuer',
            { name: issuerName }
        )
        if (response.status === 201) {
            console.log(
                '\nIssuer ' +
                    chalk.green(`${issuerName}`) +
                    ' created successfully!\n'
            )
        } else {
            console.log(
                chalk.red(
                    `Failed to create issuer ${issuerName}. Status: ${response.status}\n`
                )
            )
        }
    } catch (error) {
        console.error(
            chalk.red(`Failed to create issuer ${issuerName}, ${error}\n`)
        )
    }
}

// Calls the '/create/user' route to create a user from the
// userId and props (clains) arguments passed in from the CLI
export async function createUser(userId, props) {
    try {
        const response = await axios.post(
            'http://identity-issuer-identity-issuer-1:3000/create/user',
            { userId: userId, props: props }
        )
        if (response.status === 201) {
            console.log(
                '\nUser ' +
                    chalk.green(`${userId}`) +
                    ' created successfully!\n'
            )
        } else {
            console.log(
                chalk.red(
                    `Failed to create user ${userId}. Status: ${response.status}\n`
                )
            )
        }
    } catch (error) {
        console.error(chalk.red(`Failed to create user ${userId}, ${error}\n`))
    }
}

// Calls the '/get/current-issuer' route to get the current issuer to display
// it for UI purposes and to be called in the checkStatus function above
export async function getCurrentIssuer() {
    try {
        const response = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/get/current-issuer'
        )
        const issuerName = response.data.issuer.name
        console.log(chalk.magenta('Current issuer:'))
        console.log(chalk.green(issuerName) + '\n')
    } catch (error) {
        console.error(
            chalk.red(
                'No current issuer, you can set a current issuer with the `set issuer` command \n'
            )
        )
    }
}

// Calls the '/get/current-user' route to get the current user to display
// it for UI purposes and to be called in the checkStatus function above
export async function getCurrentUser() {
    try {
        const response = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/get/current-user'
        )
        const userId = response.data.userDID
        console.log(chalk.magenta('Current user:'))
        console.log(chalk.green(userId) + '\n')
    } catch (error) {
        console.error(
            chalk.red(
                'No current user, you can set a current user with the `set user` command \n'
            )
        )
    }
}

// Calls the '/set/current-issuer' route to switch between existing issuers to
// make them the active issuer
export async function setCurrentIssuer(issuerName) {
    try {
        const response = await axios.post(
            'http://identity-issuer-identity-issuer-1:3000/set/current-issuer',
            { issuerName: issuerName }
        )

        if (response.status === 200) {
            console.log(
                '\nIssuer ' +
                    chalk.green(`${issuerName}`) +
                    ' is now the current issuer!\n'
            )
        } else {
            console.log(
                chalk.red(
                    `Failed to set ${issuerName} as the current issuer. Status: ${response.status}\n`
                )
            )
        }
    } catch (error) {
        console.error(chalk.red('This issuer does not exist\n'))
    }
}

// Calls the '/set/current-user' route to switch between existing users to
// make them the active user
export async function setCurrentUser(userId) {
    try {
        const response = await axios.post(
            'http://identity-issuer-identity-issuer-1:3000/set/current-user',
            { userId: userId }
        )

        if (response.status === 200) {
            console.log(
                '\nUser ' +
                    chalk.green(`${userId}`) +
                    ' is now the current user!\n'
            )
        } else {
            console.log(
                chalk.red(
                    `Failed to set ${userId} as the current user. Status: ${response.status}\n`
                )
            )
        }
    } catch (error) {
        console.error(chalk.red('This user does not exist\n'))
    }
}

// Calls the '/create/credential-configuration' route to pass in the name and configuration
// arguments from the CLI to create the credential configuration.
// Also call the '/get/current-issuer' route to display the successful creation of the credential
// configuration and which issuer the configuration was created by
export async function createCredConfig(name, configuration) {
    try {
        const response = await axios.post(
            'http://identity-issuer-identity-issuer-1:3000/create/credential-configuration',
            { name: name, configuration: configuration }
        )
        const currentIssuer = await axios.get(
            'http://identity-issuer-identity-issuer-1:3000/get/current-issuer'
        )
        const issuerName = currentIssuer.data.issuer.name
        if (response.status === 201) {
            console.log(
                '\nCredential configuration ' +
                    chalk.green(`${name}`) +
                    ' for the current issuer ' +
                    chalk.green(`${issuerName}`) +
                    ' created successfully!\n'
            )
        } else {
            console.log(
                chalk.red(
                    `Failed to create credential configuration ${name}. Status: ${response.status}\n`
                )
            )
        }
    } catch (error) {
        console.error(
            chalk.red(
                `Failed to create credential configuration ${name}. Status: ${response.status}\n`
            )
        )
    }
}
