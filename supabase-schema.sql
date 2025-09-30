-- TamanEdu Database Schema
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create grading_sessions table
CREATE TABLE IF NOT EXISTS grading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT CHECK (status IN ('draft', 'completed', 'archived')) DEFAULT 'draft'
);

-- Create answer_keys table
CREATE TABLE IF NOT EXISTS answer_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES grading_sessions(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    correct_answer TEXT NOT NULL,
    accepted_variants TEXT[] DEFAULT '{}',
    points DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, question_number)
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES grading_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    student_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    raw_answer TEXT NOT NULL,
    normalized_answer TEXT NOT NULL,
    ocr_confidence DECIMAL(3,2) NOT NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    page_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, question_number)
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned DECIMAL(5,2) NOT NULL,
    points_possible DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, question_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grading_sessions_teacher_id ON grading_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_answer_keys_session_id ON answer_keys(session_id);
CREATE INDEX IF NOT EXISTS idx_students_session_id ON students(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_student_id ON responses(student_id);
CREATE INDEX IF NOT EXISTS idx_responses_flagged ON responses(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);

-- Enable Row Level Security
ALTER TABLE grading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grading_sessions
CREATE POLICY "Teachers can view their own sessions" ON grading_sessions
    FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create sessions" ON grading_sessions
    FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own sessions" ON grading_sessions
    FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own sessions" ON grading_sessions
    FOR DELETE USING (auth.uid() = teacher_id);

-- RLS Policies for answer_keys
CREATE POLICY "Teachers can view answer keys for their sessions" ON answer_keys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = answer_keys.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create answer keys for their sessions" ON answer_keys
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = answer_keys.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update answer keys for their sessions" ON answer_keys
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = answer_keys.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete answer keys for their sessions" ON answer_keys
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = answer_keys.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

-- RLS Policies for students
CREATE POLICY "Teachers can view students in their sessions" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = students.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create students in their sessions" ON students
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = students.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update students in their sessions" ON students
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = students.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete students in their sessions" ON students
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM grading_sessions 
            WHERE grading_sessions.id = students.session_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

-- RLS Policies for responses
CREATE POLICY "Teachers can view responses for their students" ON responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = responses.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create responses for their students" ON responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = responses.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update responses for their students" ON responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = responses.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete responses for their students" ON responses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = responses.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

-- RLS Policies for grades
CREATE POLICY "Teachers can view grades for their students" ON grades
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = grades.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create grades for their students" ON grades
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = grades.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update grades for their students" ON grades
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = grades.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete grades for their students" ON grades
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM students 
            JOIN grading_sessions ON grading_sessions.id = students.session_id
            WHERE students.id = grades.student_id 
            AND grading_sessions.teacher_id = auth.uid()
        )
    );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('worksheets', 'worksheets', false),
    ('exports', 'exports', false);

-- Storage policies for worksheets bucket
CREATE POLICY "Teachers can upload worksheets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'worksheets' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Teachers can view their worksheets" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'worksheets' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Teachers can delete their worksheets" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'worksheets' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for exports bucket
CREATE POLICY "Teachers can upload exports" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'exports' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Teachers can view their exports" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'exports' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Teachers can delete their exports" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'exports' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_grading_sessions_updated_at BEFORE UPDATE ON grading_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

