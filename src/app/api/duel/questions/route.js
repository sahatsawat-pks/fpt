import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_DUEL_CSV, parseDuelQuestions, serializeDuelQuestions } from '../../../../../duel/duel-utils';
import { getKVData, saveKVData } from '@/lib/kv';

const filePath = path.join(process.cwd(), 'duel/questions.csv');

function readLocalCsv() {
  try {
    if (!fs.existsSync(filePath)) {
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, DEFAULT_DUEL_CSV, 'utf-8');
      } catch (e) {}
      return DEFAULT_DUEL_CSV;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return DEFAULT_DUEL_CSV;
  }
}

function writeLocalCsv(content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    if (err.code !== 'EROFS') {
      console.error('Error writing duel questions csv:', err);
    }
  }
}

export async function GET() {
  try {
    const csv = await getKVData('fpt_duel_questions', readLocalCsv);
    return NextResponse.json({
      success: true,
      csv,
      questions: parseDuelQuestions(csv || DEFAULT_DUEL_CSV),
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

    const serialized = serializeDuelQuestions(questions);
    await saveKVData('fpt_duel_questions', serialized, writeLocalCsv);

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}