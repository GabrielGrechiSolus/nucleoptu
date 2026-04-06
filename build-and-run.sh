#!/bin/bash

# Build Docker image
echo "Building Docker image..."
docker build -t nucleoptu .

# Run the container
echo "Running container..."
docker run -p 3000:3000 nucleoptu