# taberner_studio_app

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

### 3. Deploy/Update Catalog Data to DynamoDB
- To upload or update your catalog data in DynamoDB, run:
  ```bash
  python backend/migrate_to_dynamodb.py
  ```
- This script will:
  - Create the DynamoDB table if it does not exist.
  - Insert or update each item from `catalog.json` (using the `id` as the key).
  - Verify that the number of items matches between the file and the table.
- Make sure your AWS credentials are configured and you have the necessary permissions.

---

For more details, see the docstrings at the top of each script in `backend/`.

---

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

---

## System Architecture & Recommendation Flow

```mermaid
flowchart TD
    User["User"]
    subgraph Frontend
        A1["Upload Room Photo"]
        A2["Enter Art Preferences"]
        UI["index.html / JS"]
    end
    subgraph Backend
        API["Flask API"]
        Process["process_catalog.py"]
        Enrich["enrich_catalog.py"]
        Migrate["migrate_to_dynamodb.py"]
    end
    DynamoDB["DynamoDB (Catalog Table)"]
    S3["S3 (Artwork Images)"]
    ECS["ECS (Dockerized App)"]
    ALB["Application Load Balancer"]
    ACM["ACM Certificate"]
    GoDaddy["GoDaddy DNS"]

    User -->|Visits| GoDaddy
    GoDaddy -->|CNAME| ALB
    ALB -->|HTTPS| ECS
    ECS -->|Runs| Backend
    User -->|Interacts| UI
    UI -->|Uploads Photo| A1
    UI -->|Enters Preferences| A2
    A1 -->|POST /recommend| API
    A2 -->|POST /recommend| API
    API -->|Query| DynamoDB
    API -->|Fetch Images| S3
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

---