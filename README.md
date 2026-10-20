# GRAMSEVA

An outcome-adaptive civic service resolution and rural e-governance system.

## Overview

GRAMSEVA is a prototype for reporting rural civic issues, matching complaints to infrastructure assets, tracking interventions, collecting evidence, and gathering citizen feedback.

## Technology Stack

- Python and FastAPI
- PostgreSQL and SQLAlchemy
- Alembic database migrations
- Gemini AI integrations
- Flutter mobile frontend (planned)
- Google Maps integration (planned)

## Current Development

Implemented backend capabilities include complaint management, multilingual processing, voice complaint submission, complaint photo attachments, GPS-aware asset matching, and resolution-related workflows.

The Flutter application and map interface are planned. Features may be at different stages of implementation.

## Local Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

   pip install -r requirements.txt

3. Configure local environment variables using `.env.example` as a reference.
4. Start the API:

   uvicorn backend.main:app --reload

5. Open the API documentation at http://127.0.0.1:8000/docs

## Security

Never commit API keys, database credentials, private keys, uploaded files, or local database backups.

GRAMSEVA is under active development and requires appropriate authentication, authorization, and security hardening before production deployment.
