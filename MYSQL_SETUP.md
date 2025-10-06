# TamanEdu MySQL Setup Guide

This guide will help you set up TamanEdu with MySQL instead of Supabase.

## Prerequisites

- Node.js 18+
- MySQL 8.0+ or MariaDB 10.5+
- Basic command line knowledge

## Step 1: Install MySQL

### Option A: MySQL Server (Recommended)

**On macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**On Windows:**
Download MySQL installer from [mysql.com](https://dev.mysql.com/downloads/installer/)

### Option B: Using Docker (Easy for development)

```bash
# Run MySQL in Docker
docker run --name tamanedu-mysql \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=tamanedu \
  -p 3306:3306 \
  -d mysql:8.0

# Or using docker-compose (create docker-compose.yml):
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: tamanedu-mysql
    environment:
      MYSQL_ROOT_PASSWORD: yourpassword
      MYSQL_DATABASE: tamanedu
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## Step 2: Create Database and User

Connect to MySQL and create the database:

```bash
# Connect to MySQL
mysql -u root -p

# Or if using Docker:
docker exec -it tamanedu-mysql mysql -u root -p
```

Run these SQL commands:

```sql
-- Create database
CREATE DATABASE tamanedu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional - for better security)
CREATE USER 'tamanedu_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON tamanedu.* TO 'tamanedu_user'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE tamanedu;
```

## Step 3: Run Database Schema

Copy and paste the contents of `mysql-schema.sql` into your MySQL client:

```bash
# If you have the mysql command line client:
mysql -u root -p tamanedu < mysql-schema.sql

# Or copy-paste the contents manually in your MySQL client
```

This will create all the necessary tables, indexes, and a default admin user.

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=tamanedu

# JWT Authentication (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random

# OCR Configuration
OCR_PROVIDER=tesseract

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,text/csv

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important Security Notes:**
- Change the `JWT_SECRET` to a long, random string
- Use a strong MySQL password
- For production, create a dedicated MySQL user with limited privileges

## Step 5: Install Dependencies and Run

The MySQL dependencies should already be installed. If not:

```bash
npm install mysql2 bcryptjs jsonwebtoken multer @types/bcryptjs @types/jsonwebtoken @types/multer
```

Start the application:

```bash
npm run dev
```

## Step 6: Test the Setup

1. **Visit the application**: Go to `http://localhost:3000`
2. **Create an account**: Click "Sign Up" and create a test account
3. **Test login**: Log in with your new account
4. **Create a grading session**: Try the complete workflow

## Database Management

### Useful MySQL Commands

```sql
-- Check if tables were created
SHOW TABLES;

-- Check users
SELECT id, email, created_at FROM users;

-- Check grading sessions
SELECT * FROM grading_sessions;

-- Reset database (if needed)
DROP DATABASE tamanedu;
CREATE DATABASE tamanedu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Then run the schema again
```

### Backup and Restore

```bash
# Backup
mysqldump -u root -p tamanedu > tamanedu_backup.sql

# Restore
mysql -u root -p tamanedu < tamanedu_backup.sql
```

## Production Deployment

### Security Checklist

- [ ] Use a strong, unique JWT secret
- [ ] Create a dedicated MySQL user with minimal privileges
- [ ] Enable MySQL SSL connections
- [ ] Use environment variables for all secrets
- [ ] Set up regular database backups
- [ ] Configure MySQL firewall rules
- [ ] Use HTTPS in production

### Recommended MySQL Configuration

Add to your MySQL configuration file (`my.cnf` or `my.ini`):

```ini
[mysqld]
# Security
bind-address = 127.0.0.1
skip-networking = false
ssl-ca = /path/to/ca.pem
ssl-cert = /path/to/server-cert.pem
ssl-key = /path/to/server-key.pem

# Performance
innodb_buffer_pool_size = 256M
max_connections = 100
query_cache_size = 64M

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

### Hosting Options

**Managed MySQL Services:**
- **AWS RDS MySQL**
- **Google Cloud SQL**
- **DigitalOcean Managed Databases**
- **PlanetScale** (MySQL-compatible)

**Self-hosted:**
- **DigitalOcean Droplets**
- **AWS EC2**
- **Linode**
- **Vultr**

## Troubleshooting

### Common Issues

**"Connection refused" error:**
- Check if MySQL is running: `sudo systemctl status mysql`
- Verify port 3306 is open
- Check firewall settings

**"Access denied" error:**
- Verify username and password in `.env.local`
- Check MySQL user privileges
- Ensure user can connect from your host

**"Database doesn't exist" error:**
- Create the database: `CREATE DATABASE tamanedu;`
- Check database name in `.env.local`

**"Table doesn't exist" error:**
- Run the schema: `mysql -u root -p tamanedu < mysql-schema.sql`
- Check if all tables were created: `SHOW TABLES;`

**File upload errors:**
- Check `UPLOAD_DIR` permissions
- Ensure the uploads directory exists
- Verify file size limits

### Performance Issues

**Slow queries:**
- Check MySQL slow query log
- Add indexes for frequently queried columns
- Optimize database configuration

**Memory issues:**
- Adjust `innodb_buffer_pool_size`
- Monitor MySQL memory usage
- Consider upgrading server resources

## Migration from Supabase

If you're migrating from the Supabase version:

1. **Export Supabase data** (if you have existing data)
2. **Set up MySQL** following this guide
3. **Import data** into MySQL tables
4. **Update environment variables**
5. **Test all functionality**

The application code has been updated to work with MySQL, so no code changes should be needed.

## Support

If you encounter issues:

1. Check the MySQL error logs
2. Verify all environment variables are set correctly
3. Test database connection manually
4. Check file permissions for uploads directory
5. Review the application logs in the browser console

## Next Steps

Once MySQL is working:

1. **Set up backups**: Implement regular database backups
2. **Monitor performance**: Set up MySQL monitoring
3. **Scale as needed**: Consider read replicas for high traffic
4. **Security hardening**: Follow MySQL security best practices

Your TamanEdu application is now running on MySQL! 🎉









