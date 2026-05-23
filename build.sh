#!/bin/bash

echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..
echo "Frontend build complete!"
