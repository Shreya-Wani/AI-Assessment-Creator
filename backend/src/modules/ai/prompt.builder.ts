import { IAssignment } from '../assignment/assignment.model';

export const buildPrompt = (assignment: IAssignment): string => {
  const configs = assignment.questionsConfig.map(c => `${c.count} questions of type ${c.type} (${c.marks} marks each)`).join(', ');

  const contentSection = assignment.extractedContent 
    ? `**Study Material/Subject Content:**\n${assignment.extractedContent}\n\n`
    : '';

  return `You are an expert academic assessment generator. Create a structured exam based on the following configurations:

**Subject/Title:** ${assignment.title}
**Questions Configuration:** ${configs}
${contentSection}**Special Instructions:** ${assignment.instructions || 'None'}

Generate a well-structured question paper exactly matching this JSON format. Do not return any raw text outside the JSON boundaries:

{
  "sections": [
    {
      "title": "Section A",
      "instructions": "General instructions for this section...",
      "questions": [
        {
          "question": "What is the capital of France?",
          "difficulty": "easy",
          "marks": 2
        }
      ]
    }
  ]
}

IMPORTANT RULES:
1. Distribute difficulty ('easy', 'medium', 'hard') logically.
2. Group questions logically across formatted sections.
3. Validate total counts to strictly match ${configs}.
4. Assign marks to each question according to the configuration provided.
5. Return ONLY valid JSON strings.
6. Base questions on the provided study material content when available.`;
};
