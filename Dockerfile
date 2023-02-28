FROM node as builder

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM node:slim

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

COPY --from=builder /usr/src/app/dist ./dist
CMD [ "yarn", "run", "start:bot" ]
