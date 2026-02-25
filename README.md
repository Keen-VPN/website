# KeenVPN Website

The central marketing site, user customer portal, and account management frontend for KeenVPN.

---

## 🛠 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router (DOM)
- **Styling**: Tailwind CSS + Custom Animations
- **Component Library**: shadcn/ui + Radix UI Primitives
- **Authentication**: Firebase Auth (integrated with custom backend)
- **State Management**: React Query (`@tanstack/react-query`) + Custom Contexts
- **Deployment**: Netlify

---

## 📋 Prerequisites

To run the local development server, you will need:

- **Node.js**: v18 or higher (using `bun` is optional but standard `npm` works)
- **Firebase Project**: Dedicated keys for Auth.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Keen-VPN/website.git
cd website
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the following variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Client API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `keenvpn.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `keenvpn` |
| `VITE_BACKEND_URL` | URL to the KeenVPN API | `http://localhost:3003/api` (Local) |

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser. Note that this port is forced strictly via `vite.config.ts`.

---

## 🏗️ Architecture

### Directory Structure

```text
website/
├── public/                 # Static assets (images, fonts, raw HTML elements)
├── src/
│   ├── auth/               # Firebase initialization and custom hooks
│   ├── components/         # Reusable UI Blocks (shadcn ui primitives + custom layouts)
│   ├── contexts/           # Global React Contexts (e.g., AuthContext)
│   ├── hooks/              # Custom React hooks (e.g., use-toast)
│   ├── lib/                # Utilities and API interaction methods
│   ├── pages/              # Routing page views (Home, Pricing, Account, etc.)
│   ├── App.tsx             # Main React Router configuration with lazy loading
│   └── main.tsx            # React application mount point
├── tailwind.config.ts      # Tailwind theming, colors, and keyframes
└── vite.config.ts          # Vite configuration and plugins
```

### Authentication Flow (Hybrid)

The React application uses a hybrid authentication model:

1. **Client Action**: User signs in using Google/Apple/Email via Firebase Auth.
2. **Token Generation**: The frontend SDK automatically retrieves a short-lived Firebase ID Token.
3. **Backend Injection**: In API calls (handled in `/src/lib`), this token is injected as a `Bearer` token in the `Authorization` header.
4. **Backend Verification**: The backend NestJS server verifies this token against the Firebase Admin SDK to establish an active session.

---

## 📡 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with HMR. |
| `npm run build` | Compiles and groups artifacts for production deployment. |
| `npm run build:dev` | Runs a build under development constraints (helpful for debugging build logs). |
| `npm run preview` | Serves the built production assets locally. |
| `npm run lint` | Runs ESLint across all TypeScript files. |
| `npm run typecheck` | Validates TypeScript logic independently without emitting code. |

---

## ☁️ Deployment (Netlify)

This project is configured heavily for direct **Netlify** deployments.

1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`

### Netlify Configuration

Routing rules are hardcoded in `netlify.toml` to ensure the Single Page App (SPA) routers work correctly on direct linkages:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
