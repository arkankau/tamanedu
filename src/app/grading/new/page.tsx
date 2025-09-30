'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface UploadedFile {
  file: File
  preview?: string
}

interface OCRResult {
  filename: string
  pageNumber: number
  answers: Array<{
    questionNumber: number
    rawAnswer: string
    normalizedAnswer: string
    confidence: number
    isFlagged: boolean
  }>
  error?: string
}

export default function NewGradingSessionPage() {
  const [step, setStep] = useState(1) // 1: Upload, 2: OCR Results, 3: Answer Key, 4: Grade
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([])
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const answerKeyInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    const newFiles: UploadedFile[] = selectedFiles.map(file => {
      const uploadedFile: UploadedFile = { file }
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(file)
      }
      
      return uploadedFile
    })
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      // Revoke object URL to prevent memory leaks
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleCreateSession = async () => {
    if (!title.trim()) {
      setError('Please enter a session title')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get current user
      const userResponse = await fetch('/api/auth/me')
      if (!userResponse.ok) {
        setError('Please log in to continue')
        return
      }
      const { user } = await userResponse.json()

      // Create grading session
      const sessionResponse = await fetch('/api/grading/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        setError(errorData.error || 'Failed to create grading session')
        return
      }

      const { session } = await sessionResponse.json()

      if (!session) {
        setError('Failed to create grading session')
        return
      }

      setSessionId(session.id)
      setStep(2)
      
      // Start OCR processing
      await processOCR(session.id)
      
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const processOCR = async (sessionId: string) => {
    if (files.length === 0) {
      setError('Please upload at least one file')
      return
    }

    setLoading(true)
    setOcrProgress(0)

    try {
      const formData = new FormData()
      files.forEach(({ file }) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'OCR processing failed')
      }

      const data = await response.json()
      setOcrResults(data.results)
      
      // Create students and responses from OCR results
      await createStudentsAndResponses(sessionId, data.results)
      
      setStep(3)
      
    } catch (err) {
      console.error('OCR error:', err)
      setError(err instanceof Error ? err.message : 'OCR processing failed')
    } finally {
      setLoading(false)
      setOcrProgress(0)
    }
  }

  const createStudentsAndResponses = async (sessionId: string, results: OCRResult[]) => {
    try {
      // For now, create one student per page/file
      // In a more advanced version, you'd allow teachers to assign pages to specific students
      const studentsToCreate = results.map((result, index) => ({
        session_id: sessionId,
        name: `Student ${index + 1}`,
        student_id: null
      }))

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .insert(studentsToCreate)
        .select()

      if (studentsError) {
        console.error('Error creating students:', studentsError)
        return
      }

      // Create responses for each student
      const responsesToCreate = []
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const student = students[i]
        
        if (result.answers) {
          for (const answer of result.answers) {
            responsesToCreate.push({
              student_id: student.id,
              question_number: answer.questionNumber,
              raw_answer: answer.rawAnswer,
              normalized_answer: answer.normalizedAnswer,
              ocr_confidence: answer.confidence,
              is_flagged: answer.isFlagged,
              page_number: result.pageNumber
            })
          }
        }
      }

      if (responsesToCreate.length > 0) {
        const { error: responsesError } = await supabase
          .from('responses')
          .insert(responsesToCreate)

        if (responsesError) {
          console.error('Error creating responses:', responsesError)
        }
      }
      
    } catch (err) {
      console.error('Error creating students and responses:', err)
    }
  }

  const handleAnswerKeyUpload = async () => {
    if (!answerKeyFile || !sessionId) {
      setError('Please select an answer key file')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', answerKeyFile)
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/answer-key/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload answer key')
      }

      setStep(4)
      
      // Start grading
      await startGrading()
      
    } catch (err) {
      console.error('Answer key upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload answer key')
    } finally {
      setLoading(false)
    }
  }

  const startGrading = async () => {
    if (!sessionId) return

    setLoading(true)

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Grading failed')
      }

      // Redirect to grading results
      router.push(`/grading/${sessionId}`)
      
    } catch (err) {
      console.error('Grading error:', err)
      setError(err instanceof Error ? err.message : 'Grading failed')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step >= stepNumber
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}
            >
              {step > stepNumber ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                stepNumber
              )}
            </div>
            {stepNumber < 4 && (
              <div
                className={`w-12 h-0.5 ${
                  step > stepNumber ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-2">
        <div className="flex space-x-12 text-sm">
          <span className={step >= 1 ? 'text-indigo-600' : 'text-gray-500'}>
            Upload
          </span>
          <span className={step >= 2 ? 'text-indigo-600' : 'text-gray-500'}>
            OCR
          </span>
          <span className={step >= 3 ? 'text-indigo-600' : 'text-gray-500'}>
            Answer Key
          </span>
          <span className={step >= 4 ? 'text-indigo-600' : 'text-gray-500'}>
            Grade
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Grading Session</h1>
          <p className="text-gray-600">Upload worksheets and create an answer key to start grading</p>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Session Details & File Upload */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Session Details</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Session Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Math Quiz - Chapter 5"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Additional notes about this grading session"
                />
              </div>
            </div>

            <h3 className="text-md font-medium text-gray-900 mb-4">Upload Worksheets</h3>
            
            {/* File Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, or PDF files up to 10MB each
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Uploaded Files ({files.length})
                </h4>
                <div className="space-y-2">
                  {files.map((uploadedFile, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {uploadedFile.file.type.startsWith('image/') ? (
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {uploadedFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(uploadedFile.file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {uploadedFile.preview && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Open preview in new tab
                              window.open(uploadedFile.preview, '_blank')
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCreateSession}
                disabled={loading || !title.trim() || files.length === 0}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Start OCR Processing'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: OCR Results */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">OCR Results</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto h-8 w-8 text-indigo-600" />
                <p className="mt-2 text-sm text-gray-600">Processing worksheets with OCR...</p>
                {ocrProgress > 0 && (
                  <div className="mt-4 max-w-xs mx-auto">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{Math.round(ocrProgress)}% complete</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {ocrResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{result.filename}</h3>
                      <span className="text-sm text-gray-500">Page {result.pageNumber}</span>
                    </div>
                    
                    {result.error ? (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span className="text-sm">{result.error}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Found {result.answers.length} answers
                        </p>
                        {result.answers.slice(0, 3).map((answer, answerIndex) => (
                          <div key={answerIndex} className="text-sm">
                            <span className="font-medium">Q{answer.questionNumber}:</span>{' '}
                            <span className={answer.isFlagged ? 'text-yellow-600' : 'text-gray-900'}>
                              {answer.rawAnswer}
                            </span>
                            {answer.isFlagged && (
                              <span className="ml-2 text-xs text-yellow-600">(Low confidence)</span>
                            )}
                          </div>
                        ))}
                        {result.answers.length > 3 && (
                          <p className="text-xs text-gray-500">
                            ...and {result.answers.length - 3} more answers
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Continue to Answer Key
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Answer Key Upload */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Upload Answer Key</h2>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with the correct answers. The file should have columns for question number and correct answer.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Example:</h4>
                <pre className="text-xs text-blue-800 font-mono">
{`question,answer
1,A
2,Paris|paris
3,42`}
                </pre>
                <p className="text-xs text-blue-700 mt-2">
                  Use | to separate accepted answer variants (e.g., "Paris|paris" accepts both "Paris" and "paris")
                </p>
              </div>
            </div>

            <div
              onClick={() => answerKeyInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer"
            >
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Click to upload answer key CSV
                </p>
                <p className="text-xs text-gray-500">
                  CSV files only
                </p>
              </div>
            </div>

            <input
              ref={answerKeyInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setAnswerKeyFile(file)
                }
              }}
              className="hidden"
            />

            {answerKeyFile && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {answerKeyFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(answerKeyFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back
              </button>
              <button
                onClick={handleAnswerKeyUpload}
                disabled={loading || !answerKeyFile}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Start Grading'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Grading in Progress */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto h-8 w-8 text-indigo-600" />
              <h2 className="mt-4 text-lg font-medium text-gray-900">Grading in Progress</h2>
              <p className="mt-2 text-sm text-gray-600">
                Matching student answers against the answer key...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

