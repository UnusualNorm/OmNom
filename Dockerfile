FROM node:20 as builder
WORKDIR /app
COPY . .

RUN yarn install --immutable
RUN yarn build


FROM node:20-alpine
WORKDIR /app

COPY package.json yarn.lock/ .yarnrc.yml ./

COPY .yarn ./.yarn
COPY prisma ./prisma

RUN apk add --no-cache make gcc g++ python3

RUN yarn workspaces focus --production
RUN yarn install --immutable

COPY --from=builder /app/dist ./dist
CMD [ "yarn", "run", "start:bot" ]
