# Agent Development Kit Web UI (ADK WEB)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![r/agentdevelopmentkit](https://img.shields.io/badge/Reddit-r%2Fagentdevelopmentkit-FF4500?style=flat&logo=reddit&logoColor=white)](https://www.reddit.com/r/agentdevelopmentkit/)

<html>
    <h2 align="center">
      <img src="https://raw.githubusercontent.com/google/adk-python/main/assets/agent-development-kit.png" width="256"/>
    </h2>
    <h3 align="center">
      Agent Development Kit Web is the built-in developer UI that integrated with Google Agent Development Kit for easier agent development and debug.
    </h3>
    <h3 align="center">
      Important Links:
      <a href="https://google.github.io/adk-docs/">Docs</a> &
      <a href="https://github.com/google/adk-samples">Samples</a>.
    </h3>
</html>

Agent Development Kit (ADK) is a flexible and modular framework for developing and deploying AI agents. While optimized for Gemini and the Google ecosystem, ADK is model-agnostic, deployment-agnostic, and is built for compatibility with other frameworks. ADK was designed to make agent development feel more like software development, to make it easier for developers to create, deploy, and orchestrate agentic architectures that range from simple tasks to complex workflows.

ADK web is the built-in dev UI that comes along with adk for easier development and debug.

## ✨ Prerequisite

- **Install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)**

- **Install [NodeJs](https://nodejs.org/en)**

- **Install [Angular CLI](https://angular.dev/tools/cli)**

- **Install [google-adk (Python)](https://github.com/google/adk-python)**

- **Install [google-adk (Java)](https://github.com/google/adk-java/)**

- **Clone [adk-web (this repo)](https://github.com/google/adk-web/)**

## 🚀 Running adk web

To be able to run `adk web`, follow the steps from the root of your local
adk-web folder:

### Install dependencies

```bash
sudo npm install
```

### Run adk web

```bash
npm run serve --backend=http://localhost:8000
```

### Run adk api server

In another terminal run:

```bash
adk api_server --allow_origins=http://localhost:4200 --host=0.0.0.0
```

If you see `adk command not found`, then be sure to install `google-adk` (or remember to activate your virtual environment if you are using one)

### Happy development

Go to `localhost:4200` and start developing!

## Screenshots

### Events

<img width="2548" height="1378" alt="adk-web-events" src="https://github.com/user-attachments/assets/dc2002e4-6d2d-4b84-9d7d-3c482e8d9391" />

### Tracing

<img width="2510" height="1377" alt="adk-web-tracing" src="https://github.com/user-attachments/assets/23a93480-334c-483a-828a-05b0f6117022" />

### Artifacts

<img width="2530" height="1397" alt="adk-web-artifact" src="https://github.com/user-attachments/assets/aacb0866-dbb2-47e4-842c-13f27146c912" />

### Evaluations


<img width="2536" height="777" alt="adk-web-eval-2" src="https://github.com/user-attachments/assets/fb5f97e7-8bcc-4512-8b8e-a1123ee78c8e" />

### Agent builder & assistant

![1_h3_I7RjXGLKH5-Td0U2rgw](https://github.com/user-attachments/assets/f73409c4-9b75-474a-9b86-c4525d376b02)

### And more!

## 🔐 Authentication (Optional)

ADK Web supports optional OIDC authentication for enterprise deployments. When enabled, users must authenticate via an OIDC-compliant provider before accessing the UI. When disabled (default), the UI is accessible without authentication.

### Supported Providers

Any OIDC-compliant identity provider works, including:
- **Keycloak** (including Red Hat build of Keycloak)
- **Okta** / Auth0
- **Azure AD** / Entra ID
- **Google Identity Platform**
- Any provider with a standard `/.well-known/openid-configuration` endpoint

### Enabling Authentication

Add an `auth` section to `runtime-config.json`:

```json
{
  "backendUrl": "http://localhost:8000",
  "auth": {
    "enabled": true,
    "authority": "https://keycloak.example.com/realms/my-realm",
    "clientId": "adk-web-ui",
    "scopes": "openid profile email"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | Yes | Set to `true` to enable OIDC authentication |
| `authority` | Yes | OIDC issuer URL. For Keycloak: `https://host/realms/{realm}` |
| `clientId` | Yes | OIDC public client ID registered with your provider |
| `scopes` | No | Space-separated scopes (default: `openid profile email`) |
| `silentRefresh` | No | Enable background token refresh (default: `true`) |
| `postLogoutRedirectUri` | No | URL to redirect to after logout |

### Kubernetes / Container Deployments

For container deployments, enable auth without rebuilding by injecting a ConfigMap:

```javascript
// Mount as runtime-config.js and include via script tag, or
// inject into runtime-config.json via ConfigMap mount
window.__ADK_CONFIG__ = {
  auth: {
    enabled: true,
    authority: "https://keycloak.example.com/realms/kagenti",
    clientId: "adk-web-ui"
  }
};
```

`window.__ADK_CONFIG__` takes priority over `runtime-config.json`.

### Integration with Kagenti + SPIFFE/SPIRE

When agents are managed by [Kagenti](https://github.com/kagenti) with SPIFFE/SPIRE zero-trust security, OIDC authentication provides the browser-to-agent security layer:

```
Browser  --OIDC-->  Identity Provider  --JWT-->  Browser
   |
   |  Authorization: Bearer <JWT>
   v
Envoy AuthBridge (Kagenti sidecar)  --validates JWT-->  ADK Agent
   |
   |  SPIFFE/SPIRE mTLS (automatic via ztunnel)
   v
Backend Services (SonataFlow, MCP servers, etc.)
```

The UI handles the first hop (Browser to Envoy). Kagenti infrastructure handles the second hop (Agent to Services) via SPIFFE/SPIRE mTLS -- no application code changes needed.

### Security Model

- **PKCE** (Proof Key for Code Exchange) is enforced for all authorization flows
- **Fail-closed**: if auth is enabled but a token cannot be obtained, requests are blocked rather than sent without credentials
- **Automatic refresh**: tokens are silently refreshed before expiry
- **Provider-agnostic**: uses standard `oidc-client-ts`, not provider-specific adapters

### Behavior When Auth Is Enabled

When authentication is active, the "User ID" text field in the toolbar is replaced by an authenticated user menu showing the user's name, email, and roles from the OIDC token.

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug reports, feature requests, documentation improvements, or code contributions, please see our

- [General contribution guideline and flow](https://google.github.io/adk-docs/contributing-guide/#questions).

### Testing quirks

To maintain compatibility with upstream 1p code, testing code in this repo must
follow a few rules:

- `initTestBed()` from `./src/app/testing/utils.ts` must be called before `TestBed.configureTestingModule()`

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Preview

This feature is subject to the "Pre-GA Offerings Terms" in the General Service Terms section of the [Service Specific Terms](https://cloud.google.com/terms/service-terms#1). Pre-GA features are available "as is" and might have limited support. For more information, see the [launch stage descriptions](https://cloud.google.com/products?hl=en#product-launch-stages).

---

*Happy Agent Building!*
