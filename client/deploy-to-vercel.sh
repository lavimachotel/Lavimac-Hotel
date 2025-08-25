#!/bin/bash

# Deployment script for Hotel Management System to Vercel

echo "🚀 Preparing to deploy to Vercel..."

# Step 1: Make sure vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Step 2: Build the project
echo "📦 Building the project..."
npm run build

# Step 3: Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment process completed!"
echo "If the deployment was successful, your site should be live now."
echo "You can check your deployments at https://vercel.com/dashboard" 