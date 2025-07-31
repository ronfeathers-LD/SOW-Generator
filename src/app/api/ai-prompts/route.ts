import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: prompt, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching AI prompt:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error in AI prompt GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 