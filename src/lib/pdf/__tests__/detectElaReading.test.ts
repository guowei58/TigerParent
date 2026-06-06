import assert from "node:assert/strict";
import test from "node:test";
import {
  detectElaReadingProblems,
  extractQuestionNumberFromPageFooter,
  parseSingleQuestionFromPage,
  splitMcqBlocks,
} from "../detectElaReading";

test("splitMcqBlocks does not split on mid-question in paragraphs", () => {
  const page =
    "2 What do the details in paragraphs 2 and 9 show about Sylvie? A She likes playing on the swings. B She cares about animals. C She knows a lot about the town. D She is a talented artist. 3 Based on paragraph 14, why does Sammy make a confused face in paragraph 15? A He is surprised that Sylvie thinks it is getting late. B He is disappointed that Sylvie was ready before him. C He is worried his parents did not pack everything. D He is not sure why they need a booth for the dog.";

  const blocks = splitMcqBlocks(page);
  assert.equal(blocks.length, 2);
  assert.equal(
    blocks[0]!.stem,
    "What do the details in paragraphs 2 and 9 show about Sylvie?",
  );
});

test("parseSingleQuestionFromPage strips prior question choice bleed before spread stem", () => {
  const page =
    'D It introduces a new character. Which meaning of the word "spread" is used in paragraph 5? A scattered around B grew slowly C became known D shared freely 8 Page 9 GO ON Session 1';

  const q = parseSingleQuestionFromPage(page);
  assert.ok(q);
  assert.match(q!.stem, /^Which meaning of the word "spread"/);
  assert.doesNotMatch(q!.stem, /introduces a new character/);
  assert.equal(q!.choices[0]!.text, "scattered around");
  assert.equal(q!.choices[3]!.text, "shared freely");
});

test("parseSingleQuestionFromPage returns only the first question on a page", () => {
  const page4 =
    'In paragraph 7, what does Sylvie mean when she says, "Sounds more stellar, doesn\'t it?" A She wants people to think the event will be amazing. B She wants people to be sure art is part of the event. C She wants people to bring their own paint to the event. D She wants people to know the event will help animals. What do the details in paragraphs 2 and 9 show about Sylvie? A She likes playing on the swings. B She cares about animals. C She knows a lot about the town. D She is a talented artist.';

  const q1 = parseSingleQuestionFromPage(page4);
  assert.ok(q1);
  assert.match(q1!.stem, /^In paragraph 7/);
  assert.equal(q1!.choices[3]!.text, "She wants people to know the event will help animals.");

  const page6 =
    "Based on paragraph 14, why does Sammy make a confused face in paragraph 15? A He is surprised that Sylvie thinks it is getting late. B He is disappointed that Sylvie was ready before him. C He is worried his parents did not pack everything. D He is not sure why they need a booth for the dog. 3 Page 5 Session 1 GO ON";

  const q3 = parseSingleQuestionFromPage(page6);
  assert.ok(q3);
  assert.equal(q3!.choices[0]!.text, "He is surprised that Sylvie thinks it is getting late.");
  assert.equal(q3!.choices[3]!.text, "He is not sure why they need a booth for the dog.");
});

test("parseSingleQuestionFromPage keeps full stem and paragraph 15 on bleed pages", () => {
  const page =
    '"Preparation is the key to success" is a common saying that means when you plan for an event, it is more likely to go well. Which paragraph best shows how this idea is demonstrated in the story? A paragraph 1 B paragraph 3 C paragraph 11 D paragraph 15 Which detail best expresses a central idea of the story? A foo B bar C baz D qux 4 5 6 GO ON';

  const q = parseSingleQuestionFromPage(page);
  assert.ok(q);
  assert.match(q!.stem, /Preparation is the key to success/);
  assert.match(q!.stem, /Which paragraph best shows/);
  assert.equal(q!.choices[3]!.text, "paragraph 15");
});

test("parseSingleQuestionFromPage clips raccoon passage bleed in choice D", () => {
  const page20 =
    "Which sentence best explains why raccoons mostly come out at night? A Raccoons find their food when it is dark. B Raccoons spend most of their time alone. C Raccoons hide during the day to keep safe. D Raccoons have black masks and tail rings. In which section would the reader find information about what raccoons do during the winter? A \"Flexible Fingers\" B \"Eating Almost Anything\" C \"Night and Day\" D \"Many Different Dens\" 20";

  const q = parseSingleQuestionFromPage(page20);
  assert.ok(q);
  assert.match(q!.stem, /Which sentence best explains why raccoons mostly come out at night/);
  assert.equal(q!.choices[3]!.text, "Raccoons have black masks and tail rings.");
});

test("parseSingleQuestionFromPage parses quoted section titles", () => {
  const page21 =
    "In which section would the reader find information about what raccoons do during the winter? A \u201cFlexible Fingers\u201d B \u201cEating Almost Anything\u201d C \u201cNight and Day\u201d D \u201cMany Different Dens\u201d 21 Page 22 GO ON Session 1";

  const q = parseSingleQuestionFromPage(page21);
  assert.ok(q);
  assert.match(q!.stem, /In which section would the reader find/);
  assert.equal(q!.choices[3]!.text, "\u201cMany Different Dens\u201d");
});

test("parseSingleQuestionFromPage keeps only first question when page has two", () => {
  const page22 =
    'Animals learn to do things a certain way because of their habitat. Which sentence from the passage best connects to this idea? A "Raccoon paws have five fingers, just like a person\'s hands do." (paragraph 2) B "Exactly what a raccoon eats depends on where it lives." (paragraph 4) C "They use the many nerves on the bottoms of their paws to feel their food." (paragraph 5) D "In this home range, they have many hiding places that they use as dens." (paragraph 8) Which detail from the passage best shows what the author thinks about raccoons? A "Raccoons are very smart and quick." (paragraph 3) B "Raccoons living near people also eat pet food . . ." (paragraph 4) C "Raccoons often dip their food in water . . ." (paragraph 5) D "Raccoons can sometimes spread diseases to people." (paragraph 11) 22 23 GO ON';

  const q = parseSingleQuestionFromPage(page22);
  assert.ok(q);
  assert.match(q!.stem, /Animals learn to do things/);
  assert.match(q!.choices[3]!.text ?? "", /paragraph 8/);
  assert.doesNotMatch(q!.choices[3]!.text ?? "", /Which detail from the passage/);
});

test("trimPageToFirstShortAnswer keeps one short-response item per page", () => {
  const page =
    "This is question is worth 2 credits. What does pests mean as it is used in paragraph 6? Use two details from the passage to support your response. This is question is worth 2 credits. What is a central idea of the passage? Use two details from the passage to support your response. 24 25 STOP";

  const d = detectElaReadingProblems(
    [
      { pageNumber: 19, text: page },
      {
        pageNumber: 20,
        text: "This is question is worth 2 credits. What is a central idea of the passage? Use two details from the passage to support your response. 25 Page 24 Session 1 STOP",
      },
      { pageNumber: 21, text: "Grade 3 ELA Answer Key 24. Answer: n/a" },
    ],
    1,
  );

  const q24 = d.regions.find((r) => r.problemNumber === 24);
  const q25 = d.regions.find((r) => r.problemNumber === 25);
  assert.ok(q24);
  assert.ok(q25);
  assert.match(q24!.cleanedText ?? "", /What does pests mean/);
  assert.doesNotMatch(q24!.cleanedText ?? "", /central idea of the passage/);
  assert.match(q25!.cleanedText ?? "", /central idea of the passage/);
});

test("extractQuestionNumberFromPageFooter reads NY footer clusters", () => {
  assert.equal(
    extractQuestionNumberFromPageFooter(
      "How does the graphic support the information in paragraph 2? A x B y C z D w 19 20 21 GO ON",
    ),
    19,
  );
  assert.equal(
    extractQuestionNumberFromPageFooter(
      'In which section would the reader find information? A "Flexible Fingers" B "Eating Almost Anything" C "Night and Day" D "Many Different Dens" 21 Page 22 GO ON Session 1',
    ),
    21,
  );
  assert.equal(
    extractQuestionNumberFromPageFooter(
      "Which sentence best explains why raccoons mostly come out at night? A a B b C c D d 20 21 Page 22 GO ON Session 1",
    ),
    20,
  );
});

test("detectElaReadingProblems includes image-only passage intro pages", () => {
  const pages = [
    { pageNumber: 1, text: "By the end of the story, how does Sylvie feel? A ok B sad C mad D glad 6 GO ON" },
    { pageNumber: 2, text: "" },
    {
      pageNumber: 3,
      text: "Flexible Fingers Raccoons have round bodies that are covered in thick brown or gray fur. They have black masks on their faces and black rings on their tails. Raccoons are very smart and quick. They can use their flexible fingers on their front paws to do things that most other animals cannot do.",
    },
    {
      pageNumber: 4,
      text: "Night and Day Raccoons are mostly nocturnal. This means that they rest during the day and are active at night. Raccoons keep safe from predators and people by hiding during the day.",
    },
    { pageNumber: 5, text: "Grade 3 ELA Answer Key 19. Answer: A" },
  ];

  const result = detectElaReadingProblems(pages, 1);
  assert.equal(result.passages.length, 1);
  assert.deepEqual(result.passages[0]!.pageNumbers, [2, 3, 4]);
});

test("detectElaReadingProblems picks up NY constructed-response pages after passage", () => {
  const pages = [
    {
      pageNumber: 1,
      text: "Read this story. Then answer questions 38 and 39. Honeysuckle House by Anna Wang. Ting has lived in China her whole life.",
    },
    {
      pageNumber: 2,
      text: "The airport was busy. Po Po held Ting's hand as they walked through the crowds. Voices around them were flat. Ting wondered what America would feel like.",
    },
    {
      pageNumber: 3,
      text: "14303025 Why does Po Po tell Ting she needs to be brave? Use two details from the story to support your response. Primary CCLS: RL.3.3",
    },
    {
      pageNumber: 4,
      text: "14303027 Why is the noodle soup important to the story (paragraphs 3 and 7)? Use two details from the story to support your response. Primary CCLS: RL.3.5",
    },
    { pageNumber: 5, text: "Grade 3 ELA Answer Key 38. Answer: n/a 39. Answer: n/a" },
  ];

  const result = detectElaReadingProblems(pages, 1);
  assert.equal(result.passages.length, 1);
  assert.deepEqual(result.passages[0]!.pageNumbers, [1, 2]);
  assert.equal(result.passages[0]!.questionRangeStart, 38);
  assert.equal(result.passages[0]!.questionRangeEnd, 39);
  assert.equal(result.regions.length, 2);
  assert.equal(result.regions[0]!.problemNumber, 38);
  assert.equal(result.regions[1]!.problemNumber, 39);
  assert.equal(result.regions[0]!.questionType, "open_response");
  assert.equal(result.regions[0]!.requiresImage, true);
});
