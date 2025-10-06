# MySQL Auto-Start Setup

This document explains how the automatic MySQL startup feature works in TamanEdu.

## Overview

The application now automatically checks and starts MySQL before running the development server or production server. This ensures that MySQL is always available when you start the app.

## How It Works

### Automatic Startup

When you run any of these commands, MySQL will be automatically started first:

```bash
npm run dev      # Development mode
npm run start    # Production mode
```

The system uses `predev` and `prestart` npm scripts that run before the main application starts.

### Manual MySQL Control

You can also control MySQL manually:

```bash
# Start MySQL only (without starting the app)
npm run mysql:start

# Alternative: Use the shell script directly (macOS/Linux only)
npm run mysql:start-sh
```

## Platform Support

### macOS (Darwin)
- Uses Homebrew services (`brew services`)
- Automatically detects if MySQL is installed via Homebrew
- Starts MySQL using `brew services start mysql`

### Linux
- Uses systemd (`systemctl`)
- Starts MySQL using `sudo systemctl start mysql`
- Requires sudo privileges for starting the service

### Windows
- Uses Windows Services (`sc` and `net`)
- Starts MySQL using `net start MySQL`
- Requires administrator privileges

## Files Created

### `/scripts/start-mysql.js`
- Cross-platform Node.js script
- Automatically detects your operating system
- Handles MySQL startup and connection testing
- Provides helpful error messages and setup instructions

### `/scripts/start-mysql.sh`
- macOS/Linux shell script alternative
- Faster execution for Unix-based systems
- Uses Homebrew services for MySQL management

### Updated `package.json`
- Added `predev` and `prestart` scripts
- Added manual MySQL control commands
- Ensures MySQL starts before the application

## Configuration

### Environment Variables

Make sure your `.env.local` file contains the correct MySQL configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tamanedu
```

### MySQL Setup

If you haven't set up MySQL yet:

1. **Install MySQL** (macOS with Homebrew):
   ```bash
   brew install mysql
   brew services start mysql
   mysql_secure_installation
   ```

2. **Create the database**:
   ```bash
   mysql -u root -p
   CREATE DATABASE tamanedu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Import the schema**:
   ```bash
   mysql -u root -p tamanedu < mysql-schema.sql
   ```

## Troubleshooting

### Common Issues

**"MySQL not found via Homebrew"**
- Install MySQL: `brew install mysql`
- Or use a different MySQL installation method

**"Failed to start MySQL"**
- Check if MySQL is already running: `brew services list | grep mysql`
- Restart MySQL: `brew services restart mysql`
- Check MySQL logs for errors

**"Connection failed"**
- Verify your `.env.local` configuration
- Test connection manually: `mysql -u root -p`
- Run `mysql_secure_installation` if needed

**"Permission denied" (Linux)**
- The script needs sudo to start MySQL service
- Consider adding your user to the mysql group
- Or start MySQL manually before running the app

### Manual Override

If the automatic startup causes issues, you can:

1. **Start MySQL manually** before running the app:
   ```bash
   # macOS
   brew services start mysql
   
   # Linux
   sudo systemctl start mysql
   
   # Windows
   net start MySQL
   ```

2. **Run the app without auto-start**:
   ```bash
   # Skip the predev script
   npx next dev
   
   # Or modify package.json to remove predev/prestart scripts
   ```

## Benefits

- ✅ **No more "MySQL not running" errors**
- ✅ **Automatic setup for new developers**
- ✅ **Cross-platform compatibility**
- ✅ **Helpful error messages and guidance**
- ✅ **Manual control when needed**

## Development Workflow

Your new development workflow:

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.local` from `env-example-mysql.txt`
4. **Start development**: `npm run dev`
   - MySQL starts automatically
   - Next.js development server starts
   - Ready to code! 🚀

No more manual MySQL management needed!
