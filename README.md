# Taberner Studio Artwork Recommendation App

A sophisticated web application that provides personalized artwork recommendations based on room photos or user preferences. The app uses AI-powered color analysis and smart recommendation algorithms to suggest the perfect artwork for any space.

## Project Structure

```
taberner_studio_app/
├── aws/                          # AWS Infrastructure & Deployment
│   ├── deploy_to_ecs.sh         # ECS deployment script
│   ├── ecs-service-definition.json
│   ├── ecs-task-definition.json
│   ├── s3-cors-config.json      # S3 CORS configuration
│   ├── setup_https_*.sh         # HTTPS setup scripts
│   ├── monitor_app.py           # Monitoring utilities
│   ├── verify_dynamodb.py       # DynamoDB verification
│   └── AWS_MIGRATION_GUIDE.md   # AWS migration documentation
├── backend/                      # Backend Application
│   ├── app.py                   # Local development server
│   ├── app_aws.py               # Production server (Docker)
│   ├── catalog/                 # Local catalog data
│   │   ├── catalog.json         # Artwork catalog
│   │   ├── catalog_metadata.json # Custom descriptions & URLs
│   │   └── images/              # Artwork images
│   ├── process_catalog.py       # Generate catalog from images
│   ├── enrich_catalog.py        # Add AI metadata to catalog
│   ├── migrate_to_dynamodb.py   # Upload catalog to DynamoDB
│   ├── bulk_add_images.py       # Bulk add new images with metadata
│   ├── update_metadata.py       # Manage artwork descriptions & URLs
│   ├── CATALOG_MANAGEMENT.md    # Catalog management guide
│   ├── BULK_IMAGE_WORKFLOW.md   # Bulk image workflow guide
│   ├── RECOMMENDATION_CONFIG.md # Recommendation configuration
│   └── requirements_*.txt       # Python dependencies
├── frontend/                     # Frontend Application
│   ├── index.html               # Main application page
│   ├── script.js                # Frontend JavaScript
│   ├── style.css                # Frontend styles
│   ├── config.js                # Configuration
│   └── assets/                  # Static assets
├── buildspec.yml                # AWS CodeBuild configuration
├── README.md                     # This file
└── .gitignore                   # Git ignore rules
```

## Quick Start

### Local Development

1. **Start the backend server:**
   ```bash
   cd backend
   python app.py
   ```

2. **Open the application:**
   - Navigate to `http://localhost:8000` in your browser

### AWS Infrastructure Management

**Deploy to ECS:**
```bash
./aws/deploy_to_ecs.sh
```

**Configure S3 CORS (for image access):**
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://aws/s3-cors-config.json --region us-east-1
```

**Monitor the application:**
```bash
python aws/monitor_app.py
```

**Verify DynamoDB setup:**
```bash
python aws/verify_dynamodb.py
```

**Setup HTTPS for custom domain:**
```bash
./aws/setup_https_for_domain.sh
```

## Backend Files

The project uses different backend files for different environments:

| File | Purpose | Environment | Data Source |
|------|---------|-------------|-------------|
| `backend/app.py` | Local development server | Development | Local `catalog.json` |
| `backend/app_aws.py` | Production server | AWS ECS | DynamoDB |

**Key Differences:**
- **`app.py`**: Uses local JSON catalog, no AWS services, for development
- **`app_aws.py`**: Uses DynamoDB, includes AWS services (S3, Rekognition), for production

**API Endpoints (both files):**
- `GET /` - Serve frontend
- `POST /recommend` - Get artwork recommendations
- `GET /api/preferences-options` - Get available preferences
- `GET /catalog/images/<filename>` - Serve catalog images (rate limited)
- `GET /health` - Health check (production only)

## Features

### 🎨 **Two Recommendation Workflows**
1. **Upload Photo**: Upload a room photo for AI-powered color analysis
2. **Set Preferences**: Choose mood, style, subject, and color preferences

### 🧠 **Smart Recommendation Algorithm**
- Balances quality and diversity in recommendations
- Configurable recommendation limits (default: 8 max, 4 min)
- Intelligent color matching using RGB distance calculations
- Prevents duplicate recommendations

### 🚀 **Performance Optimizations**
- DynamoDB caching with configurable TTL
- S3 presigned URL caching to reduce API calls
- Frontend image URL caching and batch loading
- Rate limiting on image endpoints (200 requests/hour)
- Memory monitoring and graceful shutdown

### 📱 **Enhanced User Experience**
- Two-phase loading with progress indicators
- Smooth workflow transitions
- Responsive design with glass morphism UI
- Real-time artwork positioning and resizing
- Error handling and user feedback

### 🔧 **Catalog Management**
- External metadata file for custom descriptions and URLs
- Bulk image processing workflows
- AI-powered content moderation (AWS Rekognition)
- Comprehensive logging and monitoring

## Catalog Workflow

### 1. Create `catalog.json`
- Place your artwork images in `backend/catalog/images/`.
- Run the following script to generate `catalog.json` with basic metadata and dominant color extraction:
  ```bash
  python backend/process_catalog.py
  ```
- This will create or overwrite `backend/catalog/catalog.json` with entries for each image.

### 2. Enrich the Catalog with AI Metadata
- To add AI-generated style and subject attributes to each artwork, run:
  ```bash
  python backend/enrich_catalog.py
  ```
- This uses a CLIP model to classify each image and updates the `attributes` field in `catalog.json`.
- Ensure you have the required dependencies (`transformers`, `torch`, `Pillow`).

### 3. Manage Custom Descriptions and URLs
- Use the external metadata file `catalog_metadata.json` for custom descriptions and product URLs
- Update metadata easily with the helper script:
  ```bash
  python backend/update_metadata.py
  ```
- For bulk operations, see `BULK_IMAGE_WORKFLOW.md`

### 4. Deploy/Update Catalog Data to DynamoDB
- To upload or update your catalog data in DynamoDB, run:
  ```bash
  python backend/migrate_to_dynamodb.py
  ```
- This script will:
  - Create the DynamoDB table if it does not exist.
  - Insert or update each item from `catalog.json` (using the `id` as the key).
  - Verify that the number of items matches between the file and the table.
- Make sure your AWS credentials are configured and you have the necessary permissions.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_RECOMMENDATIONS` | 8 | Maximum number of recommendations to show |
| `MIN_RECOMMENDATIONS` | 4 | Minimum number of recommendations to show |
| `APP_ENV` | development | Environment mode (development/production) |
| `CATALOG_TABLE_NAME` | taberner-studio-catalog | DynamoDB table name |
| `CATALOG_BUCKET_NAME` | taberner-studio-catalog-images | S3 bucket for catalog images |
| `APPROVED_BUCKET` | taberner-studio-images | S3 bucket for approved uploads |
| `QUARANTINE_BUCKET` | taberner-studio-quarantine | S3 bucket for quarantined uploads |

### Development vs Production

**Development Mode (`APP_ENV=development`):**
- Skips AWS Rekognition moderation for faster testing
- Uses local catalog.json
- Enhanced logging and debugging

**Production Mode (`APP_ENV=production`):**
- Full AWS Rekognition content moderation
- Uses DynamoDB for catalog data
- Optimized for performance and security

## Deploying New Changes to AWS (with CodeBuild)

1. **Commit and Push Your Changes**
   - Make sure all your code, frontend, and backend changes are committed and pushed to your main branch on GitHub.

2. **AWS CodeBuild Pipeline**
   - Your repository should be connected to an AWS CodeBuild project.
   - CodeBuild will automatically build your Docker image, push it to ECR, and deploy to ECS when changes are pushed to the main branch (or your configured branch).
   - The build process is defined in `buildspec.yml`.

3. **Monitor the Build**
   - Go to the AWS Console → CodeBuild → Your Project.
   - Watch the build logs for errors or successful completion.

4. **ECS Service Update**
   - After a successful build, ECS will pull the new Docker image and update the running service.
   - You can monitor the deployment in the ECS Console under your cluster and service.

5. **Verify the Deployment**
   - Visit your application at your custom domain or ALB DNS name to ensure the new changes are live.
   - Check CloudWatch logs for any runtime errors.

**Note:**
- If you need to trigger a manual build, you can do so from the CodeBuild Console.
- Make sure your IAM roles and permissions are set up for CodeBuild, ECR, and ECS access.

## System Architecture & Recommendation Flow

```mermaid
flowchart TD
    User["User"]
    subgraph Frontend
        A1["Upload Room Photo"]
        A2["Enter Art Preferences"]
        UI["index.html / JS"]
        Cache["Image URL Cache"]
    end
    subgraph Backend
        API["Flask API"]
        Process["process_catalog.py"]
        Enrich["enrich_catalog.py"]
        Migrate["migrate_to_dynamodb.py"]
        Smart["Smart Recommendations"]
        Moderation["Content Moderation"]
    end
    DynamoDB["DynamoDB (Catalog Table)"]
    S3["S3 (Artwork Images)"]
    ECS["ECS (Dockerized App)"]
    ALB["Application Load Balancer"]
    ACM["ACM Certificate"]
    GoDaddy["GoDaddy DNS"]
    Rekognition["AWS Rekognition"]

    User -->|Visits| GoDaddy
    GoDaddy -->|CNAME| ALB
    ALB -->|HTTPS| ECS
    ECS -->|Runs| Backend
    User -->|Interacts| UI
    UI -->|Uploads Photo| A1
    UI -->|Enters Preferences| A2
    A1 -->|POST /recommend| API
    A2 -->|POST /recommend| API
    API -->|Moderation Check| Rekognition
    API -->|Smart Algorithm| Smart
    API -->|Query| DynamoDB
    API -->|Fetch Images| S3
    UI -->|Cache URLs| Cache
    Process -->|Creates| DynamoDB
    Enrich -->|Enriches| DynamoDB
    Migrate -->|Uploads| DynamoDB
    DynamoDB -->|Artwork Data| API
    S3 -->|Artwork Images| API
    ALB -->|SSL| ACM
    ECS -->|Serves| UI
    UI -->|Shows Recommendations| User

    classDef user fill:#f9f,stroke:#333,stroke-width:2px;
    class User user;
```

## Documentation

For detailed information about specific features, see:
- `backend/CATALOG_MANAGEMENT.md` - Managing artwork catalog and metadata
- `backend/BULK_IMAGE_WORKFLOW.md` - Adding many images efficiently
- `backend/RECOMMENDATION_CONFIG.md` - Configuring recommendation algorithms
- `aws/AWS_MIGRATION_GUIDE.md` - AWS infrastructure setup and migration

---

For more details, see the docstrings at the top of each script in `backend/`.