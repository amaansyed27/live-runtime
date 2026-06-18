import { classifyMemoryDraft, classifyMemoryText } from "./classifier";

interface ClassifierCase {
  name: string;
  input: string;
  expectedClass: string;
  expectedDynamicClass?: string;
  expectedTopic?: string;
}

const cases: ClassifierCase[] = [
  {
    name: "stable preference",
    input: "From now on keep answers shorter and concise.",
    expectedClass: "preference"
  },
  {
    name: "project UI memory",
    input: "The companion arrow button should stay inside the input box and the spacing needs to be aligned.",
    expectedClass: "projectMemory",
    expectedDynamicClass: "companion-ui",
    expectedTopic: "ui"
  },
  {
    name: "memory architecture",
    input: "Add a memory-history classifier with fast hash indexes and DB-level retrieval.",
    expectedClass: "projectMemory",
    expectedDynamicClass: "memory-indexing",
    expectedTopic: "memory"
  },
  {
    name: "pc control action",
    input: "Open the app and run the desktop command for this repo.",
    expectedClass: "actionRequest",
    expectedDynamicClass: "repo-workflow"
  },
  {
    name: "reusable workflow",
    input: "Every time I open this project, run npm run desktop and watch the logs.",
    expectedClass: "skillCandidate",
    expectedDynamicClass: "repo-workflow"
  },
  {
    name: "voice configuration",
    input: "Use a more natural TTS voice and remember my voice settings.",
    expectedClass: "preference",
    expectedDynamicClass: "voice-config",
    expectedTopic: "voice"
  }
];

export function runMemoryClassifierEvaluation(): void {
  for (const testCase of cases) {
    const result = classifyMemoryText(testCase.input);
    expect(result.primaryClass === testCase.expectedClass, `${testCase.name}: expected ${testCase.expectedClass}, got ${result.primaryClass}`);
    expect(result.index.termHashes.length > 0, `${testCase.name}: expected term hashes`);
    expect(Boolean(result.index.contentHash), `${testCase.name}: expected content hash`);

    if (testCase.expectedDynamicClass) {
      expect(
        result.dynamicClasses.includes(testCase.expectedDynamicClass),
        `${testCase.name}: expected dynamic class ${testCase.expectedDynamicClass}, got ${result.dynamicClasses.join(", ")}`
      );
    }

    if (testCase.expectedTopic) {
      expect(
        result.index.topics.includes(testCase.expectedTopic),
        `${testCase.name}: expected topic ${testCase.expectedTopic}, got ${result.index.topics.join(", ")}`
      );
    }
  }

  const classified = classifyMemoryDraft({
    kind: "chat",
    scope: "session",
    title: "Memory classifier",
    content: "The classifier should save class tags, subclass tags, topic tags, content hash, and term hashes.",
    source: "classifier-test"
  });

  expect(classified.draft.tags.some((tag) => tag.startsWith("class:")), "classified draft should include class tag");
  expect(classified.draft.tags.some((tag) => tag.startsWith("subclass:")), "classified draft should include subclass tag");
  expect(classified.draft.tags.some((tag) => tag.startsWith("topic:")), "classified draft should include topic tag");
  expect(classified.draft.tags.some((tag) => tag.startsWith("hash:")), "classified draft should include content hash tag");
  expect(classified.draft.tags.some((tag) => tag.startsWith("term:")), "classified draft should include term hash tags");
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

runMemoryClassifierEvaluation();
console.log(`Memory classifier evaluation passed: ${cases.length} cases`);
