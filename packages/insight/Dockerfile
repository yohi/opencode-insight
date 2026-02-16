# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.9 AS base
WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# build the app
ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install --chown=bun:bun /temp/prod/node_modules node_modules
COPY --from=prerelease --chown=bun:bun /app/dist/ dist/
COPY --from=prerelease --chown=bun:bun /app/src/ src/
COPY --from=prerelease --chown=bun:bun /app/package.json .
COPY --from=prerelease --chown=bun:bun /app/bun.lock .

# Ensure data directory exists and is writable
RUN mkdir -p /data && chown bun:bun /data

# run as non-root user
USER bun

# set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# expose ports
EXPOSE 3000 3001

# run the app (both frontend and backend)
# using a simple shell loop to wait for both processes
CMD ["/bin/sh", "-c", "bun run start:server & bun run start & wait"]
