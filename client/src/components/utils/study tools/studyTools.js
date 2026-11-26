export const QUESTION_TYPES = [
    "Multiple Choice",
    "True or False",
    "Identification",
    "Fill in the Blanks",
    "Matching Type",
    "Enumeration",
    "Short Answer",
    "Essay",
    "Problem Solving",
    "Situational Questions",
    "Other",
];

export function getNoteSections(note) {
    const container = document.createElement("div");
    container.innerHTML = note.content || "";
    const blocks = Array.from(container.children);
    const headings = blocks.filter((block) => /^H[1-3]$/.test(block.tagName));

    if (!headings.length) {
        const paragraphs = blocks.map((block) => block.innerText || block.textContent || "")
            .map((text) => text.trim())
            .filter(Boolean);
        const text = paragraphs.length ? paragraphs : [(container.innerText || container.textContent || "").trim()].filter(Boolean);
        return text.map((content, index) => ({
            id: `${note.id}-topic-${index}`,
            title: content.split(/\s+/).slice(0, 7).join(" ").replace(/[.!?]$/, "") || `Topic ${index + 1}`,
            content,
        }));
    }

    const sections = [];
    let current = null;
    blocks.forEach((block) => {
        if (/^H[1-3]$/.test(block.tagName)) {
            current = {
                id: `${note.id}-section-${sections.length}`,
                title: (block.innerText || block.textContent || "").trim(),
                content: "",
            };
            sections.push(current);
            return;
        }
        const text = (block.innerText || block.textContent || "").trim();
        if (!text) return;
        if (!current) {
            current = { id: `${note.id}-introduction`, title: "Introduction", content: "" };
            sections.push(current);
        }
        current.content = `${current.content} ${text}`.trim();
    });

    return sections.filter((section) => section.content);
}

function getFacts(sections) {
    const facts = sections.flatMap((section) =>
        section.content.split(/(?<=[.!?])\s+|[\r\n]+/)
            .map((text) => text.trim())
            .filter(Boolean)
            .map((text) => ({ section: section.title, text }))
    );
    return [...new Map(facts.map((fact) => [`${fact.section}\u0000${fact.text}`, fact])).values()];
}

export function countStudyFacts(sections) {
    return getFacts(sections).length;
}

export function generateFlashcards(title, sections, instructions = "") {
    const focus = instructions.toLowerCase();
    return {
        id: `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        createdAt: new Date().toISOString(),
        instructions,
        cards: getFacts(sections).map(({ section, text }, index) => ({
            id: `${index}-${section}`,
            question: /definition|term|meaning/.test(focus)
                ? `What does this note say about ${text.match(/^([^:]{1,60}):/)?.[1].trim() || text.split(/\s+/).slice(0, 5).join(" ")}?`
                : /formula|application|apply/.test(focus)
                    ? `How can you apply this idea from ${section}?`
                    : /challeng|exam|deeper|critical/.test(focus)
                        ? `Why is this idea important in ${section}?`
                        : (() => {
                            const term = text.match(/\b(?!the\b|a\b|an\b|this\b|these\b|it\b)([A-Za-z][A-Za-z0-9-]*)/i)?.[1];
                            return term
                                ? `Complete this note from ${section}: ${text.replace(term, "________")}`
                                : `What is an important idea from ${section}?`;
                        })(),
            answer: text,
        })),
    };
}

function createQuestion(type, fact, allFacts, instructions) {
    const { section, text } = fact;
    const matchingOptions = allFacts
        .filter((candidate) => candidate.text !== text)
        .slice(0, 3)
        .map((candidate) => candidate.text);
    const options = [text, ...matchingOptions].sort((a, b) => a.localeCompare(b));

    let question;
    switch (type) {
        case "Multiple Choice":
            question = {
                prompt: `Which statement is supported by the notes about ${section}?`,
                answer: text,
                options,
            };
            break;
        case "True or False":
            question = { prompt: `True or false: ${text}`, answer: "True" };
            break;
        case "Identification":
            question = { prompt: `Identify the topic described by this note: ${text}`, answer: section };
            break;
        case "Fill in the Blanks": {
            const word = text.match(/[A-Za-z0-9][A-Za-z0-9-]*/)?.[0] || text;
            question = { prompt: text.replace(word, "________"), answer: word };
            break;
        }
        case "Matching Type":
            question = { prompt: `Match this note with its topic: ${text}`, answer: section };
            break;
        case "Enumeration":
            question = { prompt: `List the key ideas presented in ${section}.`, answer: text };
            break;
        case "Essay":
            question = { prompt: `Explain the significance of this idea from ${section}: ${text}`, answer: text };
            break;
        case "Problem Solving":
            question = { prompt: `Apply the method or information in this note: ${text}`, answer: text };
            break;
        case "Situational Questions":
            question = { prompt: `How would you apply this idea in a real situation? ${text}`, answer: text };
            break;
        case "Other":
            question = { prompt: `Describe an important idea from ${section}.`, answer: text };
            break;
        default:
            question = { prompt: `In your own words, explain: ${text}`, answer: text };
    }
    if (/college[- ]level|tricky|deeper understanding/i.test(instructions)) {
        question.prompt = `Think carefully. ${question.prompt}`;
    }
    if (/real[- ]world|scenario/i.test(instructions) && type !== "Situational Questions") {
        question.prompt = `Consider a real-world application. ${question.prompt}`;
    }
    return question;
}

export function generateMockExam({ title, sections, questionCounts, instructions }) {
    const facts = getFacts(sections);
    if (!facts.length) throw new Error("The selected sections do not contain enough written content to make an exam.");
    if (Object.values(questionCounts).some((count) => count > facts.length)) {
        throw new Error(`The selected sections contain ${facts.length} distinct facts. Reduce each question type to ${facts.length} questions or select more note content.`);
    }
    let factIndex = 0;
    const questions = Object.entries(questionCounts).flatMap(([type, count]) =>
        Array.from({ length: count }, (_, typeIndex) => {
            const fact = facts[factIndex % facts.length];
            const question = createQuestion(type, fact, facts, instructions);
            factIndex += 1;
            return {
                id: `question-${factIndex}-${typeIndex}`,
                type,
                ...question,
            };
        })
    );

    return {
        id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        createdAt: new Date().toISOString(),
        instructions,
        questions,
    };
}
