#!/bin/bash

# MySQL Auto-Start Script for TamanEdu
# This script ensures MySQL is running before starting the application

echo "🔍 Checking MySQL status..."

# Check if MySQL is installed via Homebrew
if command -v brew &> /dev/null; then
    if brew services list | grep -q mysql; then
        echo "📦 MySQL found via Homebrew"
        
        # Check if MySQL service is running
        if brew services list | grep mysql | grep -q started; then
            echo "✅ MySQL is already running"
        else
            echo "🚀 Starting MySQL service..."
            brew services start mysql
            
            # Wait a moment for MySQL to start
            sleep 3
            
            # Verify MySQL is actually running
            if brew services list | grep mysql | grep -q started; then
                echo "✅ MySQL started successfully"
            else
                echo "❌ Failed to start MySQL"
                exit 1
            fi
        fi
    else
        echo "❌ MySQL not found via Homebrew"
        echo "Please install MySQL first:"
        echo "  brew install mysql"
        echo "  brew services start mysql"
        exit 1
    fi
else
    echo "❌ Homebrew not found"
    echo "Please install Homebrew first or start MySQL manually"
    exit 1
fi

# Test MySQL connection
echo "🔗 Testing MySQL connection..."
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "✅ MySQL connection successful"
else
    echo "⚠️  MySQL is running but connection failed"
    echo "You may need to set up MySQL password or check your configuration"
    echo "Run: mysql_secure_installation"
fi

echo "🎉 MySQL is ready!"
