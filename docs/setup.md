# Setup Guide

## Prerequisites
- Node.js 20+
- AWS CLI configured for deployment
- AWS CDK or SAM (optional for deployment)

## Frontend
```bash
cd frontend
npm install
npm run dev
```

## Backend
```bash
cd backend
npm install
npm run build
```

## Environment Variables
Backend Lambdas require:
- `TABLE_NAME`: DynamoDB table name
 - `RECEIPTS_BUCKET`: S3 bucket for receipt uploads

Frontend expects:
- `VITE_API_BASE_URL`: API Gateway base URL (e.g., `http://localhost:3000`)
- `VITE_AWS_REGION`: AWS region (e.g., `af-south-1`)
- `VITE_COGNITO_USER_POOL_ID`: Cognito User Pool ID
- `VITE_COGNITO_USER_POOL_CLIENT_ID`: Cognito App Client ID

Example values (create local files manually if your tooling ignores `.env*`):
- `frontend` environment: `VITE_API_BASE_URL=http://localhost:3000`
- `backend` environment: `TABLE_NAME=SpendGuardTable`

## Local API Emulation
Use AWS SAM or Serverless framework to run Lambda handlers locally. See `infra/README.md` for deployment notes.
