FROM node:lts-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      dumb-init

RUN mkdir /home/node/.cache /home/node/.config

VOLUME /home/node/.cache
VOLUME /home/node/.config

ARG PNPM_VERSION=8.2.0

RUN mkdir -p /usr/local/bin && \
    curl -Lo /usr/local/bin/pnpm https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-x64 && \
    chmod 755 /usr/local/bin/pnpm

#RUN pnpm env use --global lts

ENTRYPOINT ["/usr/bin/dumb-init"]

CMD ["/bin/bash"]


FROM base AS webpack

COPY docker/webpack.sh /usr/local/bin/run.sh
RUN chown root:root /usr/local/bin/run.sh && \
    chmod 755 /usr/local/bin/run.sh

USER node

WORKDIR /home/node/app

# ui, hosting, functions, firestore, pubsub, auth
EXPOSE 4000 5000 5001 8080 8085 9099


FROM base AS firebase

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      openjdk-11-jre-headless

RUN pnpm install -g firebase-tools@latest

COPY docker/firebase.sh /usr/local/bin/run.sh
RUN chown root:root /usr/local/bin/run.sh && \
    chmod 755 /usr/local/bin/run.sh

USER node

WORKDIR /home/node/app

# ui, hosting, functions, firestore, pubsub, auth
EXPOSE 4000 5000 5001 8080 8085 9099
