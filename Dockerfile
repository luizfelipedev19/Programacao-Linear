FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Não executa a aplicação como root dentro do contêiner.
USER node

CMD ["npm", "start"]
