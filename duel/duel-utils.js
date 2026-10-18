export const DUEL_STATE_KEY = 'duel-standalone-state-v1';
export const DUEL_SYNC_KEY = 'duel-questions-version-v1';

export const ANSWERS = ['A', 'B', 'C', 'D'];

export const DEFAULT_DUEL_CSV = `category,question,A,B,C,D,correct
Human Body,"In the human body, which of these parts is found the lowest down?","Appendix","Gall bladder","Pancreas","Liver",A
Music,"Which country has won the Eurovision Song Contest the greatest number of times?","Israel","Ireland","Luxembourg","Greece",B
Science,"Which planet is commonly known as the Red Planet?","Venus","Jupiter","Mars","Mercury",C
History,"Which city is home to the Colosseum?","Athens","Rome","Paris","Istanbul",B
Geography,"Which ocean is the largest on Earth?","Indian Ocean","Atlantic Ocean","Arctic Ocean","Pacific Ocean",D
Arts,"Which artist painted the Mona Lisa?","Michelangelo","Leonardo da Vinci","Raphael","Donatello",B
Language,"What is the most common vowel in English words?","A","E","I","O",B
Nature,"Which animal is the fastest land mammal?","Cheetah","Lion","Horse","Antelope",A
`;

export const DEFAULT_QUESTIONS = parseDuelQuestions(DEFAULT_DUEL_CSV);

export function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function serializeDuelQuestions(questions) {
  const header = ['category', 'question', 'A', 'B', 'C', 'D', 'correct'];
  const rows = [header.join(',')];

  for (const question of questions) {
    rows.push(
      [
        question.category || '',
        question.question || '',
        question.A || '',
        question.B || '',
        question.C || '',
        question.D || '',
        question.correct || 'A',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return rows.join('\n') + '\n';
}

function parseCsvRow(text) {
  const cells = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ',') {
      cells.push(cell);
      cell = '';
      continue;
    }

    cell += character;
  }

  cells.push(cell);
  return cells.map((value) => value.trim());
}

export function parseDuelQuestions(csvText) {
  const rows = String(csvText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) return [];

  const header = parseCsvRow(rows[0]).map((cell) => cell.toLowerCase());
  const indexOf = (name) => header.indexOf(name.toLowerCase());
  const questionIndex = indexOf('question');
  const categoryIndex = indexOf('category');
  const correctIndex = indexOf('correct');
  const optionIndexes = ANSWERS.map((answer) => indexOf(answer));

  const questions = [];

  for (const row of rows.slice(1)) {
    const cells = parseCsvRow(row);
    const questionText = cells[questionIndex] || '';
    if (!questionText) continue;

    questions.push({
      category: cells[categoryIndex] || 'General',
      question: questionText,
      A: cells[optionIndexes[0]] || '',
      B: cells[optionIndexes[1]] || '',
      C: cells[optionIndexes[2]] || '',
      D: cells[optionIndexes[3]] || '',
      correct: (cells[correctIndex] || 'A').trim().toUpperCase(),
    });
  }

  return questions;
}
