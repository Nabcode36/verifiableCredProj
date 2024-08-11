// Use of logger and dayjs packages to displays server status messages
// in a more stylised fashion

import logger from 'pino'
import dayjs from 'dayjs'

const log = logger({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
    base: {
        pid: false,
    },
    timestamp: () => `,"time":"${dayjs().format()}"`,
})

export default log
