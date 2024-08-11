import express from 'express'
import config from 'config'
import path from 'path'
import routes from './routes'
import { TransactionController } from './services/TransactionController'
import { StorageController } from './services/StorageController'
import { PresentationDefinitionController } from './services/PresentationDefinitionController'
import { errorHandler } from './services/ErrorService'
import { AuthController } from './services/AuthController'
import { Server as SocketIOServer } from 'socket.io'
import http from 'http'

const port = config.get<number>('port')
const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server)

app.use(express.json())
app.use(errorHandler)
app.use(express.static('public'))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

server.listen(port, '0.0.0.0', async () => {
    console.log(`App is running at http://localhost:${port}`)

    let storageController = new StorageController()
    await storageController.initialise()
    let authController = new AuthController(storageController)
    let presentationDefinition = new PresentationDefinitionController(
        storageController
    )
    let openid4vp = new TransactionController(
        storageController,
        presentationDefinition
    )

    routes(
        app,
        io,
        openid4vp,
        presentationDefinition,
        storageController,
        authController
    )

    io.on('connection', (socket) => {
        console.log('A client connected')

        socket.on('disconnect', () => {
            console.log('A client disconnected')
        })
    })
})
