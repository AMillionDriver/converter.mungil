# Flowy Converter

> A privacy-first, client-side file conversion and metadata cleaning toolkit.

Flowy Converter is a web-based utility for converting, editing, cleaning, and processing files directly in the user's browser whenever the selected operation supports client-side execution.

The project is designed around a simple idea:

**Your files should not need to leave your device just to perform a lightweight file operation.**

## ✨ Core Goals

* **Client-side first**: lightweight and medium file operations should run directly in the browser whenever technically feasible.
* **Privacy-focused**: supported files are processed locally instead of being uploaded to a conversion backend.
* **Simple architecture**: keep the backend minimal and avoid unnecessary file-processing infrastructure.
* **Fast UX**: process files locally and let users download the result immediately.
* **Extensible**: make it easy to add new conversion, metadata, image, PDF, and media tools over time.

## 🛠️ Planned Capabilities

### File Conversion

Examples of planned tools include:

* PDF ↔ common document formats
* Image format conversion
* Video format conversion for supported use cases
* Batch file processing
* Other browser-compatible conversion workflows

### 🧹 Metadata & EXIF

Flowy Converter is also designed to provide privacy-oriented metadata tools, including:

* EXIF inspection
* EXIF removal
* Metadata editing
* Metadata removal
* Photo metadata cleaning
* Short-video metadata cleaning where browser-side processing is practical

Depending on the format, metadata support may vary because different file formats expose different metadata structures.

### 📦 File Processing

Other planned utilities may include:

* Image resizing
* Image compression
* PDF utilities
* File inspection
* Batch processing
* Other lightweight browser-based file transformations

## 🔒 Privacy & Security

Flowy Converter follows a client-side-first architecture.

For supported operations:

```text
User selects file
        ↓
Browser processes file
        ↓
Result generated locally
        ↓
User downloads result
```

The application is designed to avoid uploading user files to a central processing backend whenever the requested operation can be performed safely in the browser.

### Gateway & Abuse Protection

The web application may use multiple layers of request protection, including:

* Rate limiting
* Cloudflare Turnstile
* Interactive Turnstile challenges for sensitive entry points
* Non-interactive/background verification where appropriate
* Request throttling and abuse controls

These protections are intended to protect the application infrastructure and monetization endpoints rather than to process the user's files remotely.

## 🔑 Authentication

Account features are planned around **Google OAuth**.

Users will be able to sign in using a Google Account and may receive an email confirmation or account-related notification through the authentication flow.

Authentication is intended for features such as:

* Subscription management
* Usage tracking
* Premium entitlements
* Account preferences

File processing itself should remain client-side whenever the selected feature supports it.

## 💎 Usage Tiers

Flowy Converter uses a tiered usage model.

### Free

Free users can use supported tools with daily limits.

Current planned limits:

* Up to **5 files per batch**
* Up to **5 metadata/EXIF edit or removal operations per day**

The free tier is supported by advertising.

### Premium Tier 1

Monthly or yearly subscription.

Planned limits:

* Up to **20 files per batch**
* Up to **30 metadata/EXIF edit or removal operations**

### Premium Tier 2

Monthly subscription.

Planned limits:

* Up to **70 files per batch**
* Up to **80 metadata/EXIF edit or removal operations**

Limits and pricing may be adjusted as the project evolves.

## 📺 Monetization

The free tier may use lightweight advertising to help cover infrastructure and development costs.

Planned formats include:

* Banner advertisements
* Sticky advertisements during active processing
* Rewarded advertisements

Sticky advertisements are intended to disappear after processing is completed.

### 🎁 Rewarded Tokens

Free users may optionally watch rewarded advertisements to receive temporary processing tokens.

Planned rules:

* **5 tokens per rewarded ad**
* Up to **3 rewarded ads per day/session policy**
* Maximum of **15 rewarded tokens** from rewarded ads

Token consumption may depend on the total size and computational cost of the selected files.

For example:

```text
Small file
→ low token usage

Large file
→ higher token usage
```

The exact token calculation model may change as real-world processing costs and browser performance are evaluated.

## 🧩 Minimal Backend Philosophy

Flowy Converter intentionally avoids building a large file-processing backend unless it becomes necessary.

The backend is primarily intended for application services such as:

```text
Authentication
Usage / entitlement management
Rate limiting
Turnstile verification
Premium subscriptions
Ads / monetization services
Configuration delivery
```

A lightweight frontend configuration or script-delivery mechanism may also be cached locally by the client where appropriate.

The goal is to keep the architecture simple:

```text
                ┌───────────────┐
                │    Browser    │
                │               │
                │ File Processing│
                │ Metadata Tools │
                │ Converters     │
                └───────┬───────┘
                        │
                Lightweight API
                        │
        ┌───────────────┼────────────────┐
        │               │                │
   Authentication   Entitlements   Monetization
        │               │                │
      Google          Premium       Ads / Rewards
```

## 🚧 Project Status

Flowy Converter is currently in development.

The architecture, supported formats, usage limits, token economy, and premium features are subject to change as the project is tested against real browser workloads and user feedback.

The long-term goal is to build a practical collection of browser-based file utilities that are:

**fast, privacy-conscious, lightweight, and easy to use.**

## 📌 Design Principle

> **Process locally when possible. Upload only when necessary.**

That principle guides the technical and product decisions behind Flowy Converter.
