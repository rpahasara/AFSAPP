# Dockerfile for React client application

# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# Expose port 80
EXPOSE 80

# Start the application
CMD ["serve", "-s", "dist", "-l", "80"] 