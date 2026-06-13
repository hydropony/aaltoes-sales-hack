# aaltoes-sales-hack

## Backend

The backend is a FastAPI app managed with [uv](https://docs.astral.sh/uv/).

### Prerequisites

Install uv:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Setup

```bash
cd backend

# Initialize the project (first time only)
uv init

# Install dependencies
uv add fastapi "uvicorn[standard]"
```

### Run the dev server

```bash
uv run uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

Interactive docs: `http://localhost:8000/docs`

### Adding dependencies

```bash
uv add <package-name>
```

---

## Frontend

The frontend is a React app built with [Vite](https://vitejs.dev/).

### Prerequisites

Node.js (v18+) and npm.

### Setup

```bash
cd frontend
npm install
```

### Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Other commands

```bash
npm run build    # production build
npm run preview  # preview production build locally
npm run lint     # run ESLint
```
