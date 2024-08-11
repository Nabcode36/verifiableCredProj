import { LockScreen } from 'screens/lockscreen'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { deleteAll, initializeDatabase } from 'packages/db/dbConnect'
import { LogBox } from 'react-native'
import React from 'react'

export default function Screen() {
    useEffect(() => {
        deleteAll()
        initializeDatabase()
    }, [])

    LogBox.ignoreLogs(['Warning: ...']) // Ignore log notification by message
    LogBox.ignoreAllLogs() //Ignore all log notifications

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Home',
                    headerShown: false,
                }}
            />
            <LockScreen />
        </>
    )
}
