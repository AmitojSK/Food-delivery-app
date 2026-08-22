# Food Delivery App

Production-oriented food delivery platform built iteratively with independent Spring Boot services.

## Iteration 1

Implemented services:

- `services/discovery-server`
- `services/user-service`
- `services/restaurant-service`
- `services/food-catalogue-service`
- `services/order-service`

Each service is an independent Maven Spring Boot application. `discovery-server` provides Eureka service discovery. MySQL-backed services use Java 21, MVC layering, Spring Web, Spring Data JPA, Flyway migrations, validation, centralized exception handling, and Eureka client registration. `order-service` uses MongoDB with embedded order item documents.

## Local Infrastructure

Start MySQL databases:

```bash
docker compose up -d
```

The local database ports are:

- User service MySQL: `localhost:3307`
- Restaurant service MySQL: `localhost:3308`
- Food catalogue service MySQL: `localhost:3309`
- Order service MongoDB: `[::1]:27017`

The service defaults already point to these local ports. Override `USER_SERVICE_DB_URL` or `RESTAURANT_SERVICE_DB_URL` only if your database is somewhere else.

The order-service uses `[::1]` locally because another MongoDB process may already own `127.0.0.1:27017` on Windows. Docker Desktop publishes the MongoDB container on the IPv6 loopback listener in this setup.

## Run Services

Start Eureka first:

```bash
cd services/discovery-server
mvn spring-boot:run
```

User service:

```bash
cd services/user-service
mvn spring-boot:run
```

Restaurant service:

```bash
cd services/restaurant-service
mvn spring-boot:run
```

Food catalogue service:

```bash
cd services/food-catalogue-service
mvn spring-boot:run
```

Order service:

```bash
cd services/order-service
mvn spring-boot:run
```

API gateway (start after the discovery server and backend services):

```bash
cd services/api-gateway
mvn spring-boot:run
```

Service ports:

- Discovery server: `http://localhost:8761`
- API gateway: `http://localhost:8080`
- User service: `http://localhost:8081`
- Restaurant service: `http://localhost:8082`
- Food catalogue service: `http://localhost:8083`
- Order service: `http://localhost:8084`

After the services start, they should appear in the Eureka dashboard as:

- `USER-SERVICE`
- `RESTAURANT-SERVICE`
- `FOOD-CATALOGUE-SERVICE`
- `ORDER-SERVICE`

## API Examples

Register user:

```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Asha","lastName":"Rao","email":"asha@example.com","phoneNumber":"+91 9876543210","password":"safe-password"}'
```

Create restaurant:

```bash
curl -X POST http://localhost:8082/api/v1/restaurants \
  -H "Content-Type: application/json" \
  -d '{"name":"Spice Garden","cuisineType":"Indian","streetAddress":"12 MG Road","city":"Bengaluru","state":"Karnataka","postalCode":"560001","contactEmail":"hello@spicegarden.example","contactPhone":"+91 9876500000"}'
```

Create food item:

```bash
curl -X POST http://localhost:8083/api/v1/food-items \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":1,"name":"Paneer Butter Masala","description":"Creamy tomato gravy with paneer","category":"Main Course","price":240.00}'
```

Create order:

```bash
curl -X POST http://localhost:8084/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"restaurantId":1,"items":[{"foodItemId":1,"foodItemName":"Paneer Butter Masala","quantity":2,"unitPrice":240.00}]}'
```

## Suggested Iteration 2

Implemented:

- `order-service` with MongoDB
- `food-catalogue-service` with MySQL
- Cross-service IDs only, no shared database access

## Suggested Iteration 3

Implemented:

- `frontend/food-delivery-ui`
- Angular 21 standalone application
- Typed API client and models
- Consumer workflow for restaurant browsing, menu selection, cart, checkout, and order confirmation
- Admin workflow for users, restaurants, food catalogue, and order management
- Create forms for users, restaurants, food items, and orders
- Angular dev-server proxy for local service calls

Run the UI:

```bash
cd frontend/food-delivery-ui
npm.cmd start
```

Open:

```text
http://localhost:4200
```

The Angular app calls the gateway through these proxy paths:

- `/user-api` -> `http://localhost:8080` -> `USER-SERVICE`
- `/restaurant-api` -> `http://localhost:8080` -> `RESTAURANT-SERVICE`
- `/catalogue-api` -> `http://localhost:8080` -> `FOOD-CATALOGUE-SERVICE`
- `/order-api` -> `http://localhost:8080` -> `ORDER-SERVICE`

The UI uses its Angular proxy only to reach the gateway. The gateway discovers backend services through Eureka, validates protected JWT requests, and forwards them to the appropriate service.

## Iteration 4, Step 1: User authentication

`user-service` now exposes public authentication endpoints:

```bash
# Register a customer. Passwords must be 8-72 characters.
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Asha","lastName":"Rao","email":"asha@example.com","phoneNumber":"+91 9876543210","password":"safe-password"}'

# Sign in and receive a one-hour Bearer JWT.
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@example.com","password":"safe-password"}'
```

New registrations always receive the `CUSTOMER` role. Customer tokens can read and update only their own user record; an `ADMIN` token can list, create, and manage all user records. Set a unique Base64-encoded `JWT_SECRET` in deployed environments.

To promote a pre-registered account during local setup, start user-service once with `BOOTSTRAP_ADMIN_ENABLED=true`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD`. The bootstrap is disabled by default and will fail fast if its credentials are missing.

## Iteration 4, Step 2: Service authorization

All backend services now validate the JWT issued by `user-service`. Configure the same Base64-encoded `JWT_SECRET` for user-service, restaurant-service, food-catalogue-service, and order-service in every environment.

- Restaurant and food-item reads are public; their create and update operations require `ADMIN`.
- All order endpoints require authentication. Customers can create orders only for their own token user ID and can read only their own orders. `ADMIN` can read all orders, create orders for any user, and update order status.

## Iteration 4, Step 3: API gateway

`services/api-gateway` provides the single local backend entry point on port `8080`. It routes the existing `/user-api`, `/restaurant-api`, `/catalogue-api`, and `/order-api` prefixes using Eureka service discovery. It permits public registration, login, restaurant browsing, and food-item browsing; all other routes require a valid JWT before they are forwarded.
