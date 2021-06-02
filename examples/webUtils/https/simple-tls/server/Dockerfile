FROM node:12.22-alpine AS base

WORKDIR /opt/example

RUN apk --no-cache add \
    bash \
    g++ \
    ca-certificates \
    lz4-dev \
    musl-dev \
    cyrus-sasl-dev \
    openssl-dev \
    make \
    python


RUN apk add \
    --no-cache \
    --virtual \
    .build-deps \
    gcc \
    zlib-dev \
    libc-dev \
    bsd-compat-headers \
    py-setuptools bash

# library (essential files)
COPY package.json microservice-sdk-pkg/
COPY npm-shrinkwrap.json microservice-sdk-pkg/
COPY lib microservice-sdk-pkg/lib
COPY index.js microservice-sdk-pkg/

# example application
COPY examples/webUtils/https/simple-tls/server/package*.json ./
COPY examples/webUtils/https/simple-tls/server/index.js ./
COPY examples/webUtils/https/simple-tls/server/tls ./tls

RUN npm install --production

FROM node:12.22-alpine

WORKDIR /opt/example

RUN apk --no-cache add \
    libsasl \
    lz4-libs

COPY --from=base /opt/example .

CMD ["node", "index.js"]
