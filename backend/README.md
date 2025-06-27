# Taberner Studio Backend

This is the backend server for the Taberner Studio art recommendation application.

## Structure

- **`app.py`** - Main Flask application server
- **`catalog_management/`** - Scripts for building and managing the art catalog
- **`catalog/`** - Local catalog data and images
- **`requirements.txt`** - Python dependencies
- **`Dockerfile`** - Docker configuration for deployment

## Quick Start

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set environment variables (see `.env` file in parent directory)

3. Run the server:
   ```bash
   python app.py
   ```

The server will start on `http://127.0.0.1:8000`

## Catalog Management

See the `catalog_management/` folder for scripts to build and update the art catalog.

## Documentation

- **`RECOMMENDATION_CONFIG.md`** - Configuration for recommendation algorithms
- **`catalog_management/README.md`** - Catalog management documentation 