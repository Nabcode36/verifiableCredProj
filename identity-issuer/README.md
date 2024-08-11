This is the folder for the Identity Issuer, this document exists for some documentation mainly for the installation guide.

## 1.2 Issuer Installation Instructions

This guide will walk you through the installation process for the credential issuer components, which consist of a backend server and a command line interface.

### 1.2.1 Issuer Installation

The backend server can be easily set up using Docker.

Prerequisites

-   Docker installed on your system.

Steps

1.  Open terminal (macOS/Linux) or command prompt (Windows).

2.  Navigate to the project directory:

```bash
cd identity-issuer
        ^
```

3.  Run the docker compose file to start the backend server:

```bash
docker-compose up
        ^
```

4.  In docker, go to the containers section and click on the identity-issuer-identity-issuer-1 container

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXd_tM7VeewRZoqEjPBJYZDf0IYwOw7Nhra3HK_FDDcEUQk_woutrXslz_VFtni64oG37jKbXovw25XjHBdY2R5hEGHgG_vEHnLtLuHKnI40VxG3TQlpM2ROXClAWELSXn6QQ4bZrdMApGucp_xdzOePdVD_?key=Vzhw4flVGo4zRCWIebp6sw)

5.  In the identity-issuer-identity-issuer-1 container, click on the exec section

![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXf593_a9B1NhO9uQq3o605-7e7j59IR1RdQs3_ErIexy4-aNmvRFqhunEBpnrgXZbUUsZsBpUdWTqVjov3RmteNzaZEwq7ML0VKXtOyVMSPBNx1Lo89N_5iN1ejxjUHcaawKfopDf8uFouRUEK-pMHOeQiI?key=Vzhw4flVGo4zRCWIebp6sw)

6.  Enter the command "node index.mjs" to run the command line interface. Type "help" for the list of available commands.![](https://lh7-rt.googleusercontent.com/docsz/AD_4nXfLqBHjoE3Eb2YaQr-BYq9gjlIUQH2Yr3aM-1nyhuVfwu3NTrrnAx5KkocmXuHPTzjU48csFVjJcspEZh1pNbnmiN7cfZvdpzD-J5apoE9DR2e_FN3C-v_M-0vp-2M6BDz27b0D_aMFzPA09UYq7g5Q65GZ?key=Vzhw4flVGo4zRCWIebp6sw)

\*Note The issuer command line interface provides functionality for the setup of issuing credentials. It's important that the CLI is used to create an issuer and a user upon initial use when there aren't any existing issuers and users.

7.  The CLI communicates with the backend server using the docker container name as the domain name. It communicates to the backend at http://identity-issuer-identity-issuer-1:3000.

### 1.2.2 QR Code Generation

Once the CLI has been used to set up for credential issuance, a QR code needs to be generated for the wallet to scan and receive the credential-offer from the issuer. This is generated using the site <https://www.qr-code-generator.com/> (Bitly, 2024) and entering the url http://ipAddress:3334/credential-offer, where:

-   `ipAddress` is the computer's local IPV4 Address (the ip of the network the device is connected to). In windows enter "ipconfig" and in macOS terminal "ipconfig getifaddr en0", or alternatively go to the network settings of your OS. Where to look in the output of these commands depends on what network adapter you are using (ethernet, WiFi, etc). The following link can be used to help <https://www.whatismybrowser.com/detect/what-is-my-local-ip-address/> (Harris, 2022)

-   `3334` is the external port to access the docker container's backend.

-   `/credential-offer` is the credential offer route defined in `src/routes.ts`.

Troubleshooting

-   If the mobile app cannot receive the credential offer upon qr code scan, ensure that both devices are on the same network. Also check that at least one issuer and one user exists using the CLI.

-   Double-check that you've entered the correct IPv4 address and port.

-   Make sure no firewalls are blocking the connection between the mobile app and the backend server.

For any further issues or questions, please contact the development team.
