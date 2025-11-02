import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/rubric/generate
 * Generate an AI rubric from essay texts using Reka AI
 */
export async function POST(request: NextRequest) {
  try {
    const { essayTexts, sessionId, prompt } = await request.json()

    if (!essayTexts || !Array.isArray(essayTexts) || essayTexts.length === 0) {
      return NextResponse.json(
        { error: 'Essay texts are required' },
        { status: 400 }
      )
    }

    // Use Reka AI to analyze essays and generate rubric
    const rubric = await generateRubricWithReka(essayTexts, prompt)

    return NextResponse.json({
      rubric,
      message: 'Rubric generated successfully'
    })

  } catch (error) {
    console.error('Rubric generation API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate rubric' },
      { status: 500 }
    )
  }
}

async function generateRubricWithReka(essayTexts: string[], prompt?: string) {
  const apiKey = process.env.REKA_API_KEY
  
  if (!apiKey) {
    throw new Error('REKA_API_KEY environment variable is not set')
  }

  // Create a prompt for Reka to analyze essays and generate rubric
  const systemPrompt = `You are an expert educational assessment specialist. Analyze the provided student essays and generate a data-driven grading rubric.

Your rubric should:
1. Identify 3-5 key evaluation criteria based on what students actually wrote
2. For each criterion, provide:
   - A clear name (e.g., "Thesis Statement", "Evidence & Examples")
   - A description of what it evaluates
   - Weight (as a decimal, total should sum to 1.0)
   - 3-4 scoring anchors describing different quality levels (use actual student examples if possible)
   - Optional penalties for common issues

Return ONLY a valid JSON object in this exact format:
{
  "criteria": [
    {
      "id": "criterion-1",
      "name": "Criterion Name",
      "weight": 0.3,
      "description": "What this evaluates",
      "anchors": [
        "Excellent: Clear, well-defined...",
        "Good: Present but lacks...",
        "Fair: Weak or unclear...",
        "Poor: Missing or off-topic..."
      ],
      "penalties": [
        { "reason": "Missing introduction", "points": -2 }
      ]
    }
  ],
  "totalPoints": 100
}`

  const essayPrompt = prompt ? `\n\nEssay prompt/question: ${prompt}` : ''
  const essaySamples = essayTexts.slice(0, 10).map((text, i) => 
    `\n\nEssay ${i + 1}:\n${text.substring(0, 500)}...`
  ).join('')

  const fullPrompt = `${systemPrompt}${essayPrompt}${essaySamples}\n\nAnalyze these ${essayTexts.length} essays and generate a fair, data-driven rubric. Return ONLY the JSON object, no other text.`

  const response = await fetch('https://api.reka.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      model: 'reka-flash',
      messages: [{ type: 'human', text: fullPrompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Reka API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const responseText = data.responses?.[0]?.message?.content

  if (!responseText) {
    console.error('Unexpected Reka response format:', data)
    throw new Error('Invalid response from Reka API')
  }

  // Parse the JSON rubric from the response
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const rubric = JSON.parse(jsonMatch[0])
    
    // Validate rubric structure
    if (!rubric.criteria || !Array.isArray(rubric.criteria)) {
      throw new Error('Invalid rubric format: missing criteria array')
    }

    // Ensure IDs exist
    rubric.criteria = rubric.criteria.map((c: any, i: number) => ({
      ...c,
      id: c.id || `criterion-${Date.now()}-${i}`,
      penalties: c.penalties || []
    }))

    return rubric
  } catch (parseError) {
    console.error('Failed to parse rubric JSON:', responseText)
    throw new Error('Failed to parse generated rubric')
  }
}

