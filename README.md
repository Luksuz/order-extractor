# HairStyle AI - Hair Accessories Recommendation App

A modern, AI-powered e-commerce app that provides personalized hair accessory recommendations based on selfie analysis.

## Features

- **AI-Powered Analysis**: Upload a selfie to get AI analysis of your hair color, face shape, and skin tone
- **Smart Recommendations**: Get 3 personalized product recommendations based on your unique features
- **Modern UI**: Beautiful, responsive design with gradient themes and smooth animations
- **Product Catalog**: Curated selection of hair accessories including headbands, clips, and scrunchies

## How It Works

1. **Upload a Selfie**: Take or upload a clear photo of yourself
2. **AI Analysis**: Our AI analyzes your:
   - Hair color (blonde, brunette, black, red, grey)
   - Face shape (oval, round, square, heart, diamond, oblong)
   - Skin tone (warm, cool, neutral)
3. **Get Recommendations**: Receive 3 personalized product suggestions with detailed explanations of why they're perfect for you

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom gradients and animations
- **AI**: OpenAI GPT-4o Vision for image analysis
- **Components**: Radix UI components with shadcn/ui
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Product Matching Algorithm

The app uses a sophisticated scoring system to match products to users:

- **Face Shape Compatibility** (3 points): Products are scored based on how well they complement different face shapes
- **Hair Color Harmony** (2 points): Recommendations consider which colors and styles work best with your hair color
- **Skin Tone Matching** (2 points): Products are matched to complement warm, cool, or neutral skin undertones

## Product Catalog

The app includes a curated selection of hair accessories:

- **Headbands**: Silk ribbon headbands, wire twist headbands
- **Clips**: Pearl hair clips, tortoiseshell claw clips
- **Scrunchies**: Velvet scrunchies, satin sleep scrunchies

Each product includes detailed information about which face shapes, hair colors, and skin tones it's best suited for.

## Future Enhancements

- Shopping cart and checkout functionality
- User accounts and purchase history
- Expanded product catalog
- Advanced filtering and search
- Social sharing features
- Mobile app version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 