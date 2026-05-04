#!/bin/bash
echo "==> Pulling latest from GitHub..."
git pull origin master

echo "==> Cleaning old build..."
rm -rf .next

echo "==> Installing dependencies..."
npm install

echo "==> Building..."
npm run build

echo "==> Done! Restart the Node.js app in hPanel."
echo "==> Ensure 'Application Startup File' in Hostinger is set to 'server.js'"
