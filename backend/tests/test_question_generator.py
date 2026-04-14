import asyncio
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import Question, QuestionType, Subject
from app.services.question_generator import QuestionGenerator


class QuestionGeneratorConsistencyTests(unittest.TestCase):
    def test_repair_question_batch_applies_reviewed_payload(self):
        generator = QuestionGenerator()
        original = Question(
            subject=Subject.MATHEMATICS,
            question_type=QuestionType.MULTIPLE_CHOICE,
            question_text="Solve 2x + 3 = 7.",
            options=["x = 1", "x = 2", "x = 3", "x = 4"],
            correct_answer="x = 2",
            explanation="2x = 2 so x = 3.",
            difficulty_level="easy",
            year_generated=2026,
            pattern_confidence=0.85,
        )

        async def fake_call_llm(prompt: str, temperature: float = 0.85) -> str:
            self.assertIn("internal consistency", prompt)
            self.assertEqual(temperature, 0.1)
            return json.dumps(
                [
                    {
                        "question": original.question_text,
                        "options": original.options,
                        "correct_answer": "x = 2",
                        "explanation": "Subtract 3 from both sides to get 2x = 4, then divide by 2 to get x = 2.",
                        "difficulty": original.difficulty_level,
                    }
                ]
            )

        generator._call_llm = fake_call_llm  # type: ignore[method-assign]

        repaired = asyncio.run(
            generator._repair_question_batch(
                [original],
                Subject.MATHEMATICS,
                QuestionType.MULTIPLE_CHOICE,
            )
        )

        self.assertEqual(len(repaired), 1)
        self.assertEqual(repaired[0].correct_answer, "x = 2")
        self.assertIn("x = 2", repaired[0].explanation)
        self.assertNotEqual(repaired[0].explanation, original.explanation)


if __name__ == "__main__":
    unittest.main()
