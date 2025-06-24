FROM amazonlinux:2

# Install Python 3.9 and other dependencies
RUN yum update -y && \
    yum install -y python3 python3-pip gcc g++ libjpeg-devel zlib-devel curl && \
    yum clean all

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements_aws.txt .
RUN pip install --no-cache-dir -r requirements_aws.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "app_aws:app"] 