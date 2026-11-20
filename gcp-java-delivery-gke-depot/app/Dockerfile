FROM --platform=$BUILDPLATFORM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /src
COPY App.java .
RUN javac -d /app App.java

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app .
# Alpine's nobody user, by ID so Kubernetes can tell it is not root.
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["java", "-cp", "/app", "App"]
