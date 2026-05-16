#!/bin/sh
echo "Waiting for database..."
until node -e "require('pg').Pool({connectionString:'$DATABASE_URL'}).query('SELECT 1')" 2>/dev/null; do
  sleep 1
done
echo "Database ready!"
node dist/server.js