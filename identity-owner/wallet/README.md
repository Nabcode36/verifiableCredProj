# Wallet

## Installation Instructions

Our React Native App was built using the Expo SDK. To run the app on your phone you need to install the "Expo" App on iOS or Android. The Google Play store link is available [here](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=en_AU) and the app store link is available [here](https://apps.apple.com/us/app/expo-go/id982107779).

### Installation without Docker

Make sure yarn is installed on your computer

Install all the packages:

```bash
yarn install
```

To run the app do the following command

```bash
yarn start --go
```

Scan the QR code that appears and the app will open on the Expo app.

You need to be on the same network for this.

### Installation with Docker

There is a dockerised version of the wallet however it does not connect to any backends. This can be used to look at and test UI features.

It works by doing

```bash
docker-compose up
```

You then scan the provided QR code and open the app using Expo on your device. This also works even if you are not on the same network as your device.

## File Structure Navigation

### app

Has all our navigation, structure for use in expo router.

### zodTypes

Contains all of our zodType definitions.

### packages

```bash
packages
├───components
├───db
├───provider
└───screens
```

#### components

Contains the code for commonly used components throughout the app.

#### db

Contains database functions

#### provider

Contains tamagui provider functions

#### screens

Contains the screens used in our app.
