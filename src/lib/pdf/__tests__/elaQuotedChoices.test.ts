import assert from "node:assert/strict";
import test from "node:test";
import { elaQuestionStem } from "../elaDisplay";
import { parseElaMcqChoices, parseSingleQuestionFromPage } from "../detectElaReading";

const stem =
  "Which sentence from the story best supports the idea that Sylvie and Sammy work well together?";

const quotedChoices =
  ' A " \'Hmm.\' Sammy tilted his head. \'I have a few ideas too.\' " (paragraph 3) B "Then we can sell the paintings. We can donate the money to the Sea View Animal Shelter." (paragraph 9) C "Sylvie looked around. A balloon arch spelled \'Happy Make a Difference Day\' from streetlight to streetlight." (paragraph 19) D "Sylvie nodded. She squeezed in a few warm-up stretches and reached for her megaphone." (paragraph 26)';

test("parseElaMcqChoices splits quoted paragraph-reference choices", () => {
  const parsed = parseElaMcqChoices(stem + quotedChoices);
  assert.equal(parsed.length, 4);
  assert.match(parsed[0]!.text ?? "", /Hmm.*paragraph 3\)/);
  assert.doesNotMatch(parsed[0]!.text ?? "", /Then we can sell/);
  assert.match(parsed[1]!.text ?? "", /Then we can sell.*paragraph 9\)/);
  assert.doesNotMatch(parsed[1]!.text ?? "", /A balloon arch/);
  assert.match(parsed[2]!.text ?? "", /A balloon arch.*paragraph 19\)/);
  assert.match(parsed[3]!.text ?? "", /megaphone.*paragraph 26\)/);
});

test("parseElaMcqChoices handles missing B label before next quote", () => {
  const missingB =
    stem +
    ' A " \'Hmm.\' Sammy tilted his head. \'I have a few ideas too.\' " (paragraph 3) "Then we can sell the paintings. We can donate the money to the Sea View Animal Shelter." (paragraph 9) C "Sylvie looked around. A balloon arch spelled \'Happy Make a Difference Day\' from streetlight to streetlight." (paragraph 19) D "Sylvie nodded. She squeezed in a few warm-up stretches and reached for her megaphone." (paragraph 26)';

  const parsed = parseElaMcqChoices(missingB);
  assert.equal(parsed.length, 4);
  assert.doesNotMatch(parsed[0]!.text ?? "", /Then we can sell/);
  assert.match(parsed[1]!.text ?? "", /Then we can sell/);
});

test("parseElaMcqChoices splits when B label is missing and Then is corrupted", () => {
  const corrupted =
    stem +
    ' A " \'Hmm.\' Sammy tilted his head. \'I have a few ideas too.\' " (paragraph 3) " \uFFFD en we can sell the paintings. We can donate the money to the Sea View B Animal Shelter." (paragraph 9) C "Sylvie looked around. A balloon arch spelled \'Happy Make a Di ff erence C Day\' from streetlight to streetlight." (paragraph 19) D "Sylvie nodded. She squeezed in a few warm-up stretches and reached for D her megaphone." (paragraph 26)';

  const parsed = parseElaMcqChoices(corrupted);
  assert.equal(parsed.length, 4);
  assert.match(parsed[0]!.text ?? "", /Hmm.*\(paragraph 3\)/);
  assert.doesNotMatch(parsed[0]!.text ?? "", /en we can sell|Animal Shelter/);
  assert.match(parsed[1]!.text ?? "", /en we can sell.*Animal Shelter.*\(paragraph 9\)/);
  assert.doesNotMatch(parsed[1]!.text ?? "", /A balloon arch/);
  assert.match(parsed[2]!.text ?? "", /A balloon arch.*\(paragraph 19\)/);
  assert.match(parsed[3]!.text ?? "", /megaphone.*\(paragraph 26\)/);
  assert.doesNotMatch(parsed[1]!.text ?? "", /\bB Animal\b/);
  assert.doesNotMatch(parsed[2]!.text ?? "", /\bC Day\b/);
  assert.doesNotMatch(parsed[3]!.text ?? "", /\bD her\b/);
});

test("parseSingleQuestionFromPage keeps A balloon inside choice C only", () => {
  const q = parseSingleQuestionFromPage(stem + quotedChoices);
  assert.ok(q);
  assert.doesNotMatch(q!.choices[0]!.text ?? "", /Then we can sell/);
  assert.doesNotMatch(q!.choices[1]!.text ?? "", /A balloon arch/);
  assert.match(q!.choices[2]!.text ?? "", /A balloon arch/);
});

test("parseSingleQuestionFromPage handles quote-before-A-label PDF scramble", () => {
  const scrambled =
    'Which sentence from the passage best connects to this idea? "Raccoon paws have five fingers, just like a person\'s hands do." A (paragraph 2) B "Exactly what a raccoon eats depends on where it lives." (paragraph 4) "\uFFFDey use the many nerves on the bottoms of their paws to feel their food." C (paragraph 5) "In this home range, they have many hiding places that they use as dens." D (paragraph 8) 23';

  const q = parseSingleQuestionFromPage(scrambled);
  assert.ok(q);
  assert.equal(
    q!.stem,
    "Which sentence from the passage best connects to this idea?",
  );
  assert.match(q!.choices[0]!.text ?? "", /Raccoon paws.*\(paragraph 2\)/);
  assert.doesNotMatch(q!.choices[0]!.text ?? "", /\sA\s+\(paragraph/);
  assert.match(q!.choices[1]!.text ?? "", /Exactly what a raccoon eats.*\(paragraph 4\)/);
  assert.match(q!.choices[2]!.text ?? "", /They use the many nerves.*\(paragraph 5\)/);
  assert.match(q!.choices[3]!.text ?? "", /many hiding places.*\(paragraph 8\)/);
});

test("elaQuestionStem strips choices when PDF puts quote before A label", () => {
  const combined =
    'Which sentence from the passage best connects to this idea? "Raccoon paws have five fingers, just like a person\'s hands do." A (paragraph 2) B "Exactly what a raccoon eats depends on where it lives." (paragraph 4) C "They use the many nerves on the bottoms of their paws to feel their food." (paragraph 5) D "In this home range, they have many hiding places that they use as dens." (paragraph 8)';

  const stem = elaQuestionStem(combined, []);
  assert.equal(stem, "Which sentence from the passage best connects to this idea?");
});
