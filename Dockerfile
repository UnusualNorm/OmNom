FROM node:18 as builder
WORKDIR /app
COPY . .

RUN yarn install --immutable
RUN yarn build


FROM node:18
WORKDIR /app
COPY . .

RUN yarn workspaces focus --production
RUN yarn install --immutable

COPY --from=builder /app/dist ./dist
CMD [ "yarn", "run", "start:bot" ]
