FROM node:13.6-alpine
WORKDIR /src

COPY *.json /src/

RUN npm install

COPY app.js /src/

CMD ["node", "app.js"]