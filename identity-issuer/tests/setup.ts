// This is a setup run for each test to ensure the database
// is cleared everytime before and after each test to prevent
// the overpopulation and mixing of data entries between tests

import { PrismaClient } from '@prisma/client'
import { deleteAll } from '../src/utils/connect'
import { server } from '../src/app'

const prisma = new PrismaClient()

beforeEach(async () => {
    await deleteAll()
    server.close()
})

afterAll(async () => {
    await prisma.$disconnect()
})
