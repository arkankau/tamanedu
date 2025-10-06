#!/usr/bin/env node

/**
 * Cross-platform MySQL Auto-Start Script for TamanEdu
 * This script ensures MySQL is running before starting the application
 */

const { spawn, exec } = require('child_process');
const os = require('os');

const platform = os.platform();

console.log('🔍 Checking MySQL status...');

function checkAndStartMySQL() {
  return new Promise((resolve, reject) => {
    if (platform === 'darwin') {
      // macOS - Check Homebrew MySQL
      exec('brew services list | grep mysql', (error, stdout) => {
        if (error) {
          console.log('❌ MySQL not found via Homebrew');
          console.log('Please install MySQL first:');
          console.log('  brew install mysql');
          console.log('  brew services start mysql');
          reject(new Error('MySQL not installed'));
          return;
        }

        if (stdout.includes('started')) {
          console.log('✅ MySQL is already running');
          testConnection().then(resolve).catch(reject);
        } else {
          console.log('🚀 Starting MySQL service...');
          exec('brew services start mysql', (startError) => {
            if (startError) {
              console.log('❌ Failed to start MySQL:', startError.message);
              reject(startError);
              return;
            }

            console.log('✅ MySQL started successfully');
            // Wait a moment for MySQL to fully start
            setTimeout(() => {
              testConnection().then(resolve).catch(reject);
            }, 3000);
          });
        }
      });
    } else if (platform === 'linux') {
      // Linux - Check systemd
      exec('systemctl is-active mysql', (error, stdout) => {
        if (stdout.trim() === 'active') {
          console.log('✅ MySQL is already running');
          testConnection().then(resolve).catch(reject);
        } else {
          console.log('🚀 Starting MySQL service...');
          exec('sudo systemctl start mysql', (startError) => {
            if (startError) {
              console.log('❌ Failed to start MySQL:', startError.message);
              reject(startError);
              return;
            }

            console.log('✅ MySQL started successfully');
            setTimeout(() => {
              testConnection().then(resolve).catch(reject);
            }, 3000);
          });
        }
      });
    } else if (platform === 'win32') {
      // Windows - Check Windows Service
      exec('sc query MySQL', (error, stdout) => {
        if (stdout.includes('RUNNING')) {
          console.log('✅ MySQL is already running');
          testConnection().then(resolve).catch(reject);
        } else {
          console.log('🚀 Starting MySQL service...');
          exec('net start MySQL', (startError) => {
            if (startError) {
              console.log('❌ Failed to start MySQL:', startError.message);
              reject(startError);
              return;
            }

            console.log('✅ MySQL started successfully');
            setTimeout(() => {
              testConnection().then(resolve).catch(reject);
            }, 3000);
          });
        }
      });
    } else {
      console.log('❌ Unsupported platform:', platform);
      console.log('Please start MySQL manually before running the application');
      reject(new Error('Unsupported platform'));
    }
  });
}

function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔗 Testing MySQL connection...');
    
    // Try to connect without password first (common for development)
    const mysql = spawn('mysql', ['-u', 'root', '-e', 'SELECT 1;'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    mysql.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mysql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mysql.on('close', (code) => {
      if (code === 0) {
        console.log('✅ MySQL connection successful');
        resolve();
      } else {
        console.log('⚠️  MySQL is running but connection failed');
        console.log('You may need to set up MySQL password or check your configuration');
        console.log('Run: mysql_secure_installation');
        // Don't reject here - MySQL might be running but require password
        resolve();
      }
    });
  });
}

// Main execution
checkAndStartMySQL()
  .then(() => {
    console.log('🎉 MySQL is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MySQL setup failed:', error.message);
    console.log('\n📋 Manual setup instructions:');
    console.log('1. Install MySQL on your system');
    console.log('2. Start MySQL service');
    console.log('3. Configure your .env.local file with correct database credentials');
    console.log('4. Run the application again');
    console.log('\n⚠️  Continuing without MySQL - some features may not work');
    console.log('💡 The app will start but database operations will fail until MySQL is set up');
    process.exit(0); // Exit with success so the app can still start
  });
