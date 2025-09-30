# TamanEdu Auto-Grader MVP

A lightweight auto-grading tool for teachers to scan/upload student worksheets or tests, match answers against an answer key, and export results.

## 🎯 Features

- **OCR Processing**: Upload worksheet photos (JPG/PNG) or PDFs and extract student answers automatically
- **Answer Key Management**: Upload CSV answer keys with support for multiple accepted variants
- **Automatic Grading**: Match student answers against answer keys with intelligent text normalization
- **Confidence Flagging**: Flag low-confidence OCR results for manual review
- **Inline Editing**: Edit student answers directly in the results table and re-grade automatically
- **Export Options**: Export results as CSV (individual/summary) or PDF reports
- **Mobile-Friendly**: Responsive design that works on tablets and phones
- **Secure**: Row-level security with Supabase authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd tamanedu
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and keys
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create tables, policies, and storage buckets

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📖 User Guide

### Getting Started

1. **Sign Up**: Create a teacher account at `/auth/signup`
2. **Sign In**: Log in to access your dashboard
3. **Create Session**: Click "New Grading Session" to start

### Grading Workflow

#### Step 1: Upload Worksheets
- Upload photos (JPG, PNG) or PDF files of completed worksheets
- Multiple files supported for batch processing
- Each file represents one student's work

#### Step 2: OCR Processing
- The system automatically extracts text from uploaded images
- Answers are detected and confidence scores calculated
- Low-confidence answers (< 65%) are flagged for review

#### Step 3: Upload Answer Key
- Create a CSV file with correct answers
- Format: `question,answer`
- Support multiple accepted variants using `|` separator

Example CSV:
```csv
question,answer
1,A
2,Paris|paris|PARIS
3,42|forty-two
4,True|T|Yes
```

#### Step 4: Review Results
- View grading results in an interactive table
- Edit student answers inline by clicking the edit icon
- Flagged answers are highlighted in yellow
- Export results as CSV or PDF

### Answer Key Format

The answer key CSV should have these columns:
- `question` or `question_number`: Question number (1, 2, 3, etc.)
- `answer` or `correct_answer`: The correct answer
- `points` (optional): Points for this question (default: 1)

**Multiple Variants**: Use `|` to separate accepted answer variants:
- `Paris|paris` accepts both "Paris" and "paris"
- `True|T|Yes|1` accepts any of these as correct

### Text Normalization

The system automatically normalizes answers for comparison:
- Converts to lowercase
- Trims whitespace
- Removes diacritics/accents
- Removes punctuation
- Handles common variations

## 🛠️ Technical Details

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **OCR**: Tesseract.js (with optional Google Vision API)
- **Export**: Papa Parse (CSV), jsPDF (PDF)

### Database Schema

- `grading_sessions`: Grading session metadata
- `answer_keys`: Question answers and point values
- `students`: Student information per session
- `responses`: OCR-extracted student answers
- `grades`: Calculated grades per question

### API Routes

- `POST /api/ocr`: Process uploaded images with OCR
- `POST /api/answer-key/upload`: Upload and parse answer key CSV
- `POST /api/grade`: Calculate grades for a session
- `POST /api/export`: Export results as CSV or PDF

### Security Features

- Row Level Security (RLS) on all tables
- Teachers can only access their own data
- Secure file uploads with type validation
- Authentication required for all protected routes

## 🔧 Configuration

### OCR Provider

Set `OCR_PROVIDER` in your environment:
- `tesseract` (default): Uses Tesseract.js (free, runs in browser)
- `google-vision`: Uses Google Vision API (better accuracy, requires API key)

For Google Vision API, add these environment variables:
```env
OCR_PROVIDER=google-vision
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_service_account_private_key
```

### File Upload Limits

- Maximum file size: 10MB per file
- Supported formats: JPG, PNG, PDF
- Multiple files can be uploaded per session

## 📱 Mobile Support

The application is fully responsive and works on:
- Desktop computers
- Tablets (iPad, Android tablets)
- Mobile phones (iOS, Android)
- Low bandwidth connections

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔍 Troubleshooting

### Common Issues

**OCR not working properly:**
- Ensure images are clear and well-lit
- Try different image formats (PNG often works better than JPG)
- Check that text is not too small or blurry

**Database connection errors:**
- Verify Supabase URL and keys in `.env.local`
- Ensure database schema has been set up correctly
- Check Supabase project is not paused

**File upload failures:**
- Check file size (must be < 10MB)
- Verify file format is supported
- Ensure Supabase storage buckets are created

### Getting Help

1. Check the browser console for error messages
2. Verify environment variables are set correctly
3. Test with simple, clear images first
4. Check Supabase logs for database issues

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review Supabase documentation for database issues