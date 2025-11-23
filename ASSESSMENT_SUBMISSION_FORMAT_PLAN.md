# Assessment Submission Message Format Plan

## Problem
Currently, the submission message saved to the database shows field names like "question1", "question2" instead of the actual question labels. Professors need to see the actual questions when reviewing student responses.

## Current Format
```
I just completed the assessment on "Supervised vs. Unsupervised Learning and Linear Regression". My answers were: {
  "question1": "labeled_data",
  "question2": "Not sure",
  "question3": "linear_regression"
} I scored 67%.
```

## Desired Format
```
I just completed the assessment on "Supervised vs. Unsupervised Learning and Linear Regression".

Question: What is supervised learning?
Answer: labeled_data

Question: What is the difference between regression and classification?
Answer: Not sure

Question: Which algorithm is used for continuous outcomes?
Answer: linear_regression

I scored 67%.
```

## Implementation

### File: `app/api/in-chat-assessment/submit/route.ts`

**Location:** Around line 204-205 where `submissionMessage` is created

**Changes:**
1. Create a helper function to format the submission message with question labels
2. Map field names to their labels from `inChatAssessmentData.fields`
3. Format answers appropriately based on field type (array for multiselect, etc.)
4. Create readable Q&A format

**Code Changes:**

```typescript
// Helper function to format submission message with question labels
const formatSubmissionMessage = (
  topic: string,
  fields: Array<{ name: string; label: string; type: string }>,
  responses: Record<string, any>,
  score: number | null
): string => {
  let message = `I just completed the assessment on "${topic}".\n\n`;
  
  // Map each response to its question label
  fields.forEach((field) => {
    const answer = responses[field.name];
    if (answer !== undefined && answer !== null && answer !== '') {
      let formattedAnswer: string;
      
      // Format answer based on type
      if (Array.isArray(answer)) {
        formattedAnswer = answer.join(', ');
      } else if (typeof answer === 'boolean') {
        formattedAnswer = answer ? 'Yes' : 'No';
      } else {
        formattedAnswer = String(answer);
      }
      
      message += `Question: ${field.label}\n`;
      message += `Answer: ${formattedAnswer}\n\n`;
    }
  });
  
  if (score !== null) {
    message += `I scored ${score.toFixed(0)}%.`;
  }
  
  return message;
};

// Replace the current submissionMessage creation:
const submissionMessage = formatSubmissionMessage(
  inChatAssessmentData.topic,
  inChatAssessmentData.fields,
  responses,
  score
);
```

## Notes
- Keep UI feedback display unchanged - this only affects the message saved to database
- The formatted message will be more readable for professors reviewing student responses
- The agent will still receive the formatted message in context, which may improve feedback quality

