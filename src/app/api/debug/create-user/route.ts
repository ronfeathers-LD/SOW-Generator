import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, role = 'user' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('Creating user:', { email, name, role });

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        message: 'User already exists', 
        user: existingUser 
      });
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    console.log('User created successfully:', newUser);
    return NextResponse.json({ 
      message: 'User created successfully', 
      user: newUser 
    });

  } catch (error) {
    console.error('Error in create-user endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 