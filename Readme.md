# Resilient Simplified Stock Market Service

A high-availability, simplified stock market simulation service built with **TypeScript**, **Fastify**, and **Redis**. Designed to handle concurrent operations while maintaining system stability even during instance failures.

## Overview

This service simulates a basic stock exchange where users can manage wallets and trade stocks. The system is designed with a **Stateless Architecture**, ensuring that no data is lost if a specific application instance is terminated.

### Key Features:
- **High Availability (HA):** Powered by an Nginx Load Balancer and multiple application replicas.
- **Stateless Design:** All state is persisted in a shared Redis instance.
- **Atomic Operations:** Buying/Selling is handled using Redis transactions to prevent race conditions.
- **Chaos Ready:** Includes a `/chaos` endpoint to simulate instance failure and test system resilience.
- **Audit Logging:** Tracks all successful wallet transactions.

---

## Architecture

The solution uses a microservices-based approach orchestrated by Docker:

1.  **Gateway (Nginx):** Acts as a Load Balancer, distributing incoming traffic across multiple app instances.
2.  **Application (Node.js/Fastify):** Processes business logic. Three replicas are running by default.
3.  **Storage (Redis):** Serves as the high-performance, shared "Source of Truth" for all wallets, bank stocks, and audit logs.

---

## Prerequisites

-   **Docker** and **Docker Compose** installed.
-   No other runtimes (Node.js, Go, etc.) are required on your local machine as everything is containerized.

---

## How to Run

You can start the entire stack with a single command. Replace `XXXX` with your desired port (e.g., `4000`).

**On Windows (PowerShell):**
```powershell
$env:PORT_PARAM=4000; docker compose up --build
```
**On Linux / macOS:**

```bash
PORT_PARAM=4000 docker compose up --build
```

The service will be available at ``http://localhost:4000``

## API Reference
### Bank Operations:
- ```GET /stocks``` - Returns the current state of the bank.

- ```POST /stocks``` - Sets the state of the bank (initializes stock quantities).

### Wallet Operations:
- ```GET /wallets/{wallet_id}``` - Returns current stocks in a specific wallet.

- ```GET /wallets/{wallet_id}/stocks/{stock_name}``` - Returns the quantity of a specific stock.

- ```POST /wallets/{wallet_id}/stocks/{stock_name}``` - Executes a "buy" or "sell" operation. Creates the wallet if it doesn't exist.

### System Operations:
- ```GET /log``` - Returns the audit log of all successful wallet operations (max 10,000 entries).

- ```POST /chaos``` - Terminates the specific instance that received the request to test High Availability.

## Testing the Resilience (Chaos Test)
To verify that the system remains highly available even when an instance is killed:

1. **Initialize the Bank:**

```bash
curl -X POST http://localhost:4000/stocks -H "Content-Type: application/json" -d '{"stocks": [{"name":"BTC", "quantity":10}]}'
```
2. **Perform a Purchase:**
```bash
curl -X POST http://localhost:4000/wallets/user1/stocks/BTC -H "Content-Type: application/json" -d '{"type": "buy"}'
```

3.  **Trigger Chaos:**
    ```bash
    curl -X POST http://localhost:4000/chaos
    ```
    *Note: One container will exit. You can see this in your docker logs.*

4.  **Verify System Status:**
    Immediatey call `GET /wallets/user1`. The request will be handled by another healthy instance, and your data will remain intact.

---

## Tech Stack

-   **Language:** TypeScript
-   **Framework:** Fastify (Chosen for high performance and low overhead)
-   **Database:** Redis (Shared state for HA)
-   **Infrastructure:** Docker Compose & Nginx