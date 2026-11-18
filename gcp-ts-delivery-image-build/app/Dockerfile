FROM node:26-alpine
WORKDIR /app
COPY index.ts .
# Run as the image's unprivileged node user, not root.
USER node
EXPOSE 8080
# Node 26 runs TypeScript directly by stripping the types.
CMD ["node", "index.ts"]
