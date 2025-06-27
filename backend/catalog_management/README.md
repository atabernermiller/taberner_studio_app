# Catalog Management

This folder contains scripts for building, updating, and managing the Taberner Studio art catalog.

## Scripts

- **`enrich_catalog.py`** - Enriches catalog entries with AI-generated attributes and embeddings
- **`process_catalog.py`** - Processes and validates catalog entries
- **`bulk_add_images.py`** - Bulk uploads images to the catalog
- **`update_metadata.py`** - Updates metadata for existing catalog entries
- **`cleanup_dynamodb.py`** - Cleans up DynamoDB entries

## Documentation

- **`CATALOG_MANAGEMENT.md`** - General catalog management documentation
- **`BULK_IMAGE_WORKFLOW.md`** - Workflow for bulk image processing

## Data Files

- **`catalog_metadata.json`** - Catalog metadata and configuration

## Usage

Most scripts can be run from the `backend` directory:

```bash
cd backend
python catalog_management/enrich_catalog.py
python catalog_management/process_catalog.py
# etc.
``` 