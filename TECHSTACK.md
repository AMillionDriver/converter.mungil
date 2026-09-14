# Flowy Converter — Tech Stack

> Client-side-first file conversion, metadata cleaning, and file utility platform.

## 🧭 Architecture Philosophy

Flowy Converter is designed around a **client-side-first architecture**.

Most supported file operations should be performed directly inside the user's browser whenever technically feasible.

The backend exists as a supporting service, not as the default file-processing engine.

```text
                         ┌──────────────────────┐
                         │      Web Browser     │
                         │                      │
                         │ React                │
                         │ Tailwind CSS         │
                         │ File Processing      │
                         │ Metadata / EXIF      │
                         │ WASM Modules         │
                         └──────────┬───────────┘
                                    │
                         Lightweight API Gateway
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
        Authentication        Usage / Entitlement    Monetization
          Google OAuth         Premium limits          Ads / Reward
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                              Minimal Backend
```

## 🖥️ Frontend

### React

React is the primary UI framework.

Responsibilities:

* Application UI
* File selection and drag-and-drop
* Batch processing interface
* Tool configuration
* Progress indicators
* Result management
* Account and subscription UI
* Client-side processing orchestration

React should remain focused on UI and application state rather than implementing format-specific processing logic directly inside components.

### TypeScript

TypeScript is used across the frontend application.

Goals:

* Type-safe file processing APIs
* Safer state management
* Easier maintenance
* Better IDE support
* Clear contracts between processing modules

### Tailwind CSS

Tailwind CSS is used for:

* UI styling
* Responsive layouts
* Utility-based component styling
* Consistent design tokens

The interface should prioritize a clean and lightweight experience on both desktop and mobile browsers.

---

# ⚙️ Client-Side Processing

Client-side processing is the core of Flowy Converter.

The browser should process files locally whenever the requested operation can reasonably run without a server.

```text
User File
   ↓
Browser Memory / File API
   ↓
Processing Engine
   ↓
Processed Blob
   ↓
Download
```

The application should avoid transmitting file contents to the backend for operations that can be completed locally.

## Web APIs

The browser platform is used as much as possible before introducing external infrastructure.

Relevant APIs may include:

* File API
* Blob
* ArrayBuffer
* Streams API
* Web Workers
* IndexedDB
* Cache Storage
* File System Access API where supported

## Web Workers

CPU-intensive processing should be moved into Web Workers when practical.

This prevents large conversions from blocking the main UI thread.

```text
Main Thread
 ├── UI
 ├── User Interaction
 └── Progress

Worker
 └── File Processing
```

This is especially important for:

* Large images
* PDF processing
* Compression
* Media processing
* Batch operations

---

# 🦀 WebAssembly

WebAssembly should be used for processing engines that benefit from native-performance implementations or existing native libraries.

Potential use cases:

* Image codecs
* PDF processing
* Metadata manipulation
* Compression
* Short-video processing
* FFmpeg-based operations
* Other computationally expensive format conversions

Rust is a candidate for building custom WebAssembly processing modules.

Example architecture:

```text
React / TypeScript
        ↓
Processing Adapter
        ↓
Web Worker
        ↓
WebAssembly Module
        ↓
Blob / File
```

Rust should not be introduced everywhere.

It should primarily be used where it provides a meaningful advantage.

---

# 🧰 Processing Libraries

The exact library may vary by file format.

Potential categories include:

## Images

Possible technologies:

* Browser-native image APIs
* Canvas
* WebCodecs where supported
* WASM-based image libraries

Use cases:

* JPG
* PNG
* WEBP
* AVIF
* Image resizing
* Compression
* Metadata / EXIF processing

## PDF

Possible technologies:

* PDF.js for reading/rendering
* PDF-lib for PDF manipulation
* WASM modules when required

Use cases:

* Merge
* Split
* Rotate
* Extract pages
* Metadata operations

## Video

Short and lightweight video operations may use:

* WebCodecs
* FFmpeg WebAssembly
* Web Workers

Video processing is expected to have significantly higher CPU and memory requirements than ordinary image processing.

Large video files may therefore require stricter limits or different processing strategies.

---

# 🗂️ Client Storage

## IndexedDB

IndexedDB should be preferred for larger client-side state and cached application data.

Potential uses:

* Local processing state
* Cached resources
* Temporary application data
* Tool configuration
* Offline-compatible data

## Cache Storage / Service Worker

Service workers and Cache Storage may be used to cache versioned frontend assets and processing resources.

This allows Flowy Converter to avoid repeatedly downloading unchanged application resources.

```text
First Visit
    ↓
Download Assets
    ↓
Cache Storage
    ↓
Subsequent Visits
    ↓
Reuse Cached Assets
```

Application assets should be versioned so updates can safely invalidate older cached resources.

## localStorage

`localStorage` should only be used for small non-sensitive values.

Examples:

* UI preferences
* Feature flags
* Last-used settings
* Lightweight configuration

Sensitive information and large application payloads should not be stored in localStorage.

---

# 🛡️ Backend

The backend is intentionally minimal.

It should provide application services that genuinely require server-side state or trusted execution.

## Recommended Backend Runtime

### Node.js

Node.js is the primary backend runtime for the initial architecture.

Reasons:

* Same ecosystem as the frontend
* Strong TypeScript support
* Simple deployment
* Large package ecosystem
* Suitable for API gateways and application services
* Good fit for an initially small service

### Fastify

Fastify is the preferred HTTP framework.

Responsibilities may include:

* Authentication callbacks
* User/account management
* Usage tracking
* Premium entitlement checks
* Turnstile verification
* Rate limiting
* Configuration endpoints
* Subscription webhooks
* Rewarded-ad token accounting
* Application API endpoints

Fastify is preferred over Express for the initial architecture because the project is intended to remain lightweight and performance-conscious.

Express remains a valid alternative if existing project requirements make it more practical.

---

# 🗄️ Data Layer

A relational database may be introduced for server-side application state.

Potential choice:

### PostgreSQL

Possible data:

* User identity
* OAuth account mapping
* Subscription state
* Usage counters
* Rewarded token balances
* Server-side configuration
* Audit events
* Entitlements

User file contents should not be stored unless a future feature explicitly requires server-side processing or storage.

---

# 🔐 Authentication

Authentication is based around Google OAuth.

```text
User
 ↓
Google OAuth
 ↓
Backend
 ↓
Session / Token
 ↓
Web Application
```

Authentication is primarily required for:

* Premium plans
* Usage tracking
* Subscription management
* Account preferences
* Entitlement verification

The processing pipeline itself should remain client-side whenever the selected operation supports it.

---

# 🚦 Rate Limiting & Abuse Protection

The backend must protect public APIs and infrastructure.

Potential controls:

* IP-based rate limiting
* Account-based rate limiting
* Endpoint-specific limits
* Request throttling
* Burst protection
* Cloudflare Turnstile
* Abuse detection
* Server-side usage validation

Turnstile should be used according to the sensitivity of the endpoint.

```text
Normal Page Request
        ↓
Lightweight Verification

Sensitive / Abuse-Prone Action
        ↓
Turnstile Challenge / Verification
```

Turnstile should not be treated as a substitute for server-side authorization or rate limiting.

---

# 💳 Monetization

The backend may manage:

* Subscription state
* Premium entitlements
* Rewarded-ad token accounting
* Ad configuration
* Usage limits

Planned tiers:

```text
FREE
├── 5 files / batch
├── 5 metadata operations / day
└── Ads + rewarded token system

PREMIUM TIER 1
├── 20 files / batch
└── 30 metadata operations

PREMIUM TIER 2
├── 70 files / batch
└── 80 metadata operations
```

Actual pricing, limits, and entitlement rules may change.

---

# 🎁 Rewarded Tokens

Rewarded advertisements may grant temporary processing tokens for the free tier.

Planned model:

```text
Rewarded Ad
     ↓
+5 Tokens
```

Maximum planned rewarded usage:

```text
3 rewarded ads
× 5 tokens
= 15 tokens
```

Token consumption can be based on the estimated computational or file-size cost of an operation.

The final token economy should be implemented server-side for validation while the actual file processing remains client-side.

---

# 🦀 Rust Backend Usage

Rust is **not required for the initial backend**.

Rust may be introduced later for:

* High-performance file processing workers
* Native processing services
* Specialized parsers
* CPU-intensive transformations
* Security-sensitive processing components

The preferred path is to first evaluate whether those workloads can be handled through browser-side WebAssembly.

```text
Need native performance?
        │
        ├── Can run in browser?
        │        ↓
        │      Rust → WASM
        │
        └── Requires server?
                 ↓
              Rust Worker
```

---

# 🐹 Go

Go is not part of the initial mandatory stack.

It may be introduced later for infrastructure-specific services such as:

* High-throughput APIs
* Background workers
* Queue consumers
* Networking-heavy services
* Standalone microservices

Go should only be introduced when a concrete workload justifies a separate service.

---

# 🌙 Lua

Lua is **not part of the core application stack**.

It may be considered in the future for:

* Embedded scripting
* Configurable processing rules
* Sandboxable plugin logic
* Specialized runtime extensions

There is no reason to introduce Lua into the initial architecture without a concrete requirement.

---

# 📡 API Style

The initial backend can expose a small HTTP API.

Potential endpoints:

```text
/auth/*
/user/*
/usage/*
/entitlements/*
/turnstile/*
/subscription/*
/config/*
```

The backend should remain stateless wherever possible.

Authentication/session storage, entitlement state, and usage accounting are the primary stateful concerns.

---

# 🧵 Processing Architecture

For supported client-side operations:

```text
                    Browser
                       │
                File Selection
                       │
                 Validation
                       │
                 Web Worker
                       │
              ┌────────┴────────┐
              │                 │
          JS Engine          WASM Engine
              │                 │
              └────────┬────────┘
                       │
                    Result
                       │
                     Blob
                       │
                    Download
```

There should be no unnecessary upload/download round trip.

---

# 📦 Large File Strategy

Large files require special handling.

The architecture should avoid loading multiple large files into memory simultaneously.

Potential techniques:

* Streaming
* Chunked processing
* Sequential batch execution
* Web Workers
* Transferable objects
* Backpressure
* Temporary browser storage

Example:

```text
100 files
   ↓
Queue
   ↓
Process 1
   ↓
Release resources
   ↓
Process 2
   ↓
Release resources
   ↓
...
```

The application should never assume that because a browser can technically select a 1 GB file, it can safely process that file entirely in memory.

---

# 🔭 Future Architecture

The project should evolve incrementally.

Initial:

```text
React
TypeScript
Tailwind
Node.js
Fastify
PostgreSQL
Web APIs
Web Workers
WASM
```

Possible future additions:

```text
Rust
   ↓
High-performance WASM / workers

Redis
   ↓
Distributed rate limiting / caching

Queue
   ↓
Background server workloads

Go
   ↓
Specialized infrastructure services
```

These technologies should only be introduced when justified by measurable requirements.

---

# 🎯 Technology Principles

1. **Client-side first**
2. **Backend only when necessary**
3. **Prefer simple architecture**
4. **Use Web Workers for heavy browser workloads**
5. **Use WebAssembly for computationally expensive operations where appropriate**
6. **Do not introduce a language or service without a concrete need**
7. **Never send user files to the server unnecessarily**
8. **Design large-file processing around bounded memory**
9. **Keep authentication and entitlement checks server-side**
10. **Treat privacy as an architectural property, not just a marketing claim**

---

# 🧱 Initial Stack Summary

| Layer                              | Technology                                |
| ---------------------------------- | ----------------------------------------- |
| UI                                 | React                                     |
| Language                           | TypeScript                                |
| Styling                            | Tailwind CSS                              |
| Client Processing                  | Web APIs + dedicated libraries            |
| Background Processing              | Web Workers                               |
| High-performance Client Processing | WebAssembly                               |
| WASM Candidate                     | Rust                                      |
| Backend Runtime                    | Node.js                                   |
| Backend Framework                  | Fastify                                   |
| Database                           | PostgreSQL                                |
| Authentication                     | Google OAuth                              |
| Abuse Protection                   | Rate Limiting + Cloudflare Turnstile      |
| Client Cache                       | Cache Storage / Service Worker            |
| Client Persistent Data             | IndexedDB                                 |
| Small Client Preferences           | localStorage                              |
| Media Processing                   | WebCodecs / FFmpeg WASM where appropriate |
| PDF Processing                     | PDF.js / PDF-lib where appropriate        |

## Philosophy

Flowy Converter should be **a browser application first and a backend application second**.

The backend exists to provide trusted application services.

The browser should do the actual work whenever it can.
