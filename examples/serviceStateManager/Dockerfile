FROM node:12.18-alpine AS base

#If the Service State Manager (lightship) default port is changed, it is necessary to reflect that change here
ARG HEALTHCHECK_PORT=9000
ENV HEALTHCHECK_PORT_ENV=${HEALTHCHECK_PORT}

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


RUN apk add --no-cache --virtual .build-deps gcc zlib-dev libc-dev bsd-compat-headers py-setuptools bash

# library (essential files)
COPY package.json microservice-sdk-pkg/
COPY npm-shrinkwrap.json microservice-sdk-pkg/
COPY lib microservice-sdk-pkg/lib
COPY index.js microservice-sdk-pkg/

# example application
COPY examples/serviceStateManager/package*.json ./

RUN npm install

FROM node:12.18.4-alpine

WORKDIR /opt/example

RUN apk --no-cache add \
    libsasl \
    lz4-libs

COPY --from=base /opt/example .

CMD ["node", "app/index.js"]

HEALTHCHECK --start-period=2m --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:${HEALTHCHECK_PORT_ENV}/health || exit 1
