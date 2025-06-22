# Taberner Studio App

This is a web application for Taberner Studio, a photography website. The app allows users to get photo recommendations based on an uploaded room photo or by specifying their preferences (mood, subject, style).

## Features

- **Photo Recommendations**: Upload a room photo to get personalized artwork recommendations based on color harmony
- **Filter-based Search**: Browse photos by mood, subject, and style preferences
- **AI-Powered Analysis**: Uses OpenAI's CLIP model for image classification and scikit-learn for color analysis
- **Local Development**: Runs completely offline with local image storage

## Project Structure

- `frontend/`: Contains the frontend code (HTML, CSS, JavaScript)
- `backend/`: Contains the backend code (Flask server, API endpoints)
- `backend/catalog/`: Contains the photo catalog and images
- `backend/uploads/`: Local storage for uploaded images

## Prerequisites

- Python 3.9 or higher
- pip (Python package installer)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd TabernerStudioApp
```

### 2. Set Up the Backend

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Application

```bash
# Make sure you're in the backend directory with the virtual environment activated
cd backend
source venv/bin/activate

# Start the Flask server
python app.py
```

### 4. Access the Application

Open your web browser and navigate to:
**http://127.0.0.1:8000**

The application should now be running and accessible!

## Usage

### Getting Photo Recommendations

1. **Upload a Room Photo**: Click the upload area and select a photo of your room
2. **View Recommendations**: The app will analyze the colors in your photo and suggest artwork that matches your room's color palette
3. **Browse by Filters**: Use the mood, subject, and style filters to explore different types of photography

### Features

- **Color Analysis**: The app extracts dominant colors from your uploaded photo using machine learning
- **Smart Matching**: Uses weighted color harmony algorithms to find the best artwork matches
- **Content Moderation**: Images are automatically checked for inappropriate content (when running in AWS mode)
- **Responsive Design**: Works on desktop and mobile devices

## Development

### Running in Development Mode

The app runs in debug mode by default, which provides:
- Automatic server restart on code changes
- Detailed error messages
- Debugger interface

### Environment Configuration

The app supports two modes:
- **Local Mode** (default): Runs completely offline with local file storage
- **AWS Mode**: Uses AWS services for image storage and content moderation

To switch to AWS mode, set the environment variable:
```bash
export APP_ENV=aws
```

### API Endpoints

- `GET /`: Serves the main application
- `GET /api/filters`: Returns available filter options
- `POST /api/recommendations`: Get recommendations based on filter criteria
- `POST /upload`: Upload an image and get color-based recommendations
- `GET /catalog/images/<filename>`: Serve catalog images

## Troubleshooting

### Common Issues

1. **Port Already in Use**: If port 8000 is busy, the app will show an error. You can change the port in `backend/app.py`:
   ```python
   app.run(debug=True, port=8001, host='0.0.0.0')
   ```

2. **Missing Dependencies**: If you get import errors, make sure the virtual environment is activated and all dependencies are installed:
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Permission Errors**: On some systems, you might need to use `python3` instead of `python`:
   ```bash
   python3 -m venv venv
   python3 app.py
   ```

### Dependencies

The main dependencies include:
- **Flask**: Web framework
- **boto3**: AWS SDK for Python
- **Pillow**: Image processing
- **scikit-learn**: Machine learning for color analysis
- **transformers**: Hugging Face transformers for image classification
- **torch**: PyTorch for deep learning models

## Model Information

The application uses several AI models:
- **OpenAI CLIP**: For image classification (style, subject, mood)
- **scikit-learn KMeans**: For dominant color extraction
- **AWS Rekognition**: For content moderation (AWS mode only)

## License

This project is licensed under the ISC License.

## Support

For issues or questions, please check the troubleshooting section above or create an issue in the repository.