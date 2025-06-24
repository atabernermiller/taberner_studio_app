import os
import sys
import logging
from flask import Flask, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
    handlers=[
        logging.FileHandler("testapp.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Log startup information
logger.info(f"=== TESTAPP STARTUP ===")
logger.info(f"Entrypoint: {__file__}")
logger.info(f"Working directory: {os.getcwd()}")
logger.info(f"sys.argv: {sys.argv}")
logger.info(f"Python version: {sys.version}")
logger.info(f"__name__: {__name__}")
logger.info("Environment variables (filtered):")
for k, v in os.environ.items():
    if not any(s in k for s in ["KEY", "SECRET", "PASSWORD"]):
        logger.info(f"  {k}={v}")

# Create Flask app
app = Flask(__name__)

@app.route("/")
def hello():
    logger.info("Received request for /")
    return jsonify({
        "message": "Hello, Elastic Beanstalk!",
        "status": "success",
        "app": "testapp",
        "timestamp": str(logging.Formatter().formatTime(logging.LogRecord("", 0, "", 0, "", (), None)))
    })

@app.route("/health")
def health():
    logger.info("Received health check request")
    return jsonify({"status": "healthy", "app": "testapp"})

@app.route("/debug")
def debug():
    logger.info("Received debug request")
    return jsonify({
        "app_file": __file__,
        "working_dir": os.getcwd(),
        "python_version": sys.version,
        "environment": {k: v for k, v in os.environ.items() if not any(s in k for s in ["KEY", "SECRET", "PASSWORD"])}
    })

if __name__ == "__main__":
    logger.info("Starting testapp directly...")
    app.run(host="0.0.0.0", port=8000, debug=True) 