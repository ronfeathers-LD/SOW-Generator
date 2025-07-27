#!/bin/bash

echo "🚀 Setting up Google Gemini integration for SOW Generator..."

# Install Google AI SDK
echo "📦 Installing @google/generative-ai package..."
npm install @google/generative-ai

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    touch .env.local
    echo "# Database" >> .env.local
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/sow_generator\"" >> .env.local
    echo "" >> .env.local
    echo "# NextAuth" >> .env.local
    echo "NEXTAUTH_SECRET=\"your-nextauth-secret\"" >> .env.local
    echo "NEXTAUTH_URL=\"http://localhost:3000\"" >> .env.local
    echo "" >> .env.local
    echo "# Google OAuth" >> .env.local
    echo "GOOGLE_CLIENT_ID=\"your-google-client-id\"" >> .env.local
    echo "GOOGLE_CLIENT_SECRET=\"your-google-client-secret\"" >> .env.local
    echo "" >> .env.local
    echo "# Mapbox (for address autocomplete)" >> .env.local
    echo "NEXT_PUBLIC_MAPBOX_TOKEN=\"your-mapbox-public-token\"" >> .env.local
    echo "" >> .env.local
    echo "# Avoma API" >> .env.local
    echo "AVOMA_API_KEY=\"your-avoma-api-key\"" >> .env.local
    echo "" >> .env.local
    echo "# Google Gemini API" >> .env.local
    echo "GEMINI_API_KEY=\"your-gemini-api-key\"" >> .env.local
else
    echo "✅ .env.local file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Get your Google Gemini API key from: https://makersuite.google.com/app/apikey"
echo "2. Get your Avoma API key from your Avoma account"
echo "3. Update the .env.local file with your API keys"
echo "4. Run 'npm run dev' to start the development server"
echo ""
echo "📖 For detailed instructions, see: AVOMA_INTEGRATION_SETUP.md" 