FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /build
COPY pom.xml .
# Cache-warming for Docker layer caching only — NOT a correctness gate. go-offline over-resolves
# optional transitive deps the app never uses (e.g. kafka-streams' native rocksdbjni), so a hiccup
# on one must not fail the build; `mvn package` below is authoritative and fails on any real missing dep.
RUN mvn dependency:go-offline -q || mvn dependency:go-offline -q || true
COPY src src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
