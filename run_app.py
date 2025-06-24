#!/usr/bin/env python3
"""
Simple script to run the Taberner Studio Flask app with better process management.
This script checks for port conflicts and provides cleaner startup/shutdown.
"""

import os
import sys
import subprocess
import signal
import time
import psutil

def check_port_in_use(port):
    """Check if a port is already in use"""
    try:
        result = subprocess.run(['lsof', '-i', f':{port}'], 
                              capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except:
        return False

def kill_processes_on_port(port):
    """Kill any processes using the specified port"""
    try:
        result = subprocess.run(['lsof', '-ti', f':{port}'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                if pid:
                    print(f"Killing process {pid} on port {port}")
                    subprocess.run(['kill', '-9', pid], timeout=5)
            time.sleep(1)  # Give processes time to die
    except Exception as e:
        print(f"Warning: Could not kill processes on port {port}: {e}")

def main():
    port = 8000
    
    print("=== Taberner Studio App Launcher ===")
    print(f"Checking port {port}...")
    
    if check_port_in_use(port):
        print(f"Port {port} is in use. Attempting to kill existing processes...")
        kill_processes_on_port(port)
        
        if check_port_in_use(port):
            print(f"Port {port} is still in use. Please manually kill the process or use a different port.")
            return 1
    
    print(f"Port {port} is available. Starting Flask app...")
    
    # Change to the backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    
    # Start the Flask app
    try:
        print("Starting Flask development server...")
        print("Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Run the Flask app
        subprocess.run([sys.executable, 'app.py'], check=True)
        
    except KeyboardInterrupt:
        print("\nReceived interrupt signal. Shutting down gracefully...")
    except subprocess.CalledProcessError as e:
        print(f"Flask app exited with error: {e}")
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}")
        return 1
    
    print("Flask app stopped.")
    return 0

if __name__ == '__main__':
    sys.exit(main()) 