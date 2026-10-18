import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_DUEL_CSV, parseDuelQuestions, serializeDuelQuestions } from '../../../../../duel/duel-utils';

const filePath = path.join(process.cwd(), 'duel/questions.csv');

function ensureQuestionFile() {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, DEFAULT_DUEL_CSV, 'utf-8');
  }
}

export async function GET() {
  try {
    ensureQuestionFile();
    const csv = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({
      success: true,
      csv,
      questions: parseDuelQuestions(csv),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const csv = String(body?.csv || '');
    const questions = parseDuelQuestions(csv);

    if (!questions.length) {
      return NextResponse.json({ success: false, error: 'CSV must contain at least one question.' }, { status: 400 });
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, serializeDuelQuestions(questions), 'utf-8');

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}