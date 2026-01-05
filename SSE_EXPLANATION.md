# SSE, ReadableStream, and TextEncoder - Complete Explanation

## Visual Flow Diagram

```
┌─────────────┐                    ┌──────────────┐
│   Browser   │                    │   Server     │
│  (Client)   │                    │  (Next.js)   │
└──────┬──────┘                    └──────┬───────┘
       │                                   │
       │ 1. GET /api/jobs/abc123/progress │
       │──────────────────────────────────>│
       │                                   │
       │                                   │ 2. Create ReadableStream
       │                                   │    - TextEncoder ready
       │                                   │    - start() function runs
       │                                   │
       │ 3. HTTP 200 OK                    │
       │    Content-Type: text/event-stream│
       │<──────────────────────────────────│
       │    [Connection stays open]        │
       │                                   │
       │                                   │ 4. sendEvent({type: "connected"})
       │                                   │    - JSON.stringify() → string
       │                                   │    - Add "data: " prefix + "\n\n"
       │                                   │    - encoder.encode() → bytes
       │                                   │    - controller.enqueue() → send
       │                                   │
       │ 5. Receives:                      │
       │    data: {"type":"connected"}     │
       │<──────────────────────────────────│
       │                                   │
       │                                   │ 6. Poll job status every 500ms
       │                                   │    - Check BullMQ queues
       │                                   │    - Get job progress
       │                                   │
       │                                   │ 7. sendEvent({type: "progress", ...})
       │                                   │
       │ 8. Receives:                      │
       │    data: {"type":"progress",...}  │
       │<──────────────────────────────────│
       │                                   │
       │    [Updates UI with progress]     │
       │                                   │
       │                                   │ 9. Job completes
       │                                   │    sendEvent({type: "completed"})
       │                                   │    controller.close()
       │                                   │
       │ 10. Receives:                     │
       │     data: {"type":"completed"}    │
       │<──────────────────────────────────│
       │                                   │
       │ 11. Connection closes             │
       │     [EventSource.onmessage fires] │
       │                                   │
```

## Data Transformation Chain

```
JavaScript Object
    ↓
JSON.stringify()
    ↓
String: '{"type":"progress","percentage":45}'
    ↓
Template literal: `data: ${string}\n\n`
    ↓
String: 'data: {"type":"progress","percentage":45}\n\n'
    ↓
TextEncoder.encode()
    ↓
Uint8Array: [100, 97, 116, 97, 58, 32, 123, ...]
    ↓
controller.enqueue()
    ↓
Sent over HTTP as bytes
    ↓
Browser receives bytes
    ↓
Browser decodes to string
    ↓
EventSource parses "data: " prefix
    ↓
JSON.parse() on the rest
    ↓
JavaScript Object in event.data
```

## Why This Pattern?

### Alternative 1: Polling (❌ Inefficient)
```typescript
// Frontend would do this:
setInterval(async () => {
  const response = await fetch('/api/jobs/abc123/status');
  const data = await response.json();
  // Update UI
}, 500); // Every 500ms = 120 requests per minute!
```
**Problems:**
- Many HTTP requests
- Server load
- Delayed updates (only checks every 500ms)
- Wastes bandwidth

### Alternative 2: WebSockets (❌ Overkill)
```typescript
// Would need Socket.io or ws library
const socket = io();
socket.on('job-progress', (data) => { ... });
```
**Problems:**
- More complex setup
- Requires WebSocket server
- Bidirectional (we only need one-way)
- More overhead

### SSE Pattern (✅ Perfect for this)
```typescript
// Simple, built-in, efficient
const eventSource = new EventSource('/api/jobs/abc123/progress');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI
};
```
**Benefits:**
- One HTTP connection
- Server pushes updates when ready
- Built into browsers
- Automatic reconnection
- Simple API

## Key Concepts Summary

### ReadableStream
- **What**: A way to send data in chunks over time
- **Why**: Allows server to keep connection open and send data as it becomes available
- **How**: `controller.enqueue()` sends chunks, `controller.close()` ends stream

### TextEncoder
- **What**: Converts JavaScript strings to UTF-8 bytes
- **Why**: Streams work with bytes, not strings
- **How**: `encoder.encode("text")` → `Uint8Array`

### SSE Format
- **What**: Standard format for server-sent events
- **Why**: Browsers understand this format automatically
- **How**: `data: {json}\n\n` - "data: " prefix + double newline separator

### EventSource (Browser API)
- **What**: Browser API for receiving SSE
- **Why**: Handles connection, reconnection, and parsing automatically
- **How**: `new EventSource(url)` → `onmessage` fires for each event

