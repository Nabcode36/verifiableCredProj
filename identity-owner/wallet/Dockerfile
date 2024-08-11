# pull base image
FROM node:20.14.0-buster-slim

ENV YARN_VERSION 4.0.2

RUN yarn policies set-version $YARN_VERSION

# set our node environment, either development or production
# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

# default to port 19006 for node, and 19001 and 19002 (tests) for debug
ARG PORT=19006
ENV PORT $PORT
EXPOSE 19006 19001 19002
# add in your own IP that was assigned by EXPO for your local machine
ENV REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.101"

# install global packages
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH /home/node/.npm-global/bin:$PATH
RUN npm i --unsafe-perm -g npm@latest expo-cli@latest
RUN apt-get update && apt-get install -y qemu-user-static
#We need to install this inorder to start a tunnel on the docker conatiner
RUN npm i --unsafe-perm -g @expo/ngrok

# install dependencies first, in a different location for easier app bind mounting for local development
# due to default /opt permissions we have to create the dir with root and change perms
RUN mkdir /opt/my-app && chown root:root /opt/my-app
WORKDIR /opt/my-app
ENV PATH /opt/my-app/.bin:$PATH
USER root
# Copy package.json, yarn formatting, and tsconfig files to the container
COPY package.json yarn.lock ./
# Install dependencies
RUN yarn install

# copy in our source code last, as it changes the most
WORKDIR /opt/my-app

# for development, we bind mount volumes; comment out for production
COPY . /opt/my-app/

RUN yarn install

# Command to run the application -- docker defined in package.json
CMD ["yarn", "start", "--tunnel", "--go"]