# AI-Generated Rubric Workflow

## Overview

TamanEdu now features **AI-powered rubric generation** for essay grading, inspired by Gradescope. Instead of manually creating rubrics upfront, teachers can upload student essays and let Reka AI analyze them to generate a data-driven, fair grading rubric.

## Why AI-Generated Rubrics?

### Traditional Approach (Manual Rubric Creation)
- ❌ Teachers spend hours creating detailed rubrics before seeing student work
- ❌ Requires predicting all possible student responses
- ❌ Criteria might not align with what students actually wrote
- ❌ Anchors are theoretical, not based on real performance

### AI-Generated Approach (Our Implementation)
- ✅ **Data-Driven**: Rubric reflects actual student work, not predictions
- ✅ **Time-Saving**: No manual rubric creation upfront
- ✅ **Fairer**: Criteria emerge from what students demonstrated
- ✅ **Anchored**: Real student examples define each score tier
- ✅ **Exportable**: Teacher can download, reuse, and refine for future assessments

## User Workflow

### Step 1: Create Essay Grading Session
1. Navigate to `/grading/new`
2. Enter session title and description (include essay prompt for better rubric generation)
3. Select **"Essay"** as section type
4. Click "Create Session & Continue"
5. ℹ️ Notice: No manual rubric input required!

### Step 2: Upload Student Essays
1. Upload student essay images (JPG/PNG) or PDFs
2. Multiple files supported for batch processing
3. Click "Process Worksheets"
4. AI extracts essay content using Reka Vision

### Step 3: AI Rubric Generation & Review
1. **Automatic Analysis**: Reka AI analyzes all essays to:
   - Identify common themes and approaches
   - Cluster responses by quality
   - Discover natural evaluation criteria
   - Extract anchors from actual student responses
   
2. **Generated Rubric Includes**:
   - 3-5 key criteria (e.g., Thesis, Evidence, Organization)
   - Weights that sum to 1.0
   - Descriptive anchors for each criterion
   - Optional penalties for common issues
   
3. **Review Interface**: 
   - View the generated rubric with all criteria
   - See weights, descriptions, and anchors
   - Download rubric as JSON for documentation/reuse

### Step 4: Apply Grading
Once satisfied with the rubric, proceed to grade all essays using the AI-generated criteria.

## Technical Implementation

### API Endpoint: `/api/rubric/generate`
**POST Request:**
```json
{
  "essayTexts": ["essay 1 content...", "essay 2 content..."],
  "sessionId": "uuid",
  "prompt": "Optional essay prompt for context"
}
```

**Response:**
```json
{
  "rubric": {
    "criteria": [
      {
        "id": "criterion-1",
        "name": "Thesis Statement",
        "weight": 0.3,
        "description": "Clarity and strength of the main argument",
        "anchors": [
          "Excellent: Clear, specific, arguable thesis...",
          "Good: Present but somewhat vague...",
          "Fair: Weak or unclear thesis...",
          "Poor: Missing or off-topic thesis..."
        ],
        "penalties": [
          { "reason": "No introduction paragraph", "points": -2 }
        ]
      }
    ],
    "totalPoints": 100
  }
}
```

### Reka AI Prompt Engineering
The system uses a carefully crafted prompt that:
1. Provides Reka with the educational assessment expert role
2. Includes actual student essay samples (first 10, truncated to 500 chars each)
3. Optionally includes the essay prompt for context
4. Requests JSON output in a specific format
5. Emphasizes data-driven, fair rubric generation

### Frontend Components
**File:** `src/app/grading/new/page.tsx`

Key changes:
- Removed manual rubric builder from Step 1
- Added `generateRubricFromEssays()` function
- Added `generatingRubric` state for loading UI
- Added `downloadRubric()` function for JSON export
- New rubric display in Step 3 with:
  - Summary card (total criteria, weights, points)
  - Expandable criterion cards
  - Download button
  - Loading state during generation

## Benefits for Teachers

1. **Saves Time**: No upfront rubric creation (15-30 min saved per assignment)
2. **Improves Fairness**: Rubric based on actual student performance distribution
3. **Better Insights**: Discover what students actually wrote vs. what was expected
4. **Consistency**: AI identifies common patterns across all submissions
5. **Transparency**: Download rubric to share with students or for documentation
6. **Reusability**: Export rubric for future similar assignments

## Example Generated Rubric

Based on a set of biology essays about photosynthesis:

```json
{
  "criteria": [
    {
      "id": "criterion-1",
      "name": "Scientific Accuracy",
      "weight": 0.4,
      "description": "Correctness of biological concepts and processes",
      "anchors": [
        "Excellent: All key concepts correct with accurate chemical equations",
        "Good: Main concepts correct but minor errors in details",
        "Fair: Several misconceptions or missing key concepts",
        "Poor: Fundamental misunderstandings of photosynthesis"
      ],
      "penalties": []
    },
    {
      "id": "criterion-2",
      "name": "Use of Evidence",
      "weight": 0.3,
      "description": "Quality and relevance of examples and supporting evidence",
      "anchors": [
        "Excellent: Multiple relevant examples with clear connections",
        "Good: Some examples but limited explanation",
        "Fair: Vague or irrelevant examples",
        "Poor: No supporting evidence provided"
      ],
      "penalties": [
        { "reason": "No real-world examples", "points": -3 }
      ]
    },
    {
      "id": "criterion-3",
      "name": "Organization & Clarity",
      "weight": 0.3,
      "description": "Logical flow and clear communication of ideas",
      "anchors": [
        "Excellent: Clear structure with smooth transitions",
        "Good: Generally organized but some unclear sections",
        "Fair: Disorganized or hard to follow",
        "Poor": Incoherent or missing key sections"
      ],
      "penalties": [
        { "reason": "Missing introduction or conclusion", "points": -2 }
      ]
    }
  ],
  "totalPoints": 100
}
```

## Future Enhancements

1. **Rubric Editing**: Allow teachers to edit criteria, weights, and anchors in-app before applying
2. **Rubric Library**: Save and reuse rubrics across sessions
3. **Collaborative Rubrics**: Multiple teachers can contribute to rubric refinement
4. **Student Examples**: Include anonymized student response examples in rubric anchors
5. **Rubric Comparison**: Compare rubrics across different grading sessions
6. **PDF Export**: Export rubric as formatted PDF for sharing

## Troubleshooting

### Rubric Generation Fails
- **Check**: Ensure essays were successfully extracted
- **Check**: Verify `REKA_API_KEY` is set in `.env.local`
- **Check**: Essays should have sufficient content (> 50 words recommended)

### Low-Quality Rubric
- **Tip**: Include essay prompt/question in session description for better context
- **Tip**: Ensure diverse student responses (3+ submissions minimum)
- **Tip**: Check that essay extraction was accurate

### Rubric Weights Don't Sum to 1.0
- AI occasionally generates weights that don't perfectly sum to 1.0
- Teacher should normalize weights if necessary
- Future update will include automatic normalization

## Credits

Inspired by Gradescope's AI-assisted grading features and powered by Reka AI's advanced language models.

