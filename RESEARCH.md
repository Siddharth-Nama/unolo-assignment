# Research Assignment: Real-Time Location Tracking

## Architectures for Real-Time Tracking

### 1. WebSockets (Socket.io)
**Mechanism:** Establishes a persistent, bidirectional TCP connection between client and server.
- **Pros:** Lowest latency, real-time bidirectional communication, widely supported.
- **Cons:** Requires sticky sessions on load balancers, higher server memory usage (maintaining connections).
- **Use Case:** Uber/Lyft live tracking, where sub-second updates are critical.

### 2. Server-Sent Events (SSE)
**Mechanism:** One-way HTTP connection where server pushes updates to client.
- **Pros:** Simpler than WebSockets, standard HTTP (works well with firewalls/proxies), automatic reconnection.
- **Cons:** Unidirectional only (Server -> Client). Client must use standard HTTP POST to send updates.
- **Use Case:** Dashboards displaying live locations of a fleet.

### 3. Long Polling
**Mechanism:** Client makes a request, server holds it open until data is available or timeout.
- **Pros:** Works on essentially any server setup, no special protocols.
- **Cons:** High overhead (header parsing for every "push"), latency can vary.
- **Use Case:** Legacy systems or environments blocking WebSockets.

### 4. MQTT (Message Queuing Telemetry Transport)
**Mechanism:** Lightweight publish/subscribe protocol running over TCP/IP.
- **Pros:** Extremely low bandwidth, ideal for IoT/Mobile devices with poor connectivity, battery efficient.
- **Cons:** Requires a dedicated MQTT broker (e.g., Mosquitto, HiveMQ).
- **Use Case:** Large scale field force tracking (10k+ agents) where battery and bandwidth are constraints.

## Recommended Approach for Unolo Field Tracker
**Recommendation: MQTT + WebSockets**
1.  **Mobile App (Field Agents):** Use **MQTT** to publish location coordinates. It handles intermittent networks well and saves battery.
2.  **Backend:** Subscribes to MQTT topics, processes location data, updates DB (Redis for latest, SQL for history).
3.  **Manager Dashboard:** Connects via **WebSockets** to receive live updates from the backend.

## Why this approach?
- **Scalability:** MQTT brokers scale effortlessly to thousands of publishers.
- **Efficiency:** Decouples the "Write" high-throughput traffic (agents) from the "Read" real-time traffic (managers).
- **Reliability:** MQTT QoS (Quality of Service) levels ensure location delivery even in spotty networks.
