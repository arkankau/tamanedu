# TamanEdu Setup Guide

This guide will walk you through setting up TamanEdu Auto-Grader from scratch.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18 or higher** installed on your computer
- **npm** (comes with Node.js) or **yarn** package manager
- A **Supabase account** (free at [supabase.com](https://supabase.com))
- Basic familiarity with the command line

## Step 1: Project Setup

### 1.1 Download the Project

If you received this as a ZIP file:
```bash
# Extract the ZIP file and navigate to the folder
cd tamanedu
```

If you're cloning from Git:
```bash
git clone <repository-url>
cd tamanedu
```

### 1.2 Install Dependencies

```bash
npm install
```

This will install all the required packages including Next.js, Supabase, OCR libraries, and UI components.

## Step 2: Supabase Setup

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: TamanEdu (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your location
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

### 2.2 Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **Project API Keys** → **anon public** key
   - **Project API Keys** → **service_role** key (keep this secret!)

### 2.3 Set Up Environment Variables

1. In your project folder, create a file called `.env.local`
2. Add your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OCR Configuration
OCR_PROVIDER=tesseract

# Optional: Google Vision API (for better OCR)
# GOOGLE_PROJECT_ID=your_google_project_id
# GOOGLE_CLIENT_EMAIL=your_google_client_email
# GOOGLE_PRIVATE_KEY=your_google_private_key
```

**Important**: Replace the placeholder values with your actual Supabase credentials.

## Step 3: Database Setup

### 3.1 Create the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the `supabase-schema.sql` file from your project folder
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** to execute the SQL

This will create:
- All necessary database tables
- Row Level Security policies
- Storage buckets for file uploads
- Indexes for better performance

### 3.2 Verify the Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see these tables:
   - `grading_sessions`
   - `answer_keys`
   - `students`
   - `responses`
   - `grades`

3. Go to **Storage** and verify these buckets exist:
   - `worksheets`
   - `exports`

## Step 4: Test the Application

### 4.1 Start the Development Server

```bash
npm run dev
```

You should see output like:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.3s
```

### 4.2 Open the Application

1. Open your web browser
2. Go to `http://localhost:3000`
3. You should see the TamanEdu landing page

### 4.3 Test User Registration

1. Click "Get Started" or "Sign Up"
2. Create a test account with your email
3. Check your email for a confirmation link
4. Click the confirmation link
5. You should be redirected to the dashboard

## Step 5: Test the Grading Flow

### 5.1 Create a Test Session

1. In the dashboard, click "New Grading Session"
2. Enter a title like "Test Math Quiz"
3. Upload a test image (you can use any image with text for testing)
4. Wait for OCR processing to complete

### 5.2 Create a Test Answer Key

Create a simple CSV file called `test-answers.csv`:
```csv
question,answer
1,A
2,B
3,C
```

Upload this file as your answer key.

### 5.3 Review Results

1. Check that the grading completed successfully
2. Try editing a student answer in the results table
3. Test the export functionality (CSV and PDF)

## Step 6: Production Deployment (Optional)

### 6.1 Deploy to Vercel

1. Push your code to GitHub (create a repository)
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" and import your GitHub repository
4. Add your environment variables in the Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add all the variables from your `.env.local` file
5. Deploy the project

### 6.2 Update Supabase Settings

1. In your Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add your Vercel domain to the allowed redirect URLs:
   - `https://your-app.vercel.app/auth/callback`

## Troubleshooting

### Common Issues and Solutions

**"Failed to connect to Supabase"**
- Check that your environment variables are correct
- Ensure there are no extra spaces in your `.env.local` file
- Verify your Supabase project is active (not paused)

**"Database schema not found"**
- Make sure you ran the SQL schema from `supabase-schema.sql`
- Check the SQL Editor for any error messages
- Verify all tables were created in the Table Editor

**"OCR not working"**
- Try with a clear, high-contrast image
- Ensure the image contains readable text
- Check the browser console for error messages

**"File upload failed"**
- Check that storage buckets were created
- Verify file size is under 10MB
- Ensure file format is JPG, PNG, or PDF

**"Authentication not working"**
- Check your Supabase URL and anon key
- Verify email confirmation if required
- Check Supabase Auth settings

### Getting More Help

1. **Check the logs**: Look at the browser console and Supabase logs
2. **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
3. **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)

## Next Steps

Once everything is working:

1. **Customize the UI**: Modify colors, fonts, and layout in the Tailwind CSS classes
2. **Add more features**: Implement additional grading rules or export formats
3. **Improve OCR**: Set up Google Vision API for better text recognition
4. **Scale up**: Configure for multiple teachers and classes

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your service role key secret
- Use strong passwords for your Supabase project
- Enable 2FA on your Supabase account for production use

## Support

If you encounter issues during setup:

1. Double-check each step in this guide
2. Verify all environment variables are correct
3. Check that your Supabase project is properly configured
4. Test with simple, clear images first

The application is designed to be teacher-friendly and should work well even for users with limited technical experience once properly set up.

