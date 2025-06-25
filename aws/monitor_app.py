#!/usr/bin/env python3
"""
Monitoring script for Taberner Studio application.
This script helps track memory usage, process status, and potential issues.
"""

import os
import sys
import time
import psutil
import subprocess
import signal
from datetime import datetime

def log_message(message):
    """Log a message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_memory_usage():
    """Get current memory usage"""
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        return memory_info.rss / 1024 / 1024, memory_percent
    except Exception as e:
        log_message(f"Error getting memory usage: {e}")
        return 0, 0

def check_port_usage(port=8000):
    """Check if port 8000 is in use"""
    try:
        for conn in psutil.net_connections():
            if hasattr(conn, 'laddr') and conn.laddr and hasattr(conn.laddr, 'port') and conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
                return True, conn.pid
        return False, None
    except Exception as e:
        log_message(f"Error checking port usage: {e}")
        return False, None

def kill_process_on_port(port=8000):
    """Kill any process using port 8000"""
    in_use, pid = check_port_usage(port)
    if in_use and pid:
        try:
            log_message(f"Killing process {pid} on port {port}")
            os.kill(pid, signal.SIGTERM)
            time.sleep(2)
            # Check if process is still running
            if psutil.pid_exists(pid):
                log_message(f"Process {pid} still running, force killing...")
                os.kill(pid, signal.SIGKILL)
            return True
        except Exception as e:
            log_message(f"Error killing process {pid}: {e}")
            return False
    return True

def start_app():
    """Start the Flask application"""
    log_message("=== Starting Taberner Studio Application ===")
    
    # Check and kill any existing process on port 8000
    if not kill_process_on_port(8000):
        log_message("Failed to clear port 8000")
        return False
    
    # Get initial memory usage
    mem_mb, mem_percent = get_memory_usage()
    log_message(f"Initial memory usage: {mem_mb:.2f} MB ({mem_percent:.1f}%)")
    
    try:
        # Start the Flask application
        log_message("Starting Flask application...")
        process = subprocess.Popen(
            [sys.executable, "backend/app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        log_message(f"Application started with PID: {process.pid}")
        
        # Monitor the application
        start_time = time.time()
        last_memory_check = start_time
        
        while process.poll() is None:
            current_time = time.time()
            
            # Check memory every 30 seconds
            if current_time - last_memory_check >= 30:
                mem_mb, mem_percent = get_memory_usage()
                uptime = current_time - start_time
                log_message(f"Memory usage after {uptime:.0f}s: {mem_mb:.2f} MB ({mem_percent:.1f}%)")
                last_memory_check = current_time
            
            # Read output from the process
            if process.stdout:
                output = process.stdout.readline()
                if output:
                    print(output.strip())
            
            time.sleep(0.1)
        
        # Process has ended
        return_code = process.returncode
        log_message(f"Application ended with return code: {return_code}")
        
        if return_code != 0:
            log_message("Application crashed or was killed")
            return False
        
        return True
        
    except KeyboardInterrupt:
        log_message("Received interrupt signal, shutting down...")
        if 'process' in locals():
            process.terminate()
            process.wait()
        return True
    except Exception as e:
        log_message(f"Error starting application: {e}")
        return False

def main():
    """Main monitoring function"""
    log_message("=== Taberner Studio Application Monitor ===")
    
    # Check if we're in the right directory
    if not os.path.exists("backend/app.py"):
        log_message("Error: backend/app.py not found. Please run this script from the project root.")
        sys.exit(1)
    
    # Check system resources
    log_message("=== System Information ===")
    log_message(f"Python version: {sys.version}")
    log_message(f"Current directory: {os.getcwd()}")
    
    # Check available memory
    try:
        memory = psutil.virtual_memory()
        log_message(f"Total memory: {memory.total / 1024 / 1024 / 1024:.1f} GB")
        log_message(f"Available memory: {memory.available / 1024 / 1024 / 1024:.1f} GB")
        log_message(f"Memory usage: {memory.percent:.1f}%")
    except Exception as e:
        log_message(f"Error getting system memory: {e}")
    
    # Start the application
    success = start_app()
    
    if success:
        log_message("Application monitoring completed successfully")
    else:
        log_message("Application monitoring failed")
        sys.exit(1)

if __name__ == "__main__":
    main() 