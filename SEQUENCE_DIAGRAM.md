# End-to-End Sequence Diagram

This file documents the main end-to-end workflows for the Food Delivery App using a Mermaid sequence diagram.

## Participants
- Browser / Angular UI
- Angular Dev Server Proxy
- Discovery Server / Eureka
- User Service
- Restaurant Service
- Food Catalogue Service
- Order Service
- MySQL Databases
- MongoDB

## Sequence flows

```mermaid
sequenceDiagram
    participant Browser as Browser / Angular UI
    participant Proxy as Angular Proxy
    participant Eureka as Eureka Discovery
    participant UserSvc as User Service
    participant RestSvc as Restaurant Service
    participant CatSvc as Food Catalogue Service
    participant OrderSvc as Order Service
    participant MySQL as MySQL Databases
    participant MongoDB as MongoDB

    Note over Eureka, OrderSvc: Service startup and discovery
    Eureka->>Eureka: Start Eureka server on port 8761
    UserSvc->>Eureka: register USER-SERVICE
    RestSvc->>Eureka: register RESTAURANT-SERVICE
    CatSvc->>Eureka: register FOOD-CATALOGUE-SERVICE
    OrderSvc->>Eureka: register ORDER-SERVICE

    Note over Browser, Proxy: User/admin flows through Angular proxy
    Browser->>Proxy: POST /user-api/api/v1/users
    Proxy->>UserSvc: POST /api/v1/users
    UserSvc->>MySQL: INSERT new user
    MySQL-->>UserSvc: user saved
    UserSvc-->>Proxy: 201 Created + user data
    Proxy-->>Browser: 201 Created

    Browser->>Proxy: POST /restaurant-api/api/v1/restaurants
    Proxy->>RestSvc: POST /api/v1/restaurants
    RestSvc->>MySQL: INSERT new restaurant
    MySQL-->>RestSvc: restaurant saved
    RestSvc-->>Proxy: 201 Created + restaurant data
    Proxy-->>Browser: 201 Created

    Browser->>Proxy: POST /catalogue-api/api/v1/food-items
    Proxy->>CatSvc: POST /api/v1/food-items
    CatSvc->>MySQL: INSERT new food item
    MySQL-->>CatSvc: food item saved
    CatSvc-->>Proxy: 201 Created + food item data
    Proxy-->>Browser: 201 Created

    Browser->>Proxy: GET /catalogue-api/api/v1/food-items?restaurantId=1
    Proxy->>CatSvc: GET /api/v1/food-items?restaurantId=1
    CatSvc->>MySQL: SELECT food items for restaurant
    MySQL-->>CatSvc: return food item list
    CatSvc-->>Proxy: 200 OK + menu data
    Proxy-->>Browser: 200 OK + menu data

    Browser->>Proxy: POST /order-api/api/v1/orders
    Proxy->>OrderSvc: POST /api/v1/orders
    OrderSvc->>MongoDB: insert new order document
    MongoDB-->>OrderSvc: order saved
    OrderSvc-->>Proxy: 201 Created + order response
    Proxy-->>Browser: 201 Created

    Browser->>Proxy: GET /order-api/api/v1/orders?userId=1
    Proxy->>OrderSvc: GET /api/v1/orders?userId=1
    OrderSvc->>MongoDB: find orders by userId
    MongoDB-->>OrderSvc: return order list
    OrderSvc-->>Proxy: 200 OK + orders
    Proxy-->>Browser: 200 OK + orders

    Browser->>Proxy: PATCH /order-api/api/v1/orders/{id}/status
    Proxy->>OrderSvc: PATCH /api/v1/orders/{id}/status
    OrderSvc->>MongoDB: update order status
    MongoDB-->>OrderSvc: status updated
    OrderSvc-->>Proxy: 200 OK + updated order
    Proxy-->>Browser: 200 OK
```

## Notes
- The Angular UI uses `proxy.conf.json` to forward `/user-api`, `/restaurant-api`, `/catalogue-api`, and `/order-api` to the respective backend services.
- The backend services register with Eureka for dynamic discovery, but the current UI uses fixed proxy routes instead of direct service discovery.
- MySQL stores user, restaurant, and food catalogue data.
- MongoDB stores order documents for the order-service.
