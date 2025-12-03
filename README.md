# Videaw - Affirmation Video Generator

An advanced affirmation and meditation video generator with AI-powered script generation, professional voiceover, and customizable video editing features.

## ✨ Features

### 🎬 Video Production
- **Background Media**: Upload images or videos as backgrounds
- **XML Timing Support**: ⭐ NEW! Upload XML files to control precise image timing
  - Supports Final Cut Pro XML (FCPXML)
  - Supports Adobe Premiere Pro XML
  - Supports custom simple XML format
  - Last image automatically extends to video end
- **Ken Burns Animation**: Optional zoom/pan effects on images
- **Video Overlays**: Add semi-transparent video overlays
- **Subscribe Animations**: Customizable subscribe button animations

### 🎤 Audio & Voice
- **AI Voiceover**: High-quality Kokoro TTS with customizable voices
- **Background Music**: Add music with auto-ducking and fade-out
- **Audio Equalizer**: Built-in EQ with presets (Bass Boost, Treble Boost, etc.)
- **Word-Level Timing**: Precise word-by-word subtitle timing

### 🤖 AI-Powered Script Generation
- **Multiple AI Providers**: Anthropic Claude, OpenAI, XAI
- **Script Types**: Affirmations or guided meditations
- **Custom Prompts**: Generate scripts from your ideas
- **Length Options**: Short or long format videos

### 🎨 Customization
- **Caption Positioning**: Control subtitle vertical position
- **Max Characters Per Line**: Adjust subtitle line length
- **Speech Speed**: Control voiceover pace
- **Subscribe Button Placement**: Custom positioning and frequency

### 📊 Advanced Features
- **Scene Management**: Create and manage multiple scenes with timings
- **Image Generation**: AI-powered scene image generation (Fal.ai)
- **Prompt Generation**: Auto-generate image prompts for scenes
- **Timeline View**: Visual timeline editor for scenes

## 🆕 XML Timing Feature

The XML Timing feature allows you to create perfectly timed video edits by uploading:
1. Your background images
2. An XML file with timing information

**Benefits:**
- Frame-accurate timing control
- Perfect sync with pre-edited sequences
- Professional workflow integration (Final Cut Pro, Premiere Pro)
- Automatic extension of the last image to video end

📖 **See [XML_TIMING_GUIDE.md](XML_TIMING_GUIDE.md) for detailed instructions and examples**

Sample XML files included:
- `sample_timing.xml` - Simple custom format
- `sample_fcpxml.xml` - Final Cut Pro format

## Project info

**URL**: https://lovable.dev/projects/536a137c-4338-4b86-9f2f-503f9f199a0e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/536a137c-4338-4b86-9f2f-503f9f199a0e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/536a137c-4338-4b86-9f2f-503f9f199a0e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
