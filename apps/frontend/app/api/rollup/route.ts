import { NextRequest, NextResponse } from 'next/server';
import { searchRollupCandidates } from '@/lib/rollup/assist-rollup';
// import { summarizeRollup } from '@/lib/rollup/summarize-rollup';


export async function POST(request: NextRequest) {
  try {
    // 1. Parse criteria from request body
    const criteria = await request.json();

    // 2. Search for rollup candidates
    const candidates = await searchRollupCandidates(criteria);
    // const summary = await summarizeRollup(criteria, candidates);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}