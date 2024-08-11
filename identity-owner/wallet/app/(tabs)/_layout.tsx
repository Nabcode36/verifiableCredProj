import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AntDesign } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTheme } from 'tamagui'
import React from 'react'

export default function TabLayout() {
    const theme = useTheme()
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: theme.color.val }}>
            <Tabs.Screen
                name="credentials"
                options={{
                    title: 'Credentials',
                    tabBarIcon: ({ color }) => (
                        <AntDesign size={28} name="idcard" color={color} />
                    ),
                    unmountOnBlur: true,
                }}
            />
            <Tabs.Screen
                name="present"
                options={{
                    title: 'Present',
                    tabBarIcon: ({ color }) => (
                        <AntDesign size={28} name="scan1" color={color} />
                    ),
                    unmountOnBlur: true,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => (
                        <FontAwesome size={28} name="cog" color={color} />
                    ),
                }}
            />
        </Tabs>
    )
}
