#!/bin/sh
set -e

# Wait for the PostgreSQL database to be ready
until pg_isready -h db -p 5432 -U postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

# Run migrations
npx prisma migrate deploy

# Start the application
exec "$@"