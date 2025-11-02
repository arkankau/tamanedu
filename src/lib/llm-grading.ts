/**
 * LLM-based Grading using Reka API
 * Replaces OCR with intelligent vision-based grading
 */

interface RekaMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface GradedAnswer {
  questionNumber: number;
  studentAnswer: string;
  isCorrect: boolean;
  confidence: number;
  explanation: string;
  extractedText: string;
}

interface GradingResult {
  studentId: string;
  answers: GradedAnswer[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

/**
 * Convert image file to base64 data URL
 * Uses Node.js Buffer API (server-side)
 */
async function imageToBase64(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert to base64 data URL
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Call Reka API for text-only chat
 */
async function callRekaTextAPI(prompt: string): Promise<string> {
  const apiKey = process.env.REKA_API_KEY;
  
  if (!apiKey) {
    throw new Error('REKA_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.reka.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      model: 'reka-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reka API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Reka returns: { responses: [{ message: { content: "..." } }] }
  const responseText = data.responses?.[0]?.message?.content;
  
  if (!responseText) {
    console.error('Unexpected Reka text response format:', data);
    throw new Error('Invalid response from Reka API');
  }

  return responseText;
}

/**
 * Call Reka API for vision-based grading
 */
async function callRekaVisionAPI(prompt: string, imageBase64: string): Promise<string> {
  const apiKey = process.env.REKA_API_KEY;
  
  if (!apiKey) {
    throw new Error('REKA_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.reka.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      model: 'reka-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      media_url: imageBase64,
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reka API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Reka returns: { responses: [{ message: { content: "..." } }] }
  const responseText = data.responses?.[0]?.message?.content;
  
  if (!responseText) {
    console.error('Unexpected Reka response format:', data);
    throw new Error('Invalid response from Reka API');
  }

  return responseText;
}

/**
 * Extract answers from an image using Reka Vision
 */
export async function extractAnswersFromImage(
  imageFile: File,
  questionNumbers: number[]
): Promise<Array<{ questionNumber: number; extractedAnswer: string; confidence: number }>> {
  try {
    const base64Image = await imageToBase64(imageFile);
    
    const prompt = `You are an expert at reading student worksheets and extracting answers.

Please analyze this image of a student worksheet and extract the answers for questions ${questionNumbers.join(', ')}.

For each question, identify:
1. The question number
2. The student's answer (exactly as written)

Return ONLY a JSON array in this format:
[
  {"questionNumber": 1, "extractedAnswer": "answer text", "confidence": 0.95},
  {"questionNumber": 2, "extractedAnswer": "answer text", "confidence": 0.90}
]

If you cannot find an answer for a question, use "NO_ANSWER" as the extractedAnswer and set confidence to 0.
Be precise and extract the exact text/answer the student provided.`;

    // For Reka vision, we need to send the image in the media_url field
    const response = await callRekaVisionAPI(prompt, base64Image);
    
    // Parse the JSON response
    // Remove markdown code blocks if present
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const extractedAnswers = JSON.parse(jsonText);
    
    return extractedAnswers;
  } catch (error) {
    console.error('Error extracting answers:', error);
    throw new Error(`Failed to extract answers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Grade a single answer using LLM
 */
export async function gradeAnswer(
  studentAnswer: string,
  correctAnswer: string,
  acceptedVariants: string[] = [],
  questionNumber: number
): Promise<{ isCorrect: boolean; confidence: number; explanation: string }> {
  try {
    const allAcceptedAnswers = [correctAnswer, ...acceptedVariants].join(', ');
    
    const prompt = `You are an expert teacher grading student answers.

Question ${questionNumber}:
Correct answer(s): ${allAcceptedAnswers}
Student's answer: "${studentAnswer}"

Determine if the student's answer is correct. Consider:
- Exact matches
- Synonyms and equivalent expressions
- Minor spelling variations
- Different but equivalent forms (e.g., "Paris" vs "paris", "42" vs "forty-two")

Return ONLY a JSON object in this format:
{
  "isCorrect": true/false,
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation of why the answer is correct/incorrect"
}`;

    const response = await callRekaTextAPI(prompt);
    
    // Parse the JSON response
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const result = JSON.parse(jsonText);
    
    return {
      isCorrect: result.isCorrect,
      confidence: result.confidence || 0.95,
      explanation: result.explanation || '',
    };
  } catch (error) {
    console.error('Error grading answer:', error);
    
    // Fallback to simple string comparison
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    const normalizedCorrect = correctAnswer.toLowerCase().trim();
    const normalizedVariants = acceptedVariants.map(v => v.toLowerCase().trim());
    
    const isCorrect = normalizedStudent === normalizedCorrect || 
                      normalizedVariants.includes(normalizedStudent);
    
    return {
      isCorrect,
      confidence: isCorrect ? 0.7 : 0.6,
      explanation: isCorrect 
        ? 'Answer matches (fallback comparison)' 
        : 'Answer does not match (fallback comparison)',
    };
  }
}

/**
 * Grade a student worksheet image against an answer key
 */
export async function gradeStudentWorksheet(
  imageFile: File,
  answerKey: Array<{
    question_number: number;
    correct_answer: string;
    accepted_variants: string[];
    points: number;
  }>
): Promise<GradingResult> {
  try {
    // Extract question numbers from answer key
    const questionNumbers = answerKey.map(ak => ak.question_number);
    
    // Step 1: Extract answers from the image
    const extractedAnswers = await extractAnswersFromImage(imageFile, questionNumbers);
    
    // Step 2: Grade each answer
    const gradedAnswers: GradedAnswer[] = [];
    let totalScore = 0;
    let maxScore = 0;
    
    for (const extracted of extractedAnswers) {
      const answerKeyItem = answerKey.find(ak => ak.question_number === extracted.questionNumber);
      
      if (!answerKeyItem) {
        console.warn(`No answer key found for question ${extracted.questionNumber}`);
        continue;
      }
      
      maxScore += answerKeyItem.points;
      
      // Skip if no answer was found
      if (extracted.extractedAnswer === 'NO_ANSWER' || !extracted.extractedAnswer.trim()) {
        gradedAnswers.push({
          questionNumber: extracted.questionNumber,
          studentAnswer: 'NO_ANSWER',
          isCorrect: false,
          confidence: 0,
          explanation: 'No answer found in image',
          extractedText: 'NO_ANSWER',
        });
        continue;
      }
      
      // Grade the answer
      const gradingResult = await gradeAnswer(
        extracted.extractedAnswer,
        answerKeyItem.correct_answer,
        answerKeyItem.accepted_variants,
        extracted.questionNumber
      );
      
      if (gradingResult.isCorrect) {
        totalScore += answerKeyItem.points;
      }
      
      gradedAnswers.push({
        questionNumber: extracted.questionNumber,
        studentAnswer: extracted.extractedAnswer,
        isCorrect: gradingResult.isCorrect,
        confidence: Math.min(extracted.confidence, gradingResult.confidence),
        explanation: gradingResult.explanation,
        extractedText: extracted.extractedAnswer,
      });
    }
    
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    return {
      studentId: '', // Will be filled in by the caller
      answers: gradedAnswers,
      totalScore,
      maxScore,
      percentage,
    };
  } catch (error) {
    console.error('Error grading worksheet:', error);
    throw error;
  }
}

/**
 * Batch grade multiple student worksheets
 */
export async function batchGradeWorksheets(
  worksheets: Array<{ studentId: string; imageFile: File }>,
  answerKey: Array<{
    question_number: number;
    correct_answer: string;
    accepted_variants: string[];
    points: number;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<GradingResult[]> {
  const results: GradingResult[] = [];
  
  for (let i = 0; i < worksheets.length; i++) {
    const worksheet = worksheets[i];
    
    try {
      const result = await gradeStudentWorksheet(worksheet.imageFile, answerKey);
      result.studentId = worksheet.studentId;
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, worksheets.length);
      }
    } catch (error) {
      console.error(`Error grading worksheet for student ${worksheet.studentId}:`, error);
      
      // Add a failed result
      results.push({
        studentId: worksheet.studentId,
        answers: [],
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
      });
    }
  }
  
  return results;
}

