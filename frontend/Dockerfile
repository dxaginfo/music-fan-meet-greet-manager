FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json before other files
# Utilize Docker cache to save re-installing dependencies if unchanged
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build app
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# Set the command to start the node server
CMD [ "serve", "-s", "build" ]

EXPOSE 3000