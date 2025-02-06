# Use Node.js slim image
FROM node:slim

# Create app directory
WORKDIR /app

# Commented out below because we are mounting the whole project directory to the container using a volume
# Copy package files
#COPY package*.json ./
# Install dependencies
#RUN npm install
# Copy project files
#COPY . .

# Expose the port the app runs on
EXPOSE 3005

# Start the application
CMD ["npm", "run", "dev"]