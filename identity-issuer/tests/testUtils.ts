// This file is for initialising the server and then running the tests
// and then stopping the server once all tests have been finished
// Timeouts have been set to account for any delays related to
// starting and stopping the server to prevent server timeout fails

import { Server } from 'http'
import { app } from '../src/app'

let server: Server

export const startServer = (): Promise<Server> => {
    return new Promise((resolve, reject) => {
        server = app.listen(3000, (err?: Error) => {
            if (err) return reject(err)
            resolve(server)
        })
    })
}

export const stopServer = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!server) return resolve()
        server.close((err?: Error) => {
            if (err) return reject(err)
            resolve()
        })
    })
}
