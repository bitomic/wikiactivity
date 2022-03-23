# Base Stage
FROM node:17-alpine3.15 AS base

WORKDIR /home/node/app

ENV NODE_ENV="development"

RUN apk add -u --no-cache \
	dumb-init \
	fontconfig \
	jq \
	nodejs

COPY --chown=node:node yarn.lock .
COPY --chown=node:node package.json .
COPY --chown=node:node .yarnrc-docker.yml .yarnrc.yml
COPY --chown=node:node .yarn/ .yarn/

ENTRYPOINT [ "dumb-init", "--" ]

# Build Stage
FROM base AS builder

WORKDIR /home/node/app

ENV NODE_ENV="development"

COPY --chown=node:node tsconfig.json tsconfig.json
COPY --chown=node:node src/ src/

RUN yarn install --immutable
RUN yarn run build

# Runner Stage
FROM base AS runner

WORKDIR /home/node/app

ENV NODE_ENV="production"

COPY --chown=node:node --from=builder /home/node/app/dist dist

RUN yarn workspaces focus --all --production
RUN chown node:node /home/node/app

USER node

CMD [ "yarn", "run", "start" ]
