FROM node:16-alpine3.11


# Create Directory for the Container
RUN mkdir -p /home/jupiter-arb/app
WORKDIR /home/jupiter-arb/app

# Only copy the package.json file to work directory
COPY package.json package-lock.json ./
# Install all Packages
RUN npm install --silent

# Copy all other source code to work directory
COPY index.mjs /home/jupiter-arb/app
COPY .env /home/jupiter-arb/app

# Start
CMD ["npm", "start"]
