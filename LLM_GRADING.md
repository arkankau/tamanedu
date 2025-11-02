# LLM-Based Grading System

## Overview

TamanEdu now uses **AI-powered grading** with the Reka API instead of traditional OCR. This provides significantly better accuracy and understanding of student answers, including:

- ✅ Intelligent answer extraction from handwritten worksheets
- ✅ Smart grading with understanding of answer variants
- ✅ Support for synonyms and equivalent expressions
- ✅ Better handling of spelling variations
- ✅ Context-aware evaluation

## Architecture

### Components

1. **LLM Grading Library** (`src/lib/llm-grading.ts`)
   - Vision-based answer extraction using Reka Flash model
   - Intelligent grading with natural language understanding
   - Batch processing support

2. **API Routes**
   - `/api/ocr` - Extract answers from student worksheets using AI vision
   - `/api/grade` - Grade extracted answers using LLM
   - `/api/answer-key/upload` - Upload answer keys (unchanged)

3. **UI Workflow** (`src/app/grading/new/page.tsx`)
   - Step 1: Create session and upload answer key
   - Step 2: Upload student worksheets
   - Step 3: Review extracted answers
   - Step 4: AI-powered grading

## Setup

### 1. Get Reka API Key

1. Visit [https://www.reka.ai/](https://www.reka.ai/)
2. Sign up for an account
3. Generate an API key from your dashboard

### 2. Configure Environment

Add to your `.env.local`:

```bash
REKA_API_KEY=your-reka-api-key-here
```

### 3. Install Dependencies

```bash
npm install
```

Note: OCR dependencies (tesseract.js, easyocr) have been removed.

## How It Works

### Answer Extraction

The system uses Reka's vision model to analyze student worksheet images:

1. Receives image file and list of question numbers
2. Sends image to Reka API with structured prompt
3. Extracts student answers with confidence scores
4. Returns structured JSON with question-answer pairs

```typescript
// Example extracted answer
{
  questionNumber: 1,
  extractedAnswer: "Paris",
  confidence: 0.95
}
```

### Intelligent Grading

The LLM grades each answer with semantic understanding:

1. Compares student answer against correct answer and variants
2. Considers synonyms, spelling variations, and equivalent forms
3. Provides confidence score and explanation
4. Returns structured grading result

```typescript
// Example grading result
{
  isCorrect: true,
  confidence: 0.98,
  explanation: "Answer matches the correct answer 'Paris'"
}
```

## API Reference

### Extract Answers from Image

```typescript
import { extractAnswersFromImage } from '@/lib/llm-grading'

const results = await extractAnswersFromImage(
  imageFile,
  [1, 2, 3, 4, 5] // question numbers to extract
)
```

### Grade Single Answer

```typescript
import { gradeAnswer } from '@/lib/llm-grading'

const result = await gradeAnswer(
  "paris",                    // student answer
  "Paris",                    // correct answer
  ["paris", "Paris, France"], // accepted variants
  1                           // question number
)
```

### Grade Complete Worksheet

```typescript
import { gradeStudentWorksheet } from '@/lib/llm-grading'

const result = await gradeStudentWorksheet(
  imageFile,
  answerKey // array of answer key items
)
```

### Batch Grade Multiple Worksheets

```typescript
import { batchGradeWorksheets } from '@/lib/llm-grading'

const results = await batchGradeWorksheets(
  worksheets, // array of { studentId, imageFile }
  answerKey,
  (current, total) => {
    console.log(`Progress: ${current}/${total}`)
  }
)
```

## Advantages Over OCR

### Traditional OCR Approach
- ❌ Requires complex text extraction and parsing
- ❌ Struggles with handwriting
- ❌ Simple string matching (inflexible)
- ❌ High error rate with poor image quality
- ❌ No understanding of context

### LLM-Based Approach
- ✅ Understands handwritten and typed text
- ✅ Intelligent semantic matching
- ✅ Handles synonyms and variations
- ✅ Better accuracy even with poor quality images
- ✅ Provides reasoning for grading decisions

## Workflow

### Teacher Workflow

1. **Create Grading Session**
   - Enter session title and description
   - Upload answer key CSV

2. **Upload Worksheets**
   - Upload images of student worksheets
   - One image per student

3. **Review Extracted Answers**
   - AI automatically extracts answers
   - Review confidence scores
   - Flag low-confidence answers

4. **Grade with AI**
   - LLM grades all answers intelligently
   - View results with explanations
   - Export grades

### Answer Key Format

CSV file with columns:

```csv
question,answer,points
1,A,1
2,Paris|paris|Paris, France,2
3,42|forty-two,1
```

Use `|` to separate accepted answer variants.

## Performance

- **Answer Extraction**: ~2-3 seconds per image
- **Grading**: ~1 second per answer
- **Typical Class (30 students, 10 questions)**: ~2-3 minutes total

## Rate Limits

Reka API has the following limits:
- Free tier: 100 requests/day
- Paid tier: Varies by plan

## Error Handling

The system includes robust error handling:

1. **Network Errors**: Retries with exponential backoff
2. **Invalid Images**: Returns error message
3. **API Failures**: Falls back to simple string matching
4. **Low Confidence**: Flags answers for manual review

## Best Practices

### For Teachers

1. **Image Quality**
   - Use good lighting
   - Avoid glare and shadows
   - Ensure text is clearly visible

2. **Answer Keys**
   - Include common answer variants
   - Add both upper and lowercase versions
   - Consider synonyms

3. **Review**
   - Check low-confidence answers manually
   - Verify AI grading on first few worksheets
   - Update answer key based on patterns

### For Developers

1. **API Key Security**
   - Never commit API keys
   - Use environment variables
   - Rotate keys regularly

2. **Error Handling**
   - Always implement fallbacks
   - Log errors for debugging
   - Provide user-friendly messages

3. **Cost Management**
   - Batch requests when possible
   - Cache results
   - Monitor API usage

## Troubleshooting

### "REKA_API_KEY not set"
- Add `REKA_API_KEY` to your `.env.local` file
- Restart the development server

### "Failed to extract answers"
- Check image quality
- Verify image format (JPG, PNG)
- Ensure answer key is uploaded first

### "Low confidence" warnings
- Improve image quality
- Manually review flagged answers
- Update answer key with variants

## Migration from OCR

If you were using the old OCR system:

1. ✅ OCR dependencies removed from package.json
2. ✅ Tesseract.js and EasyOCR removed
3. ✅ New LLM-based system in place
4. ✅ UI updated for new workflow
5. ✅ Environment variables updated

No database migration needed - the data schema remains the same.

## Future Enhancements

Planned features:
- [ ] Support for multiple languages
- [ ] Bulk student worksheet upload
- [ ] Real-time grading progress
- [ ] Answer explanation generation
- [ ] Teacher feedback loop
- [ ] Custom grading rubrics

## Support

For issues or questions:
- Check this documentation
- Review the code comments
- Contact the development team

## License

Same as main project.

