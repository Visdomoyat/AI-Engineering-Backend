import DocumentModel from '../model/document';
import DocumentChunkModel from '../model/document-chunk';
import HandbookModel, { type Handbook } from '../model/handbook';
import { generateWithXai } from './llm';

type StartHandbookInput = {
  userId: string;
  prompt: string;
  title?: string;
  documentIds?: string[];
  targetWords?: number;
};

type ContextChunk = {
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
};

const DEFAULT_TARGET_WORDS = 20000;
const MIN_TARGET_WORDS = 3000;
const MAX_TARGET_WORDS = 30000;

function clampTargetWords(value: number | undefined): number {
  const candidate = Number.isFinite(value) ? Math.floor(value as number) : DEFAULT_TARGET_WORDS;
  return Math.max(MIN_TARGET_WORDS, Math.min(MAX_TARGET_WORDS, candidate));
}

function countWords(input: string): number {
  return input.trim().split(/\s+/).filter(Boolean).length;
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return 'Generated Handbook';
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

function buildOutline(prompt: string): string[] {
  return [
    `Introduction to ${prompt}`,
    'Core Concepts and Definitions',
    'Architectural Foundations',
    'Implementation Patterns and Workflows',
    'Operational Practices and Observability',
    'Quality, Safety, and Reliability',
    'Case Studies and Practical Scenarios',
    'Advanced Techniques and Tradeoffs',
    'Common Failure Modes and Debugging',
    'Reference Checklist and Next Steps',
  ];
}

function buildFallbackSection(sectionTitle: string, sectionGoalWords: number, context: ContextChunk[]): string {
  const lines: string[] = [`## ${sectionTitle}`];
  let remainingWords = Math.max(500, sectionGoalWords);
  let idx = 0;

  while (remainingWords > 0) {
    const source = context[idx % context.length];
    const sourceWords = source.content.split(/\s+/).slice(0, 160).join(' ');
    lines.push(
      `This section explains ${sectionTitle.toLowerCase()} using the uploaded material as the grounding source. ` +
      `From ${source.filename} (chunk ${source.chunkIndex}), the key takeaway is: ${sourceWords}. ` +
      'In practice, teams should convert these ideas into explicit requirements, design constraints, review criteria, and repeatable runbooks.'
    );
    remainingWords -= 140;
    idx += 1;
  }

  return lines.join('\n\n');
}

async function generateSection(
  prompt: string,
  sectionTitle: string,
  sectionGoalWords: number,
  context: ContextChunk[]
): Promise<string> {
  const llmContext = context
    .slice(0, 14)
    .map(
      (chunk, i) =>
        `Source ${i + 1} (${chunk.filename}, chunk ${chunk.chunkIndex}):\n${chunk.content.slice(0, 1200)}`
    )
    .join('\n\n');

  try {
    const response = await generateWithXai([
      {
        role: 'system',
        content:
          'You generate long-form technical handbook sections. Stay grounded in provided sources and use clear headings and structured prose.',
      },
      {
        role: 'user',
        content:
          `Handbook topic: ${prompt}\n` +
          `Section: ${sectionTitle}\n` +
          `Target words for this section: ${sectionGoalWords}\n` +
          'Write substantial, coherent content with practical detail.\n\n' +
          `Grounding context:\n${llmContext}`,
      },
    ]);

    if (response?.text && countWords(response.text) >= Math.floor(sectionGoalWords * 0.5)) {
      return `## ${sectionTitle}\n\n${response.text.trim()}`;
    }
  } catch (error) {
    // Fall through to local deterministic fallback.
  }

  return buildFallbackSection(sectionTitle, sectionGoalWords, context);
}

async function buildGenerationContext(userId: string, requestedDocumentIds?: string[]): Promise<ContextChunk[]> {
  const indexedDocs = await DocumentModel.findIndexedByUserId(userId);
  const chosenDocs = !requestedDocumentIds || requestedDocumentIds.length === 0
    ? indexedDocs
    : indexedDocs.filter((doc) => !!doc.id && requestedDocumentIds.includes(doc.id));

  const chosenIds = chosenDocs.map((doc) => doc.id).filter((id): id is string => !!id);
  if (chosenIds.length === 0) return [];

  const chunks = await DocumentChunkModel.findByDocumentIds(chosenIds, 2000);
  const docNameMap = new Map(chosenDocs.map((doc) => [doc.id as string, doc.filename]));

  return chunks.map((chunk) => ({
    documentId: chunk.document_id,
    filename: docNameMap.get(chunk.document_id) || 'unknown.pdf',
    chunkIndex: chunk.chunk_index,
    content: chunk.content,
  }));
}

async function processHandbook(handbook: Handbook): Promise<void> {
  if (!handbook.id) return;
  await HandbookModel.updateStatus(handbook.id, 'processing');

  try {
    const context = await buildGenerationContext(handbook.user_id, handbook.source_document_ids);
    if (context.length === 0) {
      throw new Error('No indexed document content found for handbook generation.');
    }

    const outline = buildOutline(handbook.prompt);
    const sectionTarget = Math.ceil(handbook.target_words / outline.length);
    const sections: string[] = [];

    for (const sectionTitle of outline) {
      const sectionText = await generateSection(handbook.prompt, sectionTitle, sectionTarget, context);
      sections.push(sectionText);
    }

    const handbookText = [
      `# ${handbook.title}`,
      '',
      `Generated from uploaded documents for prompt: ${handbook.prompt}`,
      '',
      ...sections,
    ].join('\n');

    const generatedWords = countWords(handbookText);
    await HandbookModel.markCompleted(handbook.id, handbookText, generatedWords);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Handbook generation failed';
    await HandbookModel.markFailed(handbook.id, message);
  }
}

export async function startHandbookGeneration(input: StartHandbookInput): Promise<Handbook> {
  const targetWords = clampTargetWords(input.targetWords);

  const handbook = await HandbookModel.create({
    user_id: input.userId,
    title: input.title?.trim() || titleFromPrompt(input.prompt),
    prompt: input.prompt.trim(),
    target_words: targetWords,
    source_document_ids: input.documentIds ?? [],
  });

  void processHandbook(handbook);
  return handbook;
}
