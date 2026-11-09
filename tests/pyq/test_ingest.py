import unittest

from scripts.pyq_ingest import KEY_RE, clean_body, has_trailing_out_heading, parse_question_body


class QuestionParsingTests(unittest.TestCase):
    def test_plain_question_and_four_options(self):
        body = """\nMCQ (Single Correct Answer)
Which unit is used?
(A) Ampere
(B) Volt
(C) Ohm
(D) Watt
Open solution
"""
        stem, options, flags = parse_question_body(body)
        self.assertEqual(stem, "Which unit is used?")
        self.assertEqual(options, ["Ampere", "Volt", "Ohm", "Watt"])
        self.assertEqual(flags, [])

    def test_table_labels_do_not_replace_final_answer_options(self):
        body = """MCQ (Single Correct Answer)
Match the columns.
(A) Row one
(B) Row two
(C) Row three
(D) Row four
(A) A-I, B-II
(B) A-II, B-I
(C) A-III, B-IV
(D) A-IV, B-III
Open solution"""
        stem, options, flags = parse_question_body(body)
        self.assertIn("Match the columns", stem)
        self.assertEqual(options, ["A-I, B-II", "A-II, B-I", "A-III, B-IV", "A-IV, B-III"])
        self.assertIn("MULTIPLE_OPTION_GROUPS", flags)

    def test_image_only_options_are_not_invented(self):
        body = "MCQ (Single Correct Answer)\nWhich structure?\n(A)\n(B)\n(C)\n(D)\nOpen solution"
        _, options, flags = parse_question_body(body)
        self.assertEqual(options, ["", "", "", ""])
        self.assertIn("OPTIONS_NOT_FOUND", flags)

    def test_multi_answer_key_is_not_coerced(self):
        keys = [(int(m.group(1)), m.group(2)) for m in KEY_RE.finditer("84. A, D\n85. C\n")]
        self.assertEqual(keys, [(84, "A, D"), (85, "C")])

    def test_non_single_type_header_is_removed_from_stem(self):
        self.assertEqual(clean_body("MCQ (More than One Correct Answer)\nQuestion?\nOpen solution"), "Question?")

    def test_out_of_syllabus_heading_after_last_question_survives_resume(self):
        page = "Q158.\nMCQ (Single Correct Answer)\nQuestion?\nOpen solution\nOut of syllabus\n22 questions\n"
        self.assertTrue(has_trailing_out_heading(page))
        self.assertFalse(has_trailing_out_heading(page + "Q159.\nMCQ (Single Correct Answer)\nNext?\n"))


if __name__ == "__main__":
    unittest.main()
