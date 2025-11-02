'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface UploadedFile {
  file: File
  preview?: string
}

interface ExtractionResult {
  filename: string
  pageNumber: number
  answers: Array<{
    questionNumber: number
    extractedAnswer: string
    confidence: number
  }>
  error?: string
}

interface RubricCriterion {
  id: string
  name: string
  weight: number
  description: string
  anchors: string[]
  penalties: Array<{
    reason: string
    points: number
  }>
}

interface Rubric {
  criteria: RubricCriterion[]
  totalPoints: number
}

type SectionType = 'mcq' | 'short_answer' | 'essay'

export default function NewGradingSessionPage() {
  // Steps (branching):
  // 1: Choose Type + Config (answer key OR rubric)
  // 2: Upload Worksheets
  // 3: Extract Answers
  // 4: Grade
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [extractionResults, setExtractionResults] = useState<ExtractionResult[]>([])
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null)
  const [sectionType, setSectionType] = useState<SectionType | null>(null)
  const [rubric, setRubric] = useState<Rubric | null>(null)
  const [generatingRubric, setGeneratingRubric] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [extractionProgress, setExtractionProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const answerKeyInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Rubric management functions
  const addCriterion = () => {
    const newCriterion: RubricCriterion = {
      id: `criterion-${Date.now()}`,
      name: '',
      weight: 0,
      description: '',
      anchors: [''],
      penalties: []
    }
    setRubric(prev => ({
      ...prev,
      criteria: [...prev.criteria, newCriterion]
    }))
  }

  const removeCriterion = (id: string) => {
    setRubric(prev => ({
      ...prev,
      criteria: prev.criteria.filter(c => c.id !== id)
    }))
  }

  const updateCriterion = (id: string, field: keyof RubricCriterion, value: any) => {
    setRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }))
  }

  const addAnchor = (criterionId: string) => {
    updateCriterion(criterionId, 'anchors', [
      ...rubric.criteria.find(c => c.id === criterionId)!.anchors,
      ''
    ])
  }

  const removeAnchor = (criterionId: string, index: number) => {
    const criterion = rubric.criteria.find(c => c.id === criterionId)!
    updateCriterion(
      criterionId,
      'anchors',
      criterion.anchors.filter((_, i) => i !== index)
    )
  }

  const updateAnchor = (criterionId: string, index: number, value: string) => {
    const criterion = rubric.criteria.find(c => c.id === criterionId)!
    const newAnchors = [...criterion.anchors]
    newAnchors[index] = value
    updateCriterion(criterionId, 'anchors', newAnchors)
  }

  const addPenalty = (criterionId: string) => {
    const criterion = rubric.criteria.find(c => c.id === criterionId)!
    updateCriterion(criterionId, 'penalties', [
      ...criterion.penalties,
      { reason: '', points: 0 }
    ])
  }

  const removePenalty = (criterionId: string, index: number) => {
    const criterion = rubric.criteria.find(c => c.id === criterionId)!
    updateCriterion(
      criterionId,
      'penalties',
      criterion.penalties.filter((_, i) => i !== index)
    )
  }

  const updatePenalty = (criterionId: string, index: number, field: 'reason' | 'points', value: any) => {
    const criterion = rubric!.criteria.find(c => c.id === criterionId)!
    const newPenalties = [...criterion.penalties]
    newPenalties[index] = { ...newPenalties[index], [field]: value }
    updateCriterion(criterionId, 'penalties', newPenalties)
  }

  const downloadRubric = () => {
    if (!rubric) return
    
    const rubricJSON = JSON.stringify(rubric, null, 2)
    const blob = new Blob([rubricJSON], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rubric-${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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

  const handleCreateSessionAndAnswerKey = async () => {
    if (!title.trim()) {
      setError('Please enter a session title')
      return
    }
    if (!sectionType) {
      setError('Please choose a section type')
      return
    }
    // For MCQ/Short Answer we require an answer key; for Essay we require rubric JSON
    if ((sectionType === 'mcq' || sectionType === 'short_answer') && !answerKeyFile) {
      setError('Please upload an answer key')
      return
    }
    // For essay, rubric will be generated after worksheet upload, so no validation here

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
      
      // Branching config upload
      if (sectionType === 'mcq' || sectionType === 'short_answer') {
        const formData = new FormData()
        formData.append('file', answerKeyFile as File)
        formData.append('sessionId', session.id)
        formData.append('type', sectionType)
        const answerKeyResponse = await fetch('/api/answer-key/upload', {
          method: 'POST',
          body: formData
        })
        if (!answerKeyResponse.ok) {
          const errorData = await answerKeyResponse.json()
          throw new Error(errorData.error || 'Failed to upload answer key')
        }
      } else {
        // Essay: rubric will be AI-generated after worksheet upload in Step 2
        console.log('Essay grading session created, rubric will be generated from student answers')
      }

      setStep(2)
      
    } catch (err) {
      console.error('Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const generateRubricFromEssays = async (extractedEssays: ExtractionResult[]) => {
    setGeneratingRubric(true)
    try {
      // Collect all essay texts
      const essayTexts = extractedEssays
        .filter(result => !result.error)
        .map(result => result.answers.map(a => a.extractedAnswer).join(' '))
        .filter(text => text.trim().length > 0)

      if (essayTexts.length === 0) {
        throw new Error('No essay content extracted')
      }

      // Call LLM to generate rubric
      const response = await fetch('/api/rubric/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayTexts,
          sessionId,
          prompt: description || title
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate rubric')
      }

      const { rubric: generatedRubric } = await response.json()
      setRubric(generatedRubric)
    } catch (err) {
      console.error('Rubric generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate rubric')
    } finally {
      setGeneratingRubric(false)
    }
  }

  const processWorksheets = async () => {
    if (files.length === 0) {
      setError('Please upload at least one file')
      return
    }

    if (!sessionId) {
      setError('Session not created')
      return
    }

    setLoading(true)
    setExtractionProgress(0)

    try {
      const formData = new FormData()
      files.forEach(({ file }) => {
        formData.append('files', file)
      })
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Answer extraction failed')
      }

      const data = await response.json()
      setExtractionResults(data.results)
      
      // Create students and responses from extracted answers
      await createStudentsAndResponses(sessionId, data.results)
      
      // For essay type, generate rubric from extracted content
      if (sectionType === 'essay') {
        await generateRubricFromEssays(data.results)
      }
      
      setStep(3)
      
    } catch (err) {
      console.error('Extraction error:', err)
      setError(err instanceof Error ? err.message : 'Answer extraction failed')
    } finally {
      setLoading(false)
      setExtractionProgress(0)
    }
  }

  const createStudentsAndResponses = async (sessionId: string, results: ExtractionResult[]) => {
    try {
      // Create one student per worksheet/file
      const studentsToCreate = results.map((result, index) => ({
        session_id: sessionId,
        name: `Student ${index + 1}`,
        student_id: null
      }))

      // Call API to create students
      const studentsResponse = await fetch('/api/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: studentsToCreate }),
      })

      if (!studentsResponse.ok) {
        console.error('Error creating students:', await studentsResponse.text())
        return
      }

      const studentsResult = await studentsResponse.json()
      const students = studentsResult.data || []

      // Create responses for each student based on extracted answers
      const responsesToCreate = []
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const student = students[i]
        
        if (!student) {
          console.warn(`No student found for index ${i}`)
          continue
        }
        
        if (result.answers && result.answers.length > 0) {
          for (const answer of result.answers) {
            responsesToCreate.push({
              student_id: student.id,
              question_number: answer.questionNumber || 1,
              raw_answer: answer.extractedAnswer || 'NO_ANSWER',
              normalized_answer: answer.extractedAnswer || 'NO_ANSWER',
              ocr_confidence: answer.confidence || 0,
              is_flagged: answer.confidence < 0.7,
              page_number: result.pageNumber
            })
          }
        }
      }

      if (responsesToCreate.length > 0) {
        const responsesResponse = await fetch('/api/responses/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ responses: responsesToCreate }),
        })

        if (!responsesResponse.ok) {
          console.error('Error creating responses:', await responsesResponse.text())
        }
      }
      
    } catch (err) {
      console.error('Error creating students and responses:', err)
    }
  }

  const handleContinueToGrading = async () => {
    if (!sessionId) {
      setError('Session not found')
      return
    }

    setLoading(true)
    setError('')

    try {
      setStep(4)
      
      // Start LLM-based grading
      await startGrading()
      
    } catch (err) {
      console.error('Grading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start grading')
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
        body: JSON.stringify({ sessionId, sectionType })
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
                  ? 'bg-[#A91B6F] border-[#A91B6F] text-white'
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
                  step > stepNumber ? 'bg-[#A91B6F]' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-2">
        <div className="flex space-x-8 text-sm">
          <span className={step >= 1 ? 'text-[#A91B6F]' : 'text-gray-500'}>
            Configure
          </span>
          <span className={step >= 2 ? 'text-[#A91B6F]' : 'text-gray-500'}>
            Upload
          </span>
          <span className={step >= 3 ? 'text-[#A91B6F]' : 'text-gray-500'}>
            Extract
          </span>
          <span className={step >= 4 ? 'text-[#A91B6F]' : 'text-gray-500'}>
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

        {/* Step 1: Choose Section Type + Config */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Session Details & Section Configuration</h2>
            
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

            {/* Section Type Selector */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Section Type *</p>
              <div className="grid grid-cols-3 gap-3">
                {(['mcq','short_answer','essay'] as SectionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSectionType(t)}
                    className={`px-3 py-2 rounded-md border text-sm ${
                      sectionType === t
                        ? 'border-[#A91B6F] bg-pink-50 text-[#A91B6F]'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {t === 'mcq' ? 'MCQ' : t === 'short_answer' ? 'Short Answer' : 'Essay'}
                  </button>
                ))}
              </div>
            </div>

            {/* Config based on section type */}
            {(sectionType === 'mcq' || sectionType === 'short_answer') && (
              <>
                <h3 className="text-md font-medium text-gray-900 mb-4">Upload Answer Key *</h3>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Upload an Answer Key file (.csv or .json). CSV should include columns: question, answer. JSON should follow your key schema.
                  </p>
                </div>
                {/* Answer Key Upload Area */}
                <div
                  onClick={() => answerKeyInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer"
                >
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      Click to upload answer key (.csv, .json)
                    </p>
                  </div>
                </div>
                <input
                  ref={answerKeyInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setAnswerKeyFile(file)
                  }}
                  className="hidden"
                />
                {answerKeyFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{answerKeyFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(answerKeyFile.size)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {sectionType === 'essay' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-md font-medium text-blue-900 mb-2">AI-Powered Rubric Generation</h3>
                  <p className="text-sm text-blue-800">
                    After you upload student essays, our AI will analyze them and automatically generate a data-driven rubric with:
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 ml-4 list-disc space-y-1">
                    <li>Criteria based on what students actually wrote</li>
                    <li>Score tiers anchored to real student responses</li>
                    <li>Fair weighting aligned with performance distribution</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-3">
                    You'll be able to review, edit, and download the rubric before applying it to grade all essays.
                  </p>
                </div>
              </>
            )}

            {false && sectionType === 'essay' && rubric && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-md font-medium text-gray-900">Essay Rubric *</h3>
                    <p className="text-sm text-gray-600 mt-1">Define grading criteria, weights, and scoring anchors</p>
                  </div>
                  <button
                    type="button"
                    onClick={addCriterion}
                    className="px-3 py-2 bg-[#74A44D] text-white rounded-md text-sm hover:bg-[#86B862] focus:outline-none focus:ring-2 focus:ring-[#74A44D]"
                  >
                    + Add Criterion
                  </button>
                </div>

                {rubric.criteria.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No criteria added yet. Click "Add Criterion" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {rubric.criteria.map((criterion, criterionIndex) => (
                      <div key={criterion.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Criterion Name *
                              </label>
                              <input
                                type="text"
                                value={criterion.name}
                                onChange={(e) => updateCriterion(criterion.id, 'name', e.target.value)}
                                placeholder="e.g., Thesis Statement"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Weight (0-1) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={criterion.weight}
                                onChange={(e) => updateCriterion(criterion.id, 'weight', parseFloat(e.target.value) || 0)}
                                placeholder="0.3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCriterion(criterion.id)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Remove criterion"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={criterion.description}
                            onChange={(e) => updateCriterion(criterion.id, 'description', e.target.value)}
                            rows={2}
                            placeholder="What this criterion evaluates..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>

                        {/* Anchors */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Concept Anchors
                            </label>
                            <button
                              type="button"
                              onClick={() => addAnchor(criterion.id)}
                              className="text-xs text-[#74A44D] hover:text-[#86B862]"
                            >
                              + Add Anchor
                            </button>
                          </div>
                          <div className="space-y-2">
                            {criterion.anchors.map((anchor, anchorIndex) => (
                              <div key={anchorIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={anchor}
                                  onChange={(e) => updateAnchor(criterion.id, anchorIndex, e.target.value)}
                                  placeholder="e.g., clear claim, well-defined position"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                {criterion.anchors.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeAnchor(criterion.id, anchorIndex)}
                                    className="p-2 text-gray-400 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Penalties */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Penalties (Optional)
                            </label>
                            <button
                              type="button"
                              onClick={() => addPenalty(criterion.id)}
                              className="text-xs text-[#74A44D] hover:text-[#86B862]"
                            >
                              + Add Penalty
                            </button>
                          </div>
                          {criterion.penalties.length > 0 && (
                            <div className="space-y-2">
                              {criterion.penalties.map((penalty, penaltyIndex) => (
                                <div key={penaltyIndex} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={penalty.reason}
                                    onChange={(e) => updatePenalty(criterion.id, penaltyIndex, 'reason', e.target.value)}
                                    placeholder="Reason (e.g., missing thesis)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                  <input
                                    type="number"
                                    value={penalty.points}
                                    onChange={(e) => updatePenalty(criterion.id, penaltyIndex, 'points', parseFloat(e.target.value) || 0)}
                                    placeholder="-2"
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removePenalty(criterion.id, penaltyIndex)}
                                    className="p-2 text-gray-400 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Rubric Summary</h4>
                      <p className="text-sm text-blue-800">
                        Total criteria: {rubric.criteria.length} | 
                        Total weight: {rubric.criteria.reduce((sum, c) => sum + c.weight, 0).toFixed(2)}
                        {rubric.criteria.reduce((sum, c) => sum + c.weight, 0) !== 1 && (
                          <span className="text-yellow-700 ml-2">⚠ Weights should sum to 1.0</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCreateSessionAndAnswerKey}
              disabled={
                loading ||
                !title.trim() ||
                !sectionType ||
                ((sectionType === 'mcq' || sectionType === 'short_answer') && !answerKeyFile)
              }
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#A91B6F] hover:bg-[#8E165E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A91B6F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Continue to Worksheet Upload'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload Worksheets */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Upload Student Worksheets</h2>
            
            <p className="text-sm text-gray-600 mb-6">
              Upload images of student worksheets. The AI will automatically extract answers from each worksheet.
            </p>
            
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
                  JPG, PNG files up to 10MB each
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
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
                          <ImageIcon className="h-5 w-5 text-gray-400" />
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

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back
              </button>
              <button
                onClick={processWorksheets}
                disabled={loading || files.length === 0}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Extracting Answers...
                  </>
                ) : (
                  'Extract Answers with AI'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Extraction Results (and AI Rubric for Essays) */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Show AI-generated rubric for essays */}
            {sectionType === 'essay' && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {generatingRubric ? 'Generating AI Rubric...' : 'AI-Generated Rubric'}
                  </h3>
                  {rubric && (
                    <button
                      onClick={downloadRubric}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A91B6F]"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Rubric
                    </button>
                  )}
                </div>

                {generatingRubric && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-[#A91B6F]" />
                    <p className="ml-3 text-gray-600">Analyzing essays and generating rubric...</p>
                    </div>
                )}

                {!generatingRubric && rubric && (
                  <div className="space-y-4">
                    {/* Rubric summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Rubric Summary</h4>
                      <p className="text-sm text-blue-800">
                        Total criteria: {rubric.criteria.length} | 
                        Total weight: {rubric.criteria.reduce((sum, c) => sum + c.weight, 0).toFixed(2)} | 
                        Total points: {rubric.totalPoints}
                      </p>
                  </div>

                    {/* Display criteria */}
                    <div className="space-y-4">
                      {rubric.criteria.map((criterion, index) => (
                        <div key={criterion.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-md font-semibold text-gray-900">
                              {index + 1}. {criterion.name}
                            </h4>
                            <span className="text-sm font-medium text-[#74A44D]">
                              Weight: {criterion.weight.toFixed(2)} ({(criterion.weight * 100).toFixed(0)}%)
                            </span>
                          </div>
                          
                          {criterion.description && (
                            <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
                          )}

                          {criterion.anchors && criterion.anchors.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Scoring Anchors:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {criterion.anchors.map((anchor, i) => (
                                  <li key={i} className="text-sm text-gray-600">{anchor}</li>
                                ))}
                              </ul>
              </div>
                          )}

                          {criterion.penalties && criterion.penalties.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Penalties:</p>
                              <ul className="space-y-1">
                                {criterion.penalties.map((penalty, i) => (
                                  <li key={i} className="text-sm text-gray-600">
                                    <span className="text-red-600 font-medium">{penalty.points}</span> - {penalty.reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!generatingRubric && !rubric && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No rubric generated. Please try re-uploading worksheets.</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Extracted Answers</h2>
            
              <div className="space-y-4">
              {extractionResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{result.filename}</h3>
                    <span className="text-sm text-gray-500">Worksheet {index + 1}</span>
                    </div>
                    
                    {result.error ? (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span className="text-sm">{result.error}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                        Extracted {result.answers.length} answers
                      </p>
                      {result.answers.slice(0, 5).map((answer: any, answerIndex: number) => (
                        <div key={answerIndex} className="text-sm flex items-center">
                          <span className="font-medium mr-2">Q{answer.questionNumber}:</span>
                          <span className="text-gray-900">
                            {answer.extractedAnswer || 'NO_ANSWER'}
                            </span>
                          {answer.confidence < 0.7 && (
                            <span className="ml-2 text-xs text-yellow-600 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low confidence
                            </span>
                            )}
                          </div>
                        ))}
                      {result.answers.length > 5 && (
                          <p className="text-xs text-gray-500">
                          ...and {result.answers.length - 5} more answers
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back
              </button>
              <button
                  onClick={handleContinueToGrading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Continue to Grading
              </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Step 4: Grading in Progress */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto h-8 w-8 text-indigo-600" />
              <h2 className="mt-4 text-lg font-medium text-gray-900">AI Grading in Progress</h2>
              <p className="mt-2 text-sm text-gray-600">
                Using AI to intelligently grade student responses against the answer key...
              </p>
              <p className="mt-1 text-xs text-gray-500">
                This may take a moment as the AI analyzes each answer
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

