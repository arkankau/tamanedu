# TamanEdu Auto-Grader MVP

An AI-powered auto-grading tool for teachers to scan/upload student worksheets or tests, match answers against an answer key, and export results. Now powered by **Reka AI** for intelligent, vision-based grading.

## 🎯 Features

- **🤖 AI Vision Processing**: Upload worksheet photos (JPG/PNG) and extract student answers using advanced LLM vision
- **💡 Intelligent Grading**: Smart answer matching with semantic understanding (synonyms, variations, context)
- **📝 Answer Key Management**: Upload CSV answer keys with support for multiple accepted variants
- **🎯 High Accuracy**: Better than traditional OCR - understands handwriting and context
- **⚠️ Confidence Flagging**: Flag low-confidence answers for manual review
- **✏️ Inline Editing**: Edit student answers directly in the results table and re-grade automatically
- **📊 Export Options**: Export results as CSV (individual/summary) or PDF reports
- **📱 Mobile-Friendly**: Responsive design that works on tablets and phones
- **🔒 Secure**: Row-level security with MySQL authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Reka AI API key ([Get one here](https://www.reka.ai/))
- ChromaDB Cloud account (pre-configured in the app)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd tamanedu
npm install
```

### 2. Set Up Environment Variables

Copy `env-example-mysql.txt` to `.env.local` and configure:

```env
# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Reka AI API
REKA_API_KEY=your-reka-api-key-here

# ChromaDB Cloud (pre-configured in the app)
# No additional setup needed!
```

### 3. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🤖 AI-Powered Grading

TamanEdu uses **Reka AI's vision model** for intelligent grading:

- **Vision-based answer extraction** - No more OCR errors
- **Semantic understanding** - Recognizes answer variations and synonyms
- **Smart grading** - Understands context and intent
- **High accuracy** - Better than traditional OCR methods

See [LLM_GRADING.md](./LLM_GRADING.md) for detailed documentation.

## 📖 User Guide

### Getting Started

1. **Sign Up**: Create a teacher account at `/auth/signup`
2. **Sign In**: Log in to access your dashboard
3. **Create Session**: Click "New Grading Session" to start

### Grading Workflow

#### Step 1: Create Session & Upload Answer Key
- Enter session title and description
- Upload CSV answer key with correct answers
- Format: `question,answer`
- Support multiple accepted variants using `|` separator

Example CSV:
```csv
question,answer
1,A
2,Paris|paris|Paris, France
3,42|forty-two
4,True|T|Yes
```

#### Step 2: Upload Student Worksheets
- Upload photos (JPG, PNG) of completed worksheets
- Multiple files supported for batch processing
- Each file represents one student's work

#### Step 3: AI Answer Extraction
- Reka AI automatically extracts answers from images
- Uses vision model to understand handwriting and typed text
- Provides confidence scores for each answer
- Low-confidence answers are flagged for review

#### Step 4: AI Grading
- LLM intelligently grades each answer
- Understands synonyms, variations, and context
- Provides explanations for grading decisions
- View results in interactive table

#### Step 5: Review & Export
- Review grading results
- Edit answers inline if needed
- Export as CSV or PDF reports

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

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS
- **Backend**: Next.js API routes
- **Database**: ChromaDB Cloud (vector database)
- **Authentication**: JWT-based auth
- **AI**: Reka AI (Vision + LLM)
- **Export**: Papa Parse (CSV), jsPDF (PDF)

### ChromaDB Collections

- `users`: User accounts and authentication
- `grading_sessions`: Grading session metadata
- `answer_keys`: Question answers and point values
- `students`: Student information per session
- `responses`: AI-extracted student answers
- `grades`: Calculated grades per question

See [CHROMADB_MIGRATION.md](./CHROMADB_MIGRATION.md) for details.

### API Routes

- `POST /api/ocr`: Extract answers from images using Reka AI vision
- `POST /api/answer-key/upload`: Upload and parse answer key CSV
- `POST /api/grade`: Grade answers using Reka AI LLM
- `POST /api/export`: Export results as CSV or PDF
- `POST /api/auth/*`: Authentication endpoints

### Security Features

- JWT-based authentication
- Teachers can only access their own data
- Secure file uploads with type validation
- Authentication required for all protected routes
- Password hashing with bcrypt

## 🔧 Configuration

### Reka AI Setup

1. Get API key from [https://www.reka.ai/](https://www.reka.ai/)
2. Add to `.env.local`:
```env
REKA_API_KEY=your-reka-api-key-here
```

### Performance Settings

- **Model**: Reka Flash (optimized for speed and accuracy)
- **Temperature**: 0.1 (low for consistent grading)
- **Max Tokens**: 2000 per request

### File Upload Limits

- Maximum file size: 10MB per file
- Supported formats: JPG, PNG
- Multiple files can be uploaded per session
- Each file = one student worksheet

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

**"REKA_API_KEY not set" error:**
- Add `REKA_API_KEY` to your `.env.local` file
- Restart the development server
- Verify API key is valid

**AI extraction not working:**
- Ensure images are clear and well-lit
- Check that answer key is uploaded first
- Verify Reka API has sufficient quota

**Database connection errors:**
- Check internet connection (ChromaDB is cloud-hosted)
- Verify Reka API key is correct (used for ChromaDB too)
- Check ChromaDB Cloud status
- Ensure collections are created automatically

**File upload failures:**
- Check file size (must be < 10MB)
- Verify file format is supported (JPG, PNG only)
- Ensure upload directory exists

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