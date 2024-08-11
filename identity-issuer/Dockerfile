FROM node:20-bookworm

WORKDIR /app

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client && apt-get install dos2unix

# Copy package.json and pnpm-lock.yaml to the container
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install 

# Copy the rest of the application code to the container
COPY . .

# Run prisma generate after copying the application code
RUN npx prisma generate

# Copy the entrypoint script
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

RUN sed -i 's/\r$//' ./entrypoint.sh

# Expose the port that your app runs on
EXPOSE 3000

# Command to run the application
CMD ["pnpm", "run", "dev"]