import express from 'express'
import config from 'config'
import logger from './utils/logger'
import routes from './routes'

const port = config.get<number>('port')

const app = express()
app.use(express.json())

routes(app)

const server = app.listen(port, async () => {
    logger.info(`App is running at http://localhost:${port}`)
})

export { app, server }
