FROM gradle:5.6-jdk11 as build
WORKDIR /app
COPY ./src ./src
COPY build.gradle .
RUN gradle build

FROM openjdk:8-jdk-alpine
VOLUME /tmp
COPY --from=build /app/build/libs/gs-rest-service-0.1.0.jar /app.jar
ENTRYPOINT ["java","-Djava.security.egd=file:/dev/./urandom","-jar","/app.jar"]
