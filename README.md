# Provider Risk Intelligence

A full-stack application for healthcare provider fraud risk detection using machine learning.

## Architecture

- **Frontend**: Next.js + React + TypeScript
- **Backend**: Node.js + Express + PostgreSQL
- **ML API**: Python + FastAPI + XGBoost

## Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL (production database already configured)

## Quick Start

### 1. Install Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# Server dependencies
cd server
npm install

# Frontend dependencies
cd frontend
npm install
```

### 2. Configure Environment

Copy `server/.env.example` to `server/.env` and configure:

```env
DATABASE_URL=your_production_database_url
PORT=4000
PYTHON_API_URL=http://localhost:8000
```

### 3. Start Services

**Terminal 1 - ML API:**
```bash
python -m uvicorn predict_api.app:app --host 0.0.0.0 --port 8000
```

**Terminal 2 - Backend:**
```bash
cd server
npm start
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- ML API: http://localhost:8000

## Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
```

### Backend (Render/Railway/Heroku)
```bash
cd server
npm start
```

### ML API (Render/Railway)
```bash
uvicorn predict_api.app:app --host 0.0.0.0 --port $PORT
```

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 4000)
- `PYTHON_API_URL` - ML API endpoint

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

## Features

- ✅ Provider fraud risk scoring
- ✅ Interactive analytics dashboard
- ✅ ML-powered predictions
- ✅ User authentication
- ✅ Real-time data filtering
- ✅ State-based analysis

## Tech Stack

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/ui
- Recharts

**Backend:**
- Node.js
- Express
- PostgreSQL
- pg (node-postgres)

**ML:**
- Python
- FastAPI
- XGBoost
- scikit-learn
- joblib

## License

MIT
