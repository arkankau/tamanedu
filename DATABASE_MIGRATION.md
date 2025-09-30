# Database Migration Guide

This guide shows how to migrate TamanEdu from Supabase to other database systems.

## Option 1: PostgreSQL (Self-hosted)

### Setup
```bash
npm install pg @types/pg drizzle-orm drizzle-kit
```

### Database Configuration
```typescript
// src/lib/db-postgres.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool)
```

### Environment Variables
```env
DATABASE_URL=postgresql://username:password@localhost:5432/tamanedu
```

### Schema Migration
```sql
-- Convert supabase-schema.sql to remove Supabase-specific features:
-- Remove: auth.users references, RLS policies, storage buckets
-- Add: users table, file_uploads table

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rest of the schema remains the same, but replace auth.users with users
```

## Option 2: MySQL/MariaDB

### Setup
```bash
npm install mysql2 @types/mysql2 drizzle-orm drizzle-kit
```

### Database Configuration
```typescript
// src/lib/db-mysql.ts
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

export const db = drizzle(connection)
```

### Schema Conversion
```sql
-- Convert PostgreSQL to MySQL syntax:
-- UUID -> CHAR(36) or use AUTO_INCREMENT for IDs
-- TIMESTAMP WITH TIME ZONE -> TIMESTAMP
-- TEXT[] -> JSON
-- gen_random_uuid() -> UUID()

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grading_sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  teacher_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('draft', 'completed', 'archived') DEFAULT 'draft',
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Convert TEXT[] to JSON for accepted_variants
CREATE TABLE answer_keys (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id CHAR(36) NOT NULL,
  question_number INT NOT NULL,
  correct_answer TEXT NOT NULL,
  accepted_variants JSON DEFAULT ('[]'),
  points DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session_question (session_id, question_number)
);
```

## Option 3: SQLite (Lightweight)

### Setup
```bash
npm install better-sqlite3 @types/better-sqlite3 drizzle-orm drizzle-kit
```

### Database Configuration
```typescript
// src/lib/db-sqlite.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

const sqlite = new Database(process.env.DB_PATH || './tamanedu.db')
export const db = drizzle(sqlite)
```

### Schema for SQLite
```sql
-- SQLite schema (simplified)
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grading_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK (status IN ('draft', 'completed', 'archived')) DEFAULT 'draft',
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Use TEXT for JSON arrays in SQLite
CREATE TABLE answer_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  correct_answer TEXT NOT NULL,
  accepted_variants TEXT DEFAULT '[]', -- JSON string
  points REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, question_number)
);
```

## Option 4: MongoDB

### Setup
```bash
npm install mongodb mongoose @types/mongodb
```

### Database Configuration
```typescript
// src/lib/db-mongo.ts
import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!)
  } catch (error) {
    console.error('MongoDB connection error:', error)
  }
}

export default connectDB
```

### Mongoose Schemas
```typescript
// src/lib/schemas-mongo.ts
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const gradingSessionSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['draft', 'completed', 'archived'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const answerKeySchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GradingSession', required: true },
  questionNumber: { type: Number, required: true },
  correctAnswer: { type: String, required: true },
  acceptedVariants: [String],
  points: { type: Number, default: 1.0 },
  createdAt: { type: Date, default: Date.now }
})

export const User = mongoose.model('User', userSchema)
export const GradingSession = mongoose.model('GradingSession', gradingSessionSchema)
export const AnswerKey = mongoose.model('AnswerKey', answerKeySchema)
```

## Code Changes Required

### 1. Authentication
Replace Supabase Auth with:
- **NextAuth.js** (supports multiple providers)
- **Custom JWT implementation**
- **Passport.js**
- **Auth0**

### 2. File Storage
Replace Supabase Storage with:
- **AWS S3**
- **Google Cloud Storage**
- **Local file system**
- **Cloudinary**

### 3. Database Queries
Replace Supabase client calls with your chosen database client:

```typescript
// Before (Supabase)
const { data, error } = await supabase
  .from('grading_sessions')
  .select('*')
  .eq('teacher_id', userId)

// After (PostgreSQL with Drizzle)
const data = await db
  .select()
  .from(gradingSessions)
  .where(eq(gradingSessions.teacherId, userId))

// After (MongoDB with Mongoose)
const data = await GradingSession.find({ teacherId: userId })
```

## Migration Steps

1. **Choose your database**
2. **Set up the new database**
3. **Install required packages**
4. **Convert the schema**
5. **Update database configuration**
6. **Replace authentication system**
7. **Update all database queries**
8. **Set up file storage**
9. **Test thoroughly**

## Recommendations by Use Case

- **Small school/personal use**: SQLite
- **Medium school**: PostgreSQL or MySQL
- **Large organization**: PostgreSQL with proper hosting
- **Cloud-first**: PlanetScale, Neon, or MongoDB Atlas
- **Existing infrastructure**: Match your current database
- **Rapid prototyping**: Keep Supabase (it's excellent!)

Each option has trade-offs in complexity, cost, and features. Supabase provides auth, database, and storage in one package, so switching means implementing these separately.

