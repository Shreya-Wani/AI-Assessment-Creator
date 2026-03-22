# Frontend (Next.js)

Teacher dashboard and student-facing UI for AI Assessment Creator.

## Setup

1. Install dependencies

```bash
npm install
```

2. Create local environment file

```bash
cp .env.example .env.local
```

3. Configure env values

- NEXT_PUBLIC_API_URL: backend API URL including /api
- NEXT_PUBLIC_SOCKET_URL: backend origin for websocket

4. Run development server

```bash
npm run dev
```

## Production Checks

```bash
npm run lint
npm run build
```

## Production Start

```bash
npm run start
```
