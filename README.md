# RePage PDF

PDF to HTML conversion system with AI-powered styling.

## Features

- **PDF to HTML Conversion**: Convert PDF documents to clean, styled HTML
- **Multiple Converter Engines**:
  - PyMuPDF (fast, local processing)
  - pdfplumber (better table extraction)
  - OpenAI Vision (high accuracy)
  - Claude Vision (high accuracy)
- **Image Extraction**: Automatically extracts and embeds images from PDFs
- **Table Detection**: Preserves table structure in output HTML
- **Template System**: Define conversion templates with reference URLs for styling
- **Web Scraping**: Fetch reference pages for style matching

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: Next.js 14 (TypeScript)
- **Database**: SQLite
- **Styling**: Tailwind CSS

## Project Structure

```
repage_pdf/
├── src/
│   ├── backend/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/      # API endpoints
│   │   │   ├── converters/  # PDF converters
│   │   │   ├── services/    # Business logic
│   │   │   └── models/      # Database models
│   │   └── requirements.txt
│   └── frontend/         # Next.js frontend
│       ├── src/
│       │   ├── app/      # Pages
│       │   ├── components/
│       │   └── stores/   # Zustand stores
│       └── package.json
├── infrastructure/
│   └── systemd/          # Service definitions (examples)
├── tests/
│   └── e2e/              # Playwright E2E tests
└── docs/                 # Documentation
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Backend Setup

```bash
cd src/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env and set your keys

# Create data directory
mkdir -p data storage

# Run development server
uvicorn app.main:app --reload --port 8018
```

### Frontend Setup

```bash
cd src/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Access

- Frontend: http://localhost:3013
- Backend API: http://localhost:8018
- API Docs: http://localhost:8018/docs

## Environment Variables

Copy `src/backend/.env.example` to `src/backend/.env` and configure:

```env
# Required
JWT_SECRET_KEY=your-secret-key-change-in-production
ENCRYPTION_KEY=  # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Optional - for AI converters
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Production Deployment

### Using systemd

1. Copy example service files:
```bash
cp infrastructure/systemd/repage-pdf-backend.service.example /etc/systemd/system/repage-pdf-backend.service
cp infrastructure/systemd/repage-pdf-frontend.service.example /etc/systemd/system/repage-pdf-frontend.service
```

2. Edit the service files to set correct paths and user

3. Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable repage-pdf-backend repage-pdf-frontend
sudo systemctl start repage-pdf-backend repage-pdf-frontend
```

## Testing

### E2E Tests (Playwright)

```bash
cd tests/e2e
npm install
npx playwright test
```

## Default Credentials

For development/testing:
- Email: `admin@example.com`
- Password: `admin123`

**Note**: Change these in production!

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
