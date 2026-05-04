#!/bin/bash
echo "==> Pulling latest from GitHub..."
git pull origin master

echo "==> Installing dependencies..."
npm install --production=false

echo "==> Building..."
npm run build

echo "==> Done! Restart the Node.js app in hPanel."
