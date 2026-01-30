# Research Assignment: Real-Time Location Tracking Architecture

**Author:** Siddharth Nama 
**Date:** January 30, 2026  
**Context:** Scaling Field Force Tracker to 10,000+ concurrent users with 30-second update intervals.

---

## 1. Executive Summary

For the specific use case of tracking 10,000+ field employees with a focus on **battery efficiency** and **network reliability**, I recommend adopting an **MQTT (Message Queuing Telemetry Transport)** architecture.

While WebSockets are the standard for "web" real-time and SSE is excellent for "server-to-client" flow, **MQTT** is the industry standard for IoT and mobile telemetry. It specifically addresses the "shaky network" and "battery drain" constraints of field operations better than any HTTP-based protocol.

---

## 2. Technology Comparison

We analyzed three primary candidates for the telemetry transport layer.

### A. WebSockets (Socket.io / ws)
A persistent, bidirectional, full-duplex TCP connection.
-   **How it works:** Handshake upgrades HTTP to raw TCP. Server and client exchange frames anytime.
-   **Pros:** Low latency; ubiquitous support; bidirectional (manager can "ping" employee).
-   **Cons:** "Chatty" protocol (keeps radio active); heavy on server memory (holding 10k TCP connections requires significant RAM/file descriptors); no built-in Quality of Service (QoS) for message delivery guarantees.
-   **Verdict:** Great for the *Dashboard*, but suboptimal for the *Mobile* device battery.

### B. Server-Sent Events (SSE)
A standard HTTP connection where the server pushes updates to the client.
-   **How it works:** Client opens a connection; server keeps it open and streams text data.
-   **Pros:** Native browser support; simpler than WebSockets; traverses firewalls easily.
-   **Cons:** **Unidirectional (Server → Client).** Mobile devices cannot *send* location via SSE. They would need to use standard HTTP POST requests every 30s.
-   **Verdict:** Opening a TCP connection every 30s for a POST request (3-way handshake + SSL handshake) is the worst-case scenario for battery life and data usage.

### C. MQTT (The Chosen Solution)
A lightweight publish/subscribe protocol running over TCP/IP, designed specifically for constrained devices.
-   **How it works:** Devices "Publish" tiny binary messages to a Broker. The Backend "Subscribes" to these messages.
-   **Pros:** 
    -   **Binary Protocol:** Minimal header overhead (2 bytes vs ~800 bytes for HTTP).
    -   **Battery Friendly:** Optimized to keep the radio in low-power modes.
    -   **QoS (Quality of Service):** Built-in queuing. If an agent enters an elevator (network loss), MQTT queues the packet and sends it when the network returns.
-   **Cons:** Requires a dedicated Broker (e.g., Mosquitto, RABBITMQ, EMQX); harder to debug (binary) than JSON.

---

## 3. Recommendation: The "Decoupled Ingestion" Architecture

I recommend a **Hybrid MQTT + WebSocket Architecture**.

1.  **Ingestion Layer (Mobile → Cloud):** Use **MQTT**.
    -   **Why:** Field agents often work in areas with 2G/3G coverage. MQTT's binary packet size is negligible, and its keep-alive mechanism represents the absolute minimum battery drain possible for continuous tracking.
2.  **Presentation Layer (Cloud → Dashboard):** Use **WebSockets/SSE**.
    -   **Why:** Managers sit in offices with stable WiFi. They need rich data. WebSockets are easier for React/Web frontends to consume.

### Viability Analysis (The "Startup" Constraints)
-   **Scale (10k Users):** A single modest MQTT broker (e.g., VerneMQ or EMQX) can handle 10k concurrent connections on a \$20/mo VPS. HTTP servers would require a load balancer and multiple nodes for the same throughput.
-   **Cost:** Extremely low bandwidth usage reduces AWS Data Transfer costs significantly compared to polling or repeated HTTP headers.
-   **Development Time:** Libraries like `MQTT.js` (Node) and `CocoaMQTT` (iOS) are mature. Setup is more complex than a simple REST API but pays off in maintenance.

---

## 4. Trade-off Analysis

Every architectural decision comes with sacrifices. By choosing MQTT, we accept the following trade-offs:

| Trade-off | Description | Mitigation |
| :--- | :--- | :--- |
| **Operational Complexity** | We must manage a new piece of infrastructure (The Broker). Unlike a stateless HTTP API, the Broker has state (connections). | Use a managed service (e.g., HiveMQ Cloud) initially to avoid Ops overhead, or deploy a containerized Broker on ECS. |
| **Lack of Request/Response** | MQTT is fire-and-forget. The mobile app won't immediately know if the server "processed" the location, only that the Broker "received" it. | For location tracking, eventual consistency is acceptable. Absolute acknowledgement for every point prevents scalability. |
| **Security Complexity** | Securing MQTT (TLS + Auth) is different from standard JWT Authorization headers used in our REST API. | Most Brokers support JWT authentication plugins, allowing us to reuse our existing Auth service. |

**Breakdown Point:**
This architecture holds comfortably up to ~500k connected devices. Beyond that, the Broker becomes a bottleneck and requires clustering/sharding, which introduces significant devops complexity.

---

## 5. High-Level Implementation Plan

### Step 1: Infrastructure
-   Deploy **Mosquitto** or **EMQX** (Open Source) on a separate Docker container.
-   Configure port `8883` (Secure MQTT).

### Step 2: Backend (Ingestion Service)
Create a specialized Node.js worker that connects to the Broker using `mqtt.js`.
```javascript
const client = mqtt.connect('mqtts://broker.unolo.com');
client.subscribe('loc/+'); 

client.on('message', async (topic, message) => {
    const userId = topic.split('/')[1];
    const { lat, lng, batt } = JSON.parse(message);
    await redis.geoadd('fleet_locations', lng, lat, userId);
    await requestQueue.add({ userId, lat, lng, time: Date.now() });
});
```

### Step 3: Mobile (Client)
-   Integrate an MQTT client library.
-   On login, connect to Broker with JWT.
-   Topic structure: `loc/{user_id}`.
-   Publish QoS 1 (At least once) to ensure data isn't lost in tunnels/basements.

### Step 4: Frontend (Manager Dashboard)
-   The React Dashboard connects to the **Backend API** via **WebSockets** (Socket.io).
-   It does *not* connect to MQTT directly (security risk to expose broker publically with wildcard subs).
-   Backend forwards filtered updates from Redis to the specific Manager's socket room.

---

## Conclusion
For Unolo, "Good Enough" is HTTP Polling, but "Scalable and Efficient" is MQTT. Given the battery constraints of a field force, **MQTT is the responsible engineering choice**. It requires slightly more initial setup but ensures the product is viable as the user base grows to 10,000 users and beyond.
