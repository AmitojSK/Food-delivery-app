Food Delivery App - Learnings So Far
====================================

Project context
---------------
This project is being built as a production-style, service-oriented Spring Boot application using Java 21 and Maven. Each service has its own package structure and its own pom.xml, which keeps service ownership, dependencies, build lifecycle, and future deployment boundaries separate.

Current services built so far:
- discovery-server
- user-service
- restaurant-service
- food-catalogue-service
- order-service


1. Why separate services?
-------------------------
The application is split into multiple services because each business capability can evolve independently.

Examples:
- user-service owns user data and user-related operations.
- restaurant-service owns restaurant data.
- food-catalogue-service owns menu or food item data.
- order-service owns order creation and order lifecycle.
- discovery-server helps services find each other dynamically.

This separation is useful in interviews because it shows understanding of bounded contexts. A bounded context means a service owns a specific business area and its data model instead of sharing one giant database schema across the whole system.


2. Why each service has its own pom.xml
---------------------------------------
Each service has its own Maven project because each service should be independently buildable, testable, and deployable.

Benefits:
- Services can have different dependencies.
- A change in one service does not require rebuilding every other service.
- Each service can eventually be packaged into its own Docker image.
- Teams can own different services independently.

This is closer to a production microservice setup than a single monolithic Spring Boot application.


3. MVC architecture in Spring Boot
----------------------------------
Each service follows the MVC/layered architecture pattern:

Controller layer:
- Receives HTTP requests.
- Performs request validation using DTOs.
- Delegates business work to the service layer.
- Returns HTTP responses.

Service layer:
- Contains business logic.
- Coordinates repository calls.
- Applies rules such as default order status, price calculations, or validation checks.

Repository layer:
- Talks to the database.
- Uses Spring Data JPA for MySQL-backed services.
- Uses Spring Data MongoDB for MongoDB-backed services.

Model/entity/document layer:
- Represents persisted data.
- MySQL services use JPA entities.
- MongoDB service uses Mongo documents.

DTO layer:
- Separates API request/response contracts from internal persistence models.
- Prevents exposing database entities directly to clients.

Mapper layer:
- Converts between entities/documents and DTOs.
- Keeps controllers and services cleaner.


4. Why DTOs are important
-------------------------
DTOs are used instead of directly accepting or returning entities.

Reasons:
- They protect the database model from being exposed directly.
- They allow request-specific validation.
- They make API contracts explicit.
- They avoid accidental updates to fields that should not be client-controlled, such as IDs, audit fields, or generated status values.

Interview answer:
"DTOs help decouple the external API contract from the internal persistence model. This makes the application easier to evolve and safer to expose."


5. Why MySQL for user, restaurant, and food catalogue services
--------------------------------------------------------------
MySQL is a relational database, which is useful when the data has a structured schema and clear relationships.

Good fits in this project:
- Users have structured fields like name, email, phone, and status.
- Restaurants have structured details like name, address, cuisine, and availability.
- Food catalogue items have structured fields like restaurantId, item name, price, category, and availability.

MySQL is also useful when strong consistency and transactional behavior matter.


6. Why MongoDB for order-service
--------------------------------
Orders can naturally be stored as documents because an order usually contains nested order items.

Example order structure:
- order id
- user id
- restaurant id
- order status
- total amount
- list of order items

MongoDB is a good fit here because an order can be fetched as one complete document with embedded items. This avoids joining multiple tables just to reconstruct one order.

Interview answer:
"I used MongoDB for orders because an order is naturally aggregate-oriented. The order and its order items are usually created, read, and updated together, so storing them as a document is a practical design."


7. Spring Data JPA vs Spring Data MongoDB
-----------------------------------------
Spring Data JPA:
- Used with relational databases like MySQL.
- Works with entities, tables, columns, and repositories.
- Supports JPA annotations such as @Entity, @Table, @Id, and @Column.

Spring Data MongoDB:
- Used with MongoDB.
- Works with documents and collections.
- Supports annotations such as @Document and @Id.

The repository pattern feels similar in both, but the underlying persistence model is different.


8. Flyway database migrations
-----------------------------
Flyway is used for MySQL services to version-control database schema changes.

Instead of relying on Hibernate to create or update tables automatically in production, Flyway runs explicit migration scripts such as:
- V1__create_users_table.sql
- V1__create_restaurants_table.sql
- V1__create_food_items_table.sql

Why this matters:
- Schema changes are repeatable.
- Database changes are tracked in source control.
- Every environment can be migrated consistently.
- It avoids surprises from automatic schema generation.

