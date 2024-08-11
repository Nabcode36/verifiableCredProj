FROM node:20-bookworm

WORKDIR /app

# Copy package.json and pnpm-lock.yaml to the container
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port that your app runs on
EXPOSE 3000

ENV DOCKER_CONTAINER=true

# Command to run the application
CMD ["pnpm", "run", "start"]