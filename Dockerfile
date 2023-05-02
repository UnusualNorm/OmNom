FROM node as builder

WORKDIR /app
COPY . .

RUN yarn install --immutable

RUN yarn build

FROM node

WORKDIR /app
COPY . .

RUN yarn workspaces focus --production
RUN yarn install --immutable

COPY --from=builder /app/dist ./dist
CMD [ "yarn", "run", "start:bot" ]