Production-grade setting:
spring.jpa.hibernate.ddl-auto=validate

This means Hibernate validates that the schema matches the entity model but does not create or modify tables automatically.


9. Why ddl-auto=validate is better for production
-------------------------------------------------
Hibernate has options like create, update, create-drop, and validate.

For production-grade applications, validate is safer because:
- It does not silently alter production tables.
- It catches mismatch between entities and database schema at startup.
- Schema changes are handled intentionally through Flyway migrations.

Interview answer:
"In production, I prefer Flyway for schema changes and ddl-auto=validate so the application fails fast if the schema and entity model are out of sync."


10. Eureka service discovery
----------------------------
Eureka Server is used as the service registry.

The discovery-server runs on port 8761. Other services register themselves with Eureka as Eureka clients.

Why this is useful:
- Services do not need hardcoded host and port details for every other service.
- New service instances can register dynamically.
- It prepares the application for scaling multiple instances of a service.

Important configuration:
- discovery-server does not register itself.
- client services register with defaultZone: http://localhost:8761/eureka/
- services use spring.application.name so Eureka can identify them.

Interview answer:
"Eureka gives us service discovery. Instead of hardcoding every service address, services register with Eureka and can discover each other by service name."


11. What must be started before each service
--------------------------------------------
Before starting MySQL-backed services:
- Start the matching MySQL container.
- Make sure the database, user, and password match the service application.yml.
- Run the discovery-server if Eureka registration is enabled.

Before starting order-service:
- Start MongoDB.
- Make sure the configured MongoDB port is not already being used by a different MongoDB instance.
- Make sure Mongo credentials match the Mongo instance the app is actually connecting to.
- Run discovery-server if Eureka registration is enabled.

Recommended local startup order:
1. Start Docker database containers.
2. Start discovery-server.
3. Start user-service.
4. Start restaurant-service.
5. Start food-catalogue-service.
6. Start order-service.


12. Docker Compose learnings
----------------------------
Docker Compose is being used to run supporting infrastructure like MySQL and MongoDB.

Important idea:
The container port and host port are different things.

Example:
ports:
  - "3307:3306"

This means:
- MySQL runs inside the container on port 3306.
- Your local machine accesses it on port 3307.

For MongoDB:
ports:
  - "27017:27017"

This means:
- MongoDB runs inside the container on port 27017.
- Your local machine accesses it on port 27017.

Important lesson from the order-service issue:
If another MongoDB instance is already running on localhost:27017, the order service may connect to the wrong MongoDB instance. This can cause authentication errors, missing databases, or unexpected 500 responses.


13. Application configuration with application.yml
--------------------------------------------------
Each service uses application.yml for configuration such as:
- server port
- application name
- datasource URL
- database username and password
- JPA settings
- Flyway settings
- Eureka client settings
- management actuator endpoints

Production-style YAML files use environment variable fallbacks.

Example:
${USER_SERVICE_DB_URL:jdbc:mysql://localhost:3307/user_service_db}

This means:
- Use USER_SERVICE_DB_URL if it exists.
- Otherwise use the local default value.

This makes the same service easier to run locally, in Docker, or in a cloud environment without changing code.


14. Why open-in-view=false
--------------------------
For JPA services, spring.jpa.open-in-view=false is used.

This prevents lazy database access from happening during response rendering after the service layer has already completed.

Why this is good:
- It makes database access more explicit.
- It avoids hidden queries from controllers or serialization.
- It encourages fetching required data inside the service layer.


15. Exception handling
----------------------
Services use centralized exception handling to return consistent error responses.

Benefits:
- Controllers stay clean.
- Clients receive predictable error JSON.
- Validation errors can be returned in a structured way.
- Unexpected errors do not expose internal stack traces.

Example response structure:
- timestamp
- status
- error
- message
- path
- fieldErrors

Production-grade note:
Internal stack traces should be logged on the server, not returned to the client.


16. Validation
--------------
Request DTOs use validation annotations to reject bad input early.

Common examples:
- @NotBlank
- @NotNull
- @Email
- @Positive
- @Size

Why this matters:
- Invalid requests fail before reaching business logic.
- Error responses become clearer.
- Service methods can assume basic request correctness.


17. API versioning
------------------
Endpoints use a versioned path like:
/api/v1/...

Why this helps:
- Future API versions can be introduced without breaking existing clients.
- It gives room for backward-compatible and breaking changes.


18. Service ports used so far
-----------------------------
discovery-server: 8761
user-service: 8081
restaurant-service: 8082
food-catalogue-service: 8083
order-service: 8084

Database ports:
user-service MySQL: localhost:3307
restaurant-service MySQL: localhost:3308
food-catalogue-service MySQL: localhost:3309
order-service MongoDB: localhost:27017


19. Common interview questions and strong answers
-------------------------------------------------
Question: Why did you use microservices instead of one monolith?
Answer: The services are separated by business capability. This allows independent development, testing, deployment, and scaling. It also keeps each service's data ownership clear.

Question: Why does each service have its own database?
Answer: In a microservice architecture, each service should own its own data. Sharing one database across services creates tight coupling and makes independent deployment harder.

Question: Why MySQL for some services and MongoDB for orders?
Answer: MySQL fits structured relational data like users, restaurants, and catalogue items. MongoDB fits orders because an order is an aggregate with embedded order items that are usually read and written together.

Question: What is Eureka used for?
Answer: Eureka is a service registry. Services register themselves with Eureka and can discover other services by service name instead of hardcoded URLs.

Question: Why use Flyway?
Answer: Flyway makes database schema changes version-controlled, repeatable, and environment-independent. It is safer than allowing Hibernate to auto-update production schemas.

Question: Why use DTOs?
Answer: DTOs separate API contracts from persistence models, improve validation, and prevent exposing internal entity structure directly to clients.

Question: What does ddl-auto=validate do?
Answer: It tells Hibernate to validate that the entity model matches the database schema at startup. It does not create or update tables.

Question: What caused the order-service 500 error?
Answer: The order service was trying to connect to MongoDB on localhost:27017, but another MongoDB instance was already running on that port. The service connected to the wrong MongoDB instance, which caused database connection or authentication failure.

Question: How would you debug a 500 error in Spring Boot?
Answer: First check the API response path and timestamp, then check service logs for the stack trace. Identify whether the failure is in validation, business logic, database connection, authentication, or serialization. In this case, the root cause was MongoDB connectivity/authentication.

Question: What is the difference between container port and host port?
Answer: The container port is the port used inside the Docker container. The host port is the port exposed on the local machine. A mapping like 3307:3306 means local port 3307 maps to container port 3306.

Question: Why should secrets not be hardcoded in production?
Answer: Secrets should come from environment variables, secret managers, or deployment configuration. Hardcoding secrets makes rotation harder and creates security risk.


20. Production-grade improvements still pending
-----------------------------------------------
The current project is production-style but not yet fully production-complete. Future improvements can include:
- Spring Security authentication and authorization.
- API gateway.
- Inter-service communication using Feign or WebClient.
- Centralized logging and tracing.
- Docker images for each application service.
- CI/CD pipeline.
- Testcontainers for integration tests.
- More complete business validations.
- Resilience patterns such as retries, timeouts, and circuit breakers.
- Centralized configuration server.
- Observability with metrics, logs, and traces.


21. Angular UI learnings
------------------------
The frontend was added as a separate Angular application under frontend/food-delivery-ui.

Important Angular choices:
- Standalone Angular application instead of NgModule-based structure.
- Typed TypeScript models for backend request and response DTOs.
- A dedicated API service to keep HTTP calls out of the component template.
- Reactive forms for user, restaurant, food item, and order creation.
- Angular signals for lightweight UI state such as loading, errors, selected panel, and loaded records.
- A dev-server proxy to avoid browser CORS issues during local development.

Why use a dev proxy?
The backend services run on different ports, such as 8081, 8082, 8083, and 8084. The Angular app runs on port 4200. Browsers apply same-origin rules, so directly calling each service from the browser can create CORS issues.

The proxy solves this locally:
- /user-api forwards to user-service.
- /restaurant-api forwards to restaurant-service.
- /catalogue-api forwards to food-catalogue-service.
- /order-api forwards to order-service.

This is a local development solution. In a later production-style setup, an API gateway can become the single backend entry point for the Angular app.

Interview answer:
"For the Angular UI, I used a typed API client and a dev proxy. The typed client keeps HTTP calls centralized and safer, while the proxy avoids CORS issues locally until we introduce a proper API gateway."


22. Key takeaway
----------------
So far, this project demonstrates:
- Java 21 Spring Boot service development.
- MVC/layered architecture.
- Maven multi-service structure.
- MySQL and MongoDB persistence.
- Flyway migrations.
- Eureka service discovery.
- Docker Compose infrastructure.
- Environment-based configuration.
- DTO-based API design.
- Centralized exception handling.
- Practical debugging of database connection issues.
- Angular frontend integration with service-specific backend APIs.

This gives a strong foundation for explaining both the implementation and the architectural decisions in an interview.
