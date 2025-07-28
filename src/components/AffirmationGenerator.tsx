import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Play,
  Pause,
  Volume2,
  Keyboard,
  Bot,
  Key,
  Copy,
  FileText,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import OpenAI from "openai";
import { AudioEqualizer } from "@/components/AudioEqualizer";

interface VoiceSettings {
  model: string;
  voice: string;
  speed: number;
}

const AffirmationGenerator = () => {
  const [affirmations, setAffirmations] = useState("");
  const [a4fApiKey, setA4fApiKey] = useState(() => {
    // Load API key from localStorage on component mount
    return localStorage.getItem("a4f-api-key") || "";
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("selected-model") || "provider-6/gpt-4.1";
  });
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem("selected-provider") || "https://api.a4f.co/v1";
  });
  const [selectedProviderType, setSelectedProviderType] = useState(() => {
    return localStorage.getItem("selected-provider-type") || "a4f";
  });
  const [openRouterApiKey, setOpenRouterApiKey] = useState(() => {
    return localStorage.getItem("openrouter-api-key") || "";
  });
  const [openRouterModel, setOpenRouterModel] = useState(() => {
    return localStorage.getItem("openrouter-model") || "openai/gpt-4o";
  });
  const [lastApiCall, setLastApiCall] = useState(0);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    model: "kokoro",
    voice: "af_bella(3)+af_v0nicole(6)+af_kore(1)",
    speed: 0.9,
  });
  const [silenceGap, setSilenceGap] = useState(2.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);

  const [affirmationTimings, setAffirmationTimings] = useState<
    Array<{ text: string; start: number; end: number }>
  >([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptDate, setScriptDate] = useState("");
  const [savedScriptTitle, setSavedScriptTitle] = useState("");
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [scriptType, setScriptType] = useState<"affirmation" | "meditation">(
    "affirmation"
  );
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const [audioLoading, setAudioLoading] = useState(false);
  const [showSampleDialog, setShowSampleDialog] = useState(false);

  // Image generation states
  const [bgImagePrompt, setBgImagePrompt] = useState("");
  const [bgImageLoading, setBgImageLoading] = useState(false);
  const [generatedBgImage, setGeneratedBgImage] = useState<string | null>(null);

  const [thumbnailPrompt, setThumbnailPrompt] = useState("");
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(
    null
  );

  // Image modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Audio Equalizer states
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [processedAudio, setProcessedAudio] = useState<string | null>(null);
  const [eqSettings, setEqSettings] = useState<{
    bands: Array<{ frequency: number; gain: number; label: string }>;
    selectedPreset: string;
    pitchShift: number;
    usePronounced: boolean;
    reverbEnabled: boolean;
    reverbAmount: number;
  } | null>(null);
  const [autoApplyEQ, setAutoApplyEQ] = useState(false);

  const { toast } = useToast();

  // Rate limiting function for API calls
  const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    const minInterval = 5000; // 5 seconds between calls for OpenRouter

    if (timeSinceLastCall < minInterval) {
      const waitTime = Math.ceil((minInterval - timeSinceLastCall) / 1000);
      toast({
        title: "Rate Limited",
        description: `Please wait ${waitTime} seconds before making another request.`,
        variant: "destructive",
      });
      return false;
    }

    setLastApiCall(now);
    return true;
  };

  // Retry function for OpenRouter API calls
  const retryOpenRouterCall = async (
    apiCall: () => Promise<any>,
    maxRetries = 3
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        if (error.message.includes("429") && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          toast({
            title: "Rate Limited - Retrying",
            description: `Attempt ${attempt}/${maxRetries}. Waiting ${
              waitTime / 1000
            }s before retry...`,
            variant: "destructive",
          });
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
  };

  const sampleAffirmations = `I am worthy of all the love, success, and happiness that flows into my life.
My mind is clear, focused, and ready to create miracles today.
I attract abundance in all areas of my life effortlessly.
I am confident in my ability to overcome any challenge that comes my way.
Every breath I take fills me with positive energy and vitality.
I am grateful for this beautiful day and all the blessings it brings.
My body is healthy, strong, and full of life.
Success flows to me naturally and easily.
I am in perfect alignment with my highest purpose.
My dreams are becoming my reality right now.
I choose peace over worry, love over fear.
I am surrounded by supportive and loving people.
My creativity flows freely and inspires others.
I trust the process of life and know everything unfolds perfectly.`;

  const generateScript = async (title: string, date: string) => {
    const apiKey =
      selectedProviderType === "a4f" ? a4fApiKey : openRouterApiKey;
    const apiKeyName = selectedProviderType === "a4f" ? "A4F" : "OpenRouter";

    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${apiKeyName} API key to generate scripts.`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScript(true);

    // Check rate limit for OpenRouter
    if (selectedProviderType === "openrouter" && !checkRateLimit()) {
      setIsGeneratingScript(false);
      return;
    }

    try {
      let completion;

      if (selectedProviderType === "a4f") {
        const a4fClient = new OpenAI({
          apiKey: a4fApiKey,
          baseURL: selectedProvider,
          dangerouslyAllowBrowser: true,
        });

        // Use custom prompt if provided, otherwise use default based on script type
        let prompt = customPrompt.trim();

        if (!prompt) {
          if (scriptType === "affirmation") {
            prompt = `I want you to write 130 Affirmations that covers all aspects of life, titled "${title}". This script should be designed for a YouTube audience interested in listening to Affirmations.
Use clear, single-line affirmations.${
              date
                ? ` Some affirmations should mention the "${date}". It certainly need to be included in the very first affirmation.`
                : ""
            } Don't provide unwanted narrator, music, and such words in the actual script? I want something that I can just pass on to my voiceover artist: IMPORTANT! If a transcript is provided, use it ONLY for context and inspiration - create completely original affirmations. Do not copy the transcript's style or content. Do not use subheadings within the script or * (asterics) in the script. Avoid using "—" in the script. No bracketed content. No abbreviations like "eg", instead use the word example: IMPORTANT!`;
          } else {
            prompt = `Write a (1500-1800) words long meditation script. Write in a manner to consider where ever pause is required. separate it as separate line or sentence. Make sure it is ready for narration no distractions like narrator or music etc should be used in the script. If a transcript is provided, use it ONLY for context and inspiration - create completely original meditation content. Do not copy the transcript's style or content. Do not use subheadings within the script or * (asterics) in the script. Avoid using "—" in the script. No bracketed content. No abbreviations like "eg", instead use the word example: IMPORTANT!`;
          }
        }

        // Replace placeholders in the prompt
        let finalPrompt = prompt
          .replace(/\${title}/g, title)
          .replace(/\${date}/g, date)
          .replace(
            /\${transcript}/g,
            transcript ? cleanTranscript(transcript) : ""
          );

        // Add transcript reference if provided
        if (transcript.trim()) {
          const cleanedTranscript = cleanTranscript(transcript);
          finalPrompt += `\n\nReference transcript for context and style (each line represents a natural pause or individual affirmation):\n${cleanedTranscript}`;
        }

        completion = await a4fClient.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "user", content: finalPrompt }],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        });
      } else {
        // OpenRouter API call using OpenAI SDK (like your working app)
        // Use custom prompt if provided, otherwise use default based on script type
        let prompt = customPrompt.trim();

        if (!prompt) {
          if (scriptType === "affirmation") {
            prompt = `I want you to write 130 Affirmations that covers all aspects of life, titled "${title}". This script should be designed for a YouTube audience interested in listening to Affirmations. Use clear, single-line affirmations.${
              date
                ? ` Some affirmations should mention the "${date}". It certainly need to be included in the very first affirmation.`
                : ""
            } Don't provide unwanted narrator, music, and such words in the actual script? I want something that I can just pass on to my voiceover artist: IMPORTANT! If a transcript is provided, use it ONLY for context and inspiration - create completely original affirmations. Do not copy the transcript's style or content. Do not use subheadings within the script or * (asterics) in the script. Avoid using "—" in the script. No bracketed content. No abbreviations like "eg", instead use the word example: IMPORTANT!`;
          } else {
            prompt = `Write a (1500-1800) words long meditation script. Write in a manner to consider where ever pause is required. separate it as separate line or sentence. Make sure it is ready for narration no distractions like narrator or music etc should be used in the script. If a transcript is provided, use it ONLY for context and inspiration - create completely original meditation content. Do not copy the transcript's style or content. Do not use subheadings within the script or * (asterics) in the script. Avoid using "—" in the script. No bracketed content. No abbreviations like "eg", instead use the word example: IMPORTANT!`;
          }
        }

        // Replace placeholders in the prompt
        let finalPrompt = prompt
          .replace(/\${title}/g, title)
          .replace(/\${date}/g, date)
          .replace(
            /\${transcript}/g,
            transcript ? cleanTranscript(transcript) : ""
          );

        // Add transcript reference if provided
        if (transcript.trim()) {
          const cleanedTranscript = cleanTranscript(transcript);
          finalPrompt += `\n\nReference transcript for context only (use as inspiration, but create original content):\n${cleanedTranscript}`;
        }

        const apiCall = async () => {
          const openRouterClient = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterApiKey,
            defaultHeaders: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "Affirmation Audio Weaver",
            },
            dangerouslyAllowBrowser: true,
          });

          return await openRouterClient.chat.completions.create({
            model: openRouterModel,
            messages: [
              {
                role: "user",
                content: finalPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 4000,
            stream: true,
          });
        };

        completion = await retryOpenRouterCall(apiCall);
      }

      // Handle streaming response
      let generatedScript = "";

      if (selectedProviderType === "a4f") {
        // Handle A4F streaming
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          generatedScript += content;
          setAffirmations(generatedScript);
        }
      } else {
        // Handle OpenRouter streaming
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          generatedScript += content;
          setAffirmations(generatedScript);
        }
      }

      if (generatedScript) {
        // Remove numbering from affirmations (e.g., "1. ", "1) ", "1: ", "1 - ")
        const cleanedScript = generatedScript
          .split("\n")
          .map((line) => line.replace(/^\s*\d+[\.\)\:\-]\s*/, "").trim())
          .filter((line) => line.length > 0)
          .join("\n");

        setAffirmations(cleanedScript);
        setSavedScriptTitle(title); // Save the title for description generation
        toast({
          title: "Script Generated!",
          description: `Successfully generated ${scriptType} script for "${title}"`,
        });
      }
    } catch (error) {
      console.error("Script generation failed:", error);
      toast({
        title: "Generation Failed",
        description:
          "Failed to generate script. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScript(false);
      setShowScriptDialog(false);
    }
  };

  const handleGenerateScript = () => {
    const apiKey =
      selectedProviderType === "a4f" ? a4fApiKey : openRouterApiKey;
    const apiKeyName = selectedProviderType === "a4f" ? "A4F" : "OpenRouter";

    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${apiKeyName} API key first.`,
        variant: "destructive",
      });
      return;
    }

    // Debug OpenRouter connection
    if (selectedProviderType === "openrouter") {
      console.log("OpenRouter Debug Info:", {
        apiKeyLength: openRouterApiKey.length,
        model: openRouterModel,
        hasApiKey: !!openRouterApiKey.trim(),
      });
    }

    setShowScriptDialog(true);
  };

  const handleScriptSubmit = () => {
    if (!scriptTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a script title.",
        variant: "destructive",
      });
      return;
    }

    // Close the dialog immediately
    setShowScriptDialog(false);

    // Show streaming in the script input
    setAffirmations("Generating script...");

    generateScript(scriptTitle, scriptDate);
  };

  const generateDescription = async () => {
    const apiKey =
      selectedProviderType === "a4f" ? a4fApiKey : openRouterApiKey;
    const apiKeyName = selectedProviderType === "a4f" ? "A4F" : "OpenRouter";

    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${apiKeyName} API key to generate descriptions.`,
        variant: "destructive",
      });
      return;
    }

    if (!savedScriptTitle) {
      toast({
        title: "No Script Title",
        description: "Please generate a script first to create a description.",
        variant: "destructive",
      });
      return;
    }

    if (affirmationTimings.length === 0) {
      toast({
        title: "No Content Available",
        description:
          "Please generate audio first to create a description from the content.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);

    // Check rate limit for OpenRouter
    if (selectedProviderType === "openrouter" && !checkRateLimit()) {
      setIsGeneratingDescription(false);
      return;
    }

    try {
      let completion;

      if (selectedProviderType === "a4f") {
        const a4fClient = new OpenAI({
          apiKey: a4fApiKey,
          baseURL: selectedProvider,
          dangerouslyAllowBrowser: true,
        });

        // Create content from affirmations for the prompt
        const srtContent = affirmationTimings
          .map((timing) => timing.text)
          .join("\n");

        const prompt = `Write me a short SEO Optimized Description (3-4 lines only) for this Youtube video based on the srt file. The title is "${savedScriptTitle}". Start with the exact title. Follow that with 3 SEO optimized keywords hashtags for the video and follow that with the same keywords without hashtag and separated by comma.

SRT Content:
${srtContent}`;

        completion = await a4fClient.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
          stream: true,
        });
      } else {
        // OpenRouter API call for description using OpenAI SDK
        const srtContent = affirmationTimings
          .map((timing) => timing.text)
          .join("\n");

        const prompt = `Write me a short SEO Optimized Description (3-4 lines only) for this Youtube video based on the srt file. The title is "${savedScriptTitle}". Start with the exact title. Follow that with 3 SEO optimized keywords hashtags for the video and follow that with the same keywords without hashtag and separated by comma.

SRT Content:
${srtContent}`;

        const apiCall = async () => {
          const openRouterClient = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openRouterApiKey,
            defaultHeaders: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "Affirmation Audio Weaver",
            },
            dangerouslyAllowBrowser: true,
          });

          return await openRouterClient.chat.completions.create({
            model: openRouterModel,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
            stream: true,
          });
        };

        completion = await retryOpenRouterCall(apiCall);
      }

      // Handle streaming response for description
      let generatedDescription = "";

      if (selectedProviderType === "a4f") {
        // Handle A4F streaming
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          generatedDescription += content;
        }
      } else {
        // Handle OpenRouter streaming
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          generatedDescription += content;
        }
      }

      if (generatedDescription) {
        // Download as .txt file
        const blob = new Blob([generatedDescription], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `description.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        toast({
          title: "Description Generated!",
          description: "YouTube description downloaded successfully.",
        });
      }
    } catch (error) {
      console.error("Description generation failed:", error);
      toast({
        title: "Generation Failed",
        description:
          "Failed to generate description. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateBackgroundImage = async () => {
    if (!a4fApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your A4F API key to generate images.",
        variant: "destructive",
      });
      return;
    }

    if (!bgImagePrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt for the background image.",
        variant: "destructive",
      });
      return;
    }

    setBgImageLoading(true);

    try {
      const a4fClient = new OpenAI({
        apiKey: a4fApiKey,
        baseURL: selectedProvider,
        dangerouslyAllowBrowser: true,
      });

      const response = await a4fClient.images.generate({
        model: "provider-3/FLUX.1-dev",
        prompt: bgImagePrompt,
        n: 1,
        size: "1792x1024", // 16:9 ratio
        quality: "standard",
      });

      if (response.data && response.data[0] && response.data[0].url) {
        setGeneratedBgImage(response.data[0].url);
        toast({
          title: "Background Image Generated!",
          description: "Your background image is ready.",
        });
      }
    } catch (error) {
      console.error("Background image generation failed:", error);
      toast({
        title: "Generation Failed",
        description:
          "Failed to generate background image. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setBgImageLoading(false);
    }
  };

  const generateThumbnail = async () => {
    if (!a4fApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your A4F API key to generate images.",
        variant: "destructive",
      });
      return;
    }

    if (!thumbnailPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt for the thumbnail.",
        variant: "destructive",
      });
      return;
    }

    setThumbnailLoading(true);

    try {
      const a4fClient = new OpenAI({
        apiKey: a4fApiKey,
        baseURL: selectedProvider,
        dangerouslyAllowBrowser: true,
      });

      const response = await a4fClient.images.generate({
        model: "provider-3/FLUX.1-dev",
        prompt: thumbnailPrompt,
        n: 1,
        size: "1792x1024", // 16:9 ratio
        quality: "standard",
      });

      if (response.data && response.data[0] && response.data[0].url) {
        setGeneratedThumbnail(response.data[0].url);
        toast({
          title: "Thumbnail Generated!",
          description: "Your thumbnail is ready.",
        });
      }
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      toast({
        title: "Generation Failed",
        description:
          "Failed to generate thumbnail. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setThumbnailLoading(false);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      toast({
        title: "Image Downloaded!",
        description: `${filename} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error("Image download failed:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const expandImage = (imageUrl: string, title: string) => {
    setSelectedImage({ url: imageUrl, title });
    setShowImageModal(true);
  };

  const generateAudioClips = async (affirmationLines: string[]) => {
    const audioClips: Blob[] = [];

    for (let i = 0; i < affirmationLines.length; i++) {
      const affirmation = affirmationLines[i].trim();
      if (!affirmation) continue;

      try {
        setProgress(((i + 1) / affirmationLines.length) * 70); // 70% for individual clips

        const response = await fetch("http://localhost:8880/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: affirmation,
            ...voiceSettings,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate audio for: "${affirmation}"`);
        }

        const audioBlob = await response.blob();
        audioClips.push(audioBlob);
      } catch (error) {
        toast({
          title: "Generation Error",
          description: `Failed to generate audio for affirmation ${i + 1}`,
          variant: "destructive",
        });
        throw error;
      }
    }

    return audioClips;
  };

  const removeInternalPauses = (
    audioBuffer: AudioBuffer,
    maxPauseLength: number = 0.4
  ): AudioBuffer => {
    // Use the same sample rate as the input buffer
    const inputData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const silenceThreshold = 0.01; // Volume threshold for silence detection
    const maxPauseSamples = maxPauseLength * sampleRate;

    const outputData: number[] = [];
    let currentSilenceLength = 0;

    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      const isSilent = Math.abs(sample) < silenceThreshold;

      if (isSilent) {
        currentSilenceLength++;
        // Only add silence if it's shorter than max allowed pause
        if (currentSilenceLength <= maxPauseSamples) {
          outputData.push(sample);
        }
      } else {
        currentSilenceLength = 0;
        outputData.push(sample);
      }
    }

    // Create new audio buffer with reduced pauses using the same sample rate
    const tempContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const outputBuffer = tempContext.createBuffer(
      1,
      outputData.length,
      sampleRate
    );
    const outputChannel = outputBuffer.getChannelData(0);
    for (let i = 0; i < outputData.length; i++) {
      outputChannel[i] = outputData[i];
    }

    // Close the temporary context to free resources
    tempContext.close();

    return outputBuffer;
  };

  const combineAudioClips = async (
    audioClips: Blob[],
    affirmationLines: string[]
  ): Promise<Blob> => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const audioBuffers: AudioBuffer[] = [];
    const timings: Array<{ text: string; start: number; end: number }> = [];

    try {
      // Decode all audio clips and remove internal pauses
      for (const clip of audioClips) {
        const arrayBuffer = await clip.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const processedBuffer = removeInternalPauses(audioBuffer);
        audioBuffers.push(processedBuffer);
      }

      // Calculate total duration with silence gaps
      const totalDuration =
        audioBuffers.reduce((sum, buffer) => sum + buffer.duration, 0) +
        silenceGap * (audioBuffers.length - 1);

      // Create output buffer
      const sampleRate = audioBuffers[0].sampleRate;
      const outputBuffer = audioContext.createBuffer(
        1,
        totalDuration * sampleRate,
        sampleRate
      );
      const outputData = outputBuffer.getChannelData(0);

      // Combine audio with silence gaps and track timings
      let currentTime = 0;
      let currentOffset = 0;
      for (let i = 0; i < audioBuffers.length; i++) {
        const buffer = audioBuffers[i];
        const inputData = buffer.getChannelData(0);
        const startTime = currentTime;
        const endTime = currentTime + buffer.duration;

        // Track timing for .srt generation
        timings.push({
          text: affirmationLines[i].trim(),
          start: startTime,
          end: endTime,
        });

        // Copy audio data
        for (let j = 0; j < inputData.length; j++) {
          outputData[currentOffset + j] = inputData[j];
        }

        currentOffset += inputData.length;
        currentTime = endTime;

        // Add silence gap (except after last clip)
        if (i < audioBuffers.length - 1) {
          const silenceSamples = silenceGap * sampleRate;
          // outputData is already initialized to zeros (silence)
          currentOffset += silenceSamples;
          currentTime += silenceGap;
        }
      }

      // Store timings for .srt generation
      setAffirmationTimings(timings);

      // Convert back to WAV blob
      const result = audioBufferToWav(outputBuffer);
      return result;
    } finally {
      // Close the audio context to free resources
      audioContext.close();
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = buffer.getChannelData(0);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleGenerate = async () => {
    if (!affirmations.trim()) {
      toast({
        title: "No Affirmations",
        description: "Please enter some affirmations to generate audio.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedAudio(null);
    setProcessedAudio(null);
    // Don't reset EQ settings if auto-apply is enabled
    if (!autoApplyEQ) {
      setEqSettings(null);
    }

    try {
      const lines = affirmations.split("\n").filter((line) => line.trim());

      toast({
        title: "Generation Started",
        description: `Processing ${lines.length} affirmations...`,
      });

      const audioClips = await generateAudioClips(lines);

      setProgress(80);
      const combinedAudio = await combineAudioClips(audioClips, lines);

      setProgress(100);
      const audioUrl = URL.createObjectURL(combinedAudio);
      setGeneratedAudio(audioUrl);

      // Auto-apply EQ if enabled OR if EQ settings exist (manual application)
      if ((autoApplyEQ || eqSettings) && eqSettings) {
        try {
          // Create a temporary AudioEqualizer instance to process the audio
          const processAudioWithEQ = async () => {
            const audioContext = new AudioContext();
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Calculate new buffer length based on pitch shift
            const pitchRatio = Math.pow(2, eqSettings.pitchShift / 12);
            const newLength = Math.floor(audioBuffer.length / pitchRatio);

            // Create offline audio context for processing
            const offlineContext = new OfflineAudioContext(
              audioBuffer.numberOfChannels,
              newLength,
              audioBuffer.sampleRate
            );

            // Create source
            const offlineSource = offlineContext.createBufferSource();
            offlineSource.buffer = audioBuffer;

            // Apply pitch shift using playback rate
            offlineSource.playbackRate.setValueAtTime(
              pitchRatio,
              offlineContext.currentTime
            );

            // Create filters for offline processing
            const offlineFilters = eqSettings.bands.map((band, index) => {
              const filter = offlineContext.createBiquadFilter();
              filter.type =
                index === 0
                  ? "lowshelf"
                  : index === eqSettings.bands.length - 1
                  ? "highshelf"
                  : "peaking";
              filter.frequency.setValueAtTime(
                band.frequency,
                offlineContext.currentTime
              );
              filter.Q.setValueAtTime(1, offlineContext.currentTime);
              filter.gain.setValueAtTime(band.gain, offlineContext.currentTime);
              return filter;
            });

            // Create reverb nodes for offline processing
            const offlineConvolver = offlineContext.createConvolver();
            const createImpulseResponse = (
              audioContext: BaseAudioContext,
              duration: number,
              decay: number
            ): AudioBuffer => {
              const sampleRate = audioContext.sampleRate;
              const length = sampleRate * duration;
              const impulse = audioContext.createBuffer(2, length, sampleRate);

              for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                  const n = length - i;
                  const sample =
                    (Math.random() * 2 - 1) * Math.pow(n / length, decay);
                  channelData[i] =
                    i > 0 ? sample * 0.03 + channelData[i - 1] * 0.97 : sample;
                }
              }
              return impulse;
            };

            const offlineImpulseResponse = createImpulseResponse(
              offlineContext,
              2.0,
              2.0
            );
            offlineConvolver.buffer = offlineImpulseResponse;

            // Create gain nodes for offline processing
            const offlineReverbGain = offlineContext.createGain();
            const offlineDryGain = offlineContext.createGain();
            const offlineGain = offlineContext.createGain();

            // Set gains
            offlineGain.gain.setValueAtTime(0.8, offlineContext.currentTime);
            offlineDryGain.gain.setValueAtTime(1.0, offlineContext.currentTime);
            const reverbLevel = eqSettings.reverbEnabled
              ? eqSettings.reverbAmount / 100
              : 0;
            offlineReverbGain.gain.setValueAtTime(
              reverbLevel,
              offlineContext.currentTime
            );

            // Connect nodes with reverb
            offlineSource.connect(offlineFilters[0]);
            offlineFilters.forEach((filter, index) => {
              if (index < offlineFilters.length - 1) {
                filter.connect(offlineFilters[index + 1]);
              } else {
                filter.connect(offlineDryGain);
                filter.connect(offlineConvolver);
              }
            });

            offlineConvolver.connect(offlineReverbGain);
            offlineDryGain.connect(offlineGain);
            offlineReverbGain.connect(offlineGain);
            offlineGain.connect(offlineContext.destination);

            offlineSource.start();
            const processedBuffer = await offlineContext.startRendering();

            // Convert to WAV blob
            const audioBufferToWav = (buffer: AudioBuffer): Blob => {
              const length = buffer.length;
              const numberOfChannels = buffer.numberOfChannels;
              const sampleRate = buffer.sampleRate;
              const bytesPerSample = 2;
              const blockAlign = numberOfChannels * bytesPerSample;
              const byteRate = sampleRate * blockAlign;
              const dataSize = length * blockAlign;
              const bufferSize = 44 + dataSize;
              const arrayBuffer = new ArrayBuffer(bufferSize);
              const view = new DataView(arrayBuffer);

              const writeString = (offset: number, string: string) => {
                for (let i = 0; i < string.length; i++) {
                  view.setUint8(offset + i, string.charCodeAt(i));
                }
              };

              writeString(0, "RIFF");
              view.setUint32(4, bufferSize - 8, true);
              writeString(8, "WAVE");
              writeString(12, "fmt ");
              view.setUint32(16, 16, true);
              view.setUint16(20, 1, true);
              view.setUint16(22, numberOfChannels, true);
              view.setUint32(24, sampleRate, true);
              view.setUint32(28, byteRate, true);
              view.setUint16(32, blockAlign, true);
              view.setUint16(34, bytesPerSample * 8, true);
              writeString(36, "data");
              view.setUint32(40, dataSize, true);

              let offset = 44;
              for (let i = 0; i < length; i++) {
                for (let channel = 0; channel < numberOfChannels; channel++) {
                  const sample = Math.max(
                    -1,
                    Math.min(1, buffer.getChannelData(channel)[i])
                  );
                  view.setInt16(
                    offset,
                    sample < 0 ? sample * 0x8000 : sample * 0x7fff,
                    true
                  );
                  offset += 2;
                }
              }

              return new Blob([arrayBuffer], { type: "audio/wav" });
            };

            const wavBlob = audioBufferToWav(processedBuffer);
            const processedUrl = URL.createObjectURL(wavBlob);

            // Update the audio with processed version
            setGeneratedAudio(processedUrl);
            setProcessedAudio(processedUrl);
            setAutoApplyEQ(false); // Reset the flag

            toast({
              title: "Auto EQ Applied!",
              description: `Applied ${eqSettings.selectedPreset} preset with ${
                eqSettings.pitchShift > 0 ? "+" : ""
              }${eqSettings.pitchShift} pitch and ${
                eqSettings.reverbAmount
              }% reverb.`,
            });
          };

          processAudioWithEQ();
        } catch (error) {
          console.error("Auto EQ processing failed:", error);
          toast({
            title: "Auto EQ Failed",
            description:
              "Failed to apply automatic EQ. You can still apply effects manually.",
            variant: "destructive",
          });
          setAutoApplyEQ(false);
        }
      } else {
        toast({
          title: "Generation Complete!",
          description: "Your affirmation audio is ready for download.",
        });
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation Failed",
        description:
          "Please check if Kokoro TTS is running on localhost:8880. You can also visit localhost:8880/web for debugging.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
      .toString()
      .padStart(3, "0")}`;
  };

  const generateSrtContent = (): string => {
    return affirmationTimings
      .map((timing, index) => {
        return `${index + 1}\n${formatTime(timing.start)} --> ${formatTime(
          timing.end
        )}\n${timing.text}\n`;
      })
      .join("\n");
  };

  const handleDownload = () => {
    // Use processed audio if available (with EQ effects), otherwise use original
    const audioToDownload = processedAudio || generatedAudio;

    if (audioToDownload) {
      const a = document.createElement("a");
      a.href = audioToDownload;
      a.download = "affirmations.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Audio Downloaded!",
        description: processedAudio
          ? "Downloaded audio with EQ effects applied."
          : "Downloaded original audio.",
      });
    }
  };

  const handleDownloadScript = () => {
    if (affirmations.trim() && savedScriptTitle) {
      const blob = new Blob([affirmations], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${savedScriptTitle
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, " ")
        .trim()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      toast({
        title: "Script Downloaded!",
        description: "Script file downloaded successfully.",
      });
    }
  };

  const handleDownloadSrt = () => {
    if (affirmationTimings.length > 0) {
      const srtContent = generateSrtContent();
      const blob = new Blob([srtContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = savedScriptTitle
        ? `${savedScriptTitle
            .replace(/[<>:"/\\|?*]/g, "_")
            .replace(/\s+/g, " ")
            .trim()}.srt`
        : "affirmations.srt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    }
  };

  // Keyboard shortcuts for voice presets
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.altKey && !event.metaKey) {
        let newVoice = "";
        let shortcutName = "";
        let newSpeed = 0.9;
        let newSilenceGap = 1;
        let autoApplyEQ = false;

        if (event.key.toLowerCase() === "i") {
          newVoice = "af_jessica(1)+af_v0nicole(8)+af_v0(1)";
          shortcutName = "Ivory Affirmation";
          newSpeed = 0.8;
          newSilenceGap = 6;
          event.preventDefault();
        } else if (event.key.toLowerCase() === "g") {
          newVoice = "af_v0nicole(3)+am_v0gurney(2)+am_echo(5)";
          shortcutName = "Grounded Spirit Meditation";
          newSpeed = 0.8;
          newSilenceGap = 1.5;
          autoApplyEQ = true;
          event.preventDefault();
        } else if (event.key.toLowerCase() === "m") {
          setShowShortcuts(true);
          event.preventDefault();
        }

        if (newVoice) {
          setVoiceSettings((prev) => ({
            ...prev,
            voice: newVoice,
            speed: newSpeed,
          }));
          setSilenceGap(newSilenceGap);

          // Auto-apply EQ settings for Gradient Voice
          if (autoApplyEQ) {
            setEqSettings({
              bands: [
                { frequency: 80, gain: -1, label: "Bass" },
                { frequency: 200, gain: 0, label: "Low Mid" },
                { frequency: 500, gain: 1, label: "Mid" },
                { frequency: 1000, gain: 2, label: "Upper Mid" },
                { frequency: 2000, gain: 3, label: "Presence" },
                { frequency: 4000, gain: 4, label: "Clarity" },
                { frequency: 8000, gain: 3, label: "Brilliance" },
                { frequency: 12000, gain: 2, label: "Air" },
              ],
              selectedPreset: "Bright Voice",
              pitchShift: -1,
              usePronounced: false,
              reverbEnabled: true,
              reverbAmount: 15,
            });
            setAutoApplyEQ(true);
          }

          toast({
            title: "Voice Changed",
            description: `Switched to ${shortcutName}${
              autoApplyEQ ? " with auto EQ" : ""
            }`,
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toast]);

  // Save API key and settings to localStorage whenever they change
  useEffect(() => {
    if (a4fApiKey) {
      localStorage.setItem("a4f-api-key", a4fApiKey);
    } else {
      localStorage.removeItem("a4f-api-key");
    }
  }, [a4fApiKey]);

  useEffect(() => {
    localStorage.setItem("selected-model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("selected-provider", selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    localStorage.setItem("selected-provider-type", selectedProviderType);
  }, [selectedProviderType]);

  useEffect(() => {
    if (openRouterApiKey) {
      localStorage.setItem("openrouter-api-key", openRouterApiKey);
    } else {
      localStorage.removeItem("openrouter-api-key");
    }
  }, [openRouterApiKey]);

  useEffect(() => {
    localStorage.setItem("openrouter-model", openRouterModel);
  }, [openRouterModel]);

  // Initialize audio element when audio is generated
  useEffect(() => {
    if (generatedAudio) {
      setAudioLoading(true);
      const audio = new Audio(generatedAudio);

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setAudioLoading(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleError = (e: Event) => {
        console.error("Audio playback error:", e);
        setAudioLoading(false);
        toast({
          title: "Audio Playback Error",
          description: "Failed to load audio. Please try regenerating.",
          variant: "destructive",
        });
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);
      audio.volume = volume;
      setAudioElement(audio);

      return () => {
        audio.pause();
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    }
  }, [generatedAudio, volume, toast]);

  // Update volume when volume state changes
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume;
    }
  }, [volume, audioElement]);

  const togglePlayback = async () => {
    if (audioElement) {
      try {
        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          // Ensure audio is loaded before playing
          if (audioElement.readyState < 2) {
            // HAVE_CURRENT_DATA
            await new Promise((resolve) => {
              const handleCanPlay = () => {
                audioElement.removeEventListener("canplay", handleCanPlay);
                resolve(true);
              };
              audioElement.addEventListener("canplay", handleCanPlay);
            });
          }

          const playPromise = audioElement.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
          }
        }
      } catch (error) {
        console.error("Audio playback error:", error);
        toast({
          title: "Playback Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive",
        });
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioElement) {
      audioElement.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const formatPlayerTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const copySampleAffirmations = () => {
    navigator.clipboard
      .writeText(sampleAffirmations)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Sample affirmations copied to clipboard.",
        });
        setShowSampleDialog(false);
      })
      .catch(() => {
        toast({
          title: "Copy Failed",
          description:
            "Could not copy to clipboard. Please select and copy manually.",
          variant: "destructive",
        });
      });
  };

  const handleProcessedAudio = (
    processedAudioUrl: string,
    settings: {
      bands: Array<{ frequency: number; gain: number; label: string }>;
      selectedPreset: string;
      pitchShift: number;
      usePronounced: boolean;
      reverbEnabled: boolean;
      reverbAmount: number;
    }
  ) => {
    setProcessedAudio(processedAudioUrl);
    setEqSettings(settings);
    setGeneratedAudio(processedAudioUrl); // Replace the original audio with processed version
    setShowEqualizer(false); // Close the equalizer dialog
  };

  const cleanTranscript = (rawTranscript: string): string => {
    return (
      rawTranscript
        // Remove timestamps (e.g., 0:00, 0:04, etc.)
        .replace(/\d+:\d+\s*/g, "")
        // Remove music markers
        .replace(/\[music\]/gi, "")
        // Remove narrator markers
        .replace(/\[narrator\]/gi, "")
        // Remove speaker indicators
        .replace(/^[A-Za-z]+:\s*/gm, "")
        // Handle pause indicators and convert them to line breaks
        .replace(/(\.{3,}|…)/g, "\n") // Convert ellipsis to line breaks for pauses
        .replace(/(\s*[.!?]\s*)(?=[A-Z])/g, "$1\n") // Add line breaks after sentences when followed by capital letter
        // Handle natural pause indicators - preserve commas but add line breaks for major pauses
        .replace(/(\s*,\s*)(?=[A-Z][a-z])/g, ",\n") // Add line breaks after commas when followed by capital letter, but keep the comma
        // Remove extra whitespace but preserve intentional line breaks
        .replace(/[ \t]+/g, " ")
        .trim()
        // Split into lines and filter out empty lines
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        // Ensure each line is a complete thought or affirmation
        .map((line) => {
          // If line ends with punctuation, keep it as is
          if (/[.!?]$/.test(line)) {
            return line;
          }
          // If line doesn't end with punctuation and is a complete sentence, add period
          if (/^[A-Z].*[a-z]/.test(line) && !/[.!?]$/.test(line)) {
            return line + ".";
          }
          return line;
        })
        .join("\n")
    );
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-6">
      <div className="w-full space-y-8">
        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  Script
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your affirmations, one per line..."
                  value={affirmations}
                  onChange={(e) => setAffirmations(e.target.value)}
                  className="min-h-[300px] resize-none"
                />

                <Button
                  variant="outline"
                  onClick={handleGenerateScript}
                  disabled={isGeneratingScript}
                  className="w-full bg-gradient-primary text-white hover:bg-gradient-primary hover:text-white hover:shadow-glow"
                >
                  <Bot className="w-4 h-4 mr-0.5" />
                  {isGeneratingScript ? "Generating..." : "Generate Script"}
                </Button>

                {generatedAudio && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-3">
                      {/* Play/Pause and Time Display */}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={togglePlayback}
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                          disabled={!audioElement || audioLoading}
                        >
                          {audioLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatPlayerTime(currentTime)}</span>
                            <span>{formatPlayerTime(duration)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #BE7AE0 0%, #BE7AE0 ${
                                (currentTime / duration) * 100 || 0
                              }%, #d1d5db ${
                                (currentTime / duration) * 100 || 0
                              }%, #d1d5db 100%)`,
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Volume2 className="w-4 h-4 text-muted-foreground" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #BE7AE0 0%, #BE7AE0 ${
                                volume * 100
                              }%, #d1d5db ${volume * 100}%, #d1d5db 100%)`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Audio Effects Button */}
                      <div className="flex justify-center pt-2">
                        <Button
                          onClick={() => setShowEqualizer(true)}
                          variant="outline"
                          size="sm"
                          className="bg-gradient-primary text-white hover:bg-gradient-primary hover:text-white hover:shadow-glow"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Audio Effects
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="voice">Voice</Label>
                  <Input
                    id="voice"
                    type="text"
                    placeholder="af_jessica(1)+af_v0nicole(8)+af_v0(1)"
                    value={voiceSettings.voice}
                    onChange={(e) =>
                      setVoiceSettings((prev) => ({
                        ...prev,
                        voice: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="speed">Speech Speed</Label>
                  <Input
                    id="speed"
                    type="number"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.speed}
                    onChange={(e) =>
                      setVoiceSettings((prev) => ({
                        ...prev,
                        speed: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="silence">Silence Gap (seconds)</Label>
                  <Input
                    id="silence"
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={silenceGap}
                    onChange={(e) => setSilenceGap(parseFloat(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Generate Section */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="pt-6 space-y-4">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-500"
                  size="lg"
                >
                  {isGenerating ? "Generating..." : "Generate Audio"}
                </Button>

                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {progress < 70
                        ? "Processing affirmations..."
                        : "Combining audio clips..."}
                    </p>
                  </div>
                )}

                {generatedAudio && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={handleDownload}
                          className="bg-gradient-primary hover:shadow-glow"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-0.5" />
                          Audio
                        </Button>

                        <Button
                          onClick={handleDownloadSrt}
                          variant="outline"
                          size="sm"
                          disabled={affirmationTimings.length === 0}
                        >
                          <Download className="w-4 h-4 mr-0.5" />
                          .SRT
                        </Button>

                        <Button
                          onClick={generateDescription}
                          variant="outline"
                          size="sm"
                          disabled={
                            isGeneratingDescription ||
                            !savedScriptTitle ||
                            affirmationTimings.length === 0
                          }
                        >
                          <Download className="w-4 h-4 mr-0.5" />
                          {isGeneratingDescription
                            ? "Generating..."
                            : "Description"}
                        </Button>

                        <Button
                          onClick={handleDownloadScript}
                          variant="outline"
                          size="sm"
                          disabled={!affirmations.trim() || !savedScriptTitle}
                        >
                          <Download className="w-4 h-4 mr-0.5" />
                          Script
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Background Image Generation */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-sm">Background Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bgImagePrompt" className="text-xs">
                    Prompt
                  </Label>
                  <Textarea
                    id="bgImagePrompt"
                    placeholder="Enter prompt for background image..."
                    value={bgImagePrompt}
                    onChange={(e) => setBgImagePrompt(e.target.value)}
                    className="min-h-[80px] resize-none text-xs"
                  />
                </div>

                <Button
                  onClick={generateBackgroundImage}
                  disabled={bgImageLoading || !bgImagePrompt.trim()}
                  className="w-full bg-gradient-primary hover:shadow-glow"
                  size="sm"
                >
                  {bgImageLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>

                {/* Image Display */}
                <div className="aspect-video bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden relative">
                  {generatedBgImage ? (
                    <>
                      <img
                        src={generatedBgImage}
                        alt="Generated Background"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() =>
                          expandImage(generatedBgImage, "Background Image")
                        }
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() =>
                            downloadImage(
                              generatedBgImage,
                              "background_image.png"
                            )
                          }
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() =>
                            expandImage(generatedBgImage, "Background Image")
                          }
                        >
                          <div className="w-3 h-3 text-white">⤢</div>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs">
                      <div className="w-8 h-8 mx-auto mb-2 bg-muted/50 rounded"></div>
                      Background Image
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Thumbnail Generation */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-sm">Thumbnail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="thumbnailPrompt" className="text-xs">
                    Prompt
                  </Label>
                  <Textarea
                    id="thumbnailPrompt"
                    placeholder="Enter prompt for thumbnail..."
                    value={thumbnailPrompt}
                    onChange={(e) => setThumbnailPrompt(e.target.value)}
                    className="min-h-[80px] resize-none text-xs"
                  />
                </div>

                <Button
                  onClick={generateThumbnail}
                  disabled={thumbnailLoading || !thumbnailPrompt.trim()}
                  className="w-full bg-gradient-primary hover:shadow-glow"
                  size="sm"
                >
                  {thumbnailLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>

                {/* Image Display */}
                <div className="aspect-video bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden relative">
                  {generatedThumbnail ? (
                    <>
                      <img
                        src={generatedThumbnail}
                        alt="Generated Thumbnail"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() =>
                          expandImage(generatedThumbnail, "Thumbnail")
                        }
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() =>
                            downloadImage(generatedThumbnail, "thumbnail.png")
                          }
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() =>
                            expandImage(generatedThumbnail, "Thumbnail")
                          }
                        >
                          <div className="w-3 h-3 text-white">⤢</div>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs">
                      <div className="w-8 h-8 mx-auto mb-2 bg-muted/50 rounded"></div>
                      Thumbnail
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* API Button - Bottom Left */}
      <Button
        onClick={() => setShowSampleDialog(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-0.5 bg-background/90 backdrop-blur-sm border-primary/20 hover:border-primary/40 shadow-lg"
      >
        <Key className="w-4 h-4" />
        API
      </Button>

      {/* API Settings Dialog */}
      <Dialog open={showSampleDialog} onOpenChange={setShowSampleDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Settings
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-6 p-4">
            <div className="space-y-4">
              <div>
                <Label>Provider Type</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="a4f"
                      name="providerType"
                      value="a4f"
                      checked={selectedProviderType === "a4f"}
                      onChange={(e) => setSelectedProviderType(e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="a4f" className="text-sm">
                      A4F
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="openrouter"
                      name="providerType"
                      value="openrouter"
                      checked={selectedProviderType === "openrouter"}
                      onChange={(e) => setSelectedProviderType(e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="openrouter" className="text-sm">
                      OpenRouter
                    </Label>
                  </div>
                </div>
              </div>

              {selectedProviderType === "a4f" ? (
                <>
                  <div>
                    <Label htmlFor="a4fApiKey">A4F API Key</Label>
                    <Input
                      id="a4fApiKey"
                      type="password"
                      placeholder="Enter your A4F API key..."
                      value={a4fApiKey}
                      onChange={(e) => setA4fApiKey(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="provider">Provider URL</Label>
                    <Input
                      id="provider"
                      type="text"
                      placeholder="https://api.a4f.co/v1"
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      type="text"
                      placeholder="provider-6/gpt-4.1"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="openRouterApiKey">OpenRouter API Key</Label>
                    <Input
                      id="openRouterApiKey"
                      type="password"
                      placeholder="Enter your OpenRouter API key..."
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="openRouterModel">Model</Label>
                    <Input
                      id="openRouterModel"
                      type="text"
                      placeholder="openai/gpt-4o"
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Sample Affirmations</h3>
              <p className="text-sm text-muted-foreground">
                Use these sample affirmations to supplement your generated
                script or as inspiration.
              </p>
              <div className="relative">
                <Textarea
                  value={sampleAffirmations}
                  readOnly
                  className="min-h-[200px] resize-none text-sm no-focus-outline"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Voice Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">Ctrl + I</span>
                <span>Ivory Affirmation</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">Ctrl + G</span>
                <span>Gradient Voice (with auto EQ)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">Ctrl + M</span>
                <span>Show this dialog</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Script Generation Dialog */}
      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Generate Script
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4 p-4">
            <div>
              <Label>Script Type</Label>
              <div className="flex space-x-4 mt-2">
                <Button
                  variant={scriptType === "affirmation" ? "default" : "outline"}
                  onClick={() => setScriptType("affirmation")}
                  className={`flex-1 ${
                    scriptType === "affirmation"
                      ? "bg-gradient-primary text-white"
                      : ""
                  }`}
                >
                  Affirmation Script
                </Button>
                <Button
                  variant={scriptType === "meditation" ? "default" : "outline"}
                  onClick={() => setScriptType("meditation")}
                  className={`flex-1 ${
                    scriptType === "meditation"
                      ? "bg-gradient-primary text-white"
                      : ""
                  }`}
                >
                  Meditation Script
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="scriptTitle">Script Title</Label>
              <Input
                id="scriptTitle"
                type="text"
                placeholder={
                  scriptType === "affirmation"
                    ? "e.g., 'Daily Affirmations for Success'"
                    : "e.g., 'Guided Meditation for Peace'"
                }
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scriptDate">Date (optional, for context)</Label>
              <Input
                id="scriptDate"
                type="text"
                placeholder="e.g., 'July 2025' (optional)"
                value={scriptDate}
                onChange={(e) => setScriptDate(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Transcript (Optional)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTranscriptDialog(true)}
                  className="text-xs"
                >
                  {transcript ? "Edit Transcript" : "Add Transcript"}
                </Button>
              </div>
              {transcript && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  Transcript added ({transcript.split("\n").length} lines)
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
              <Textarea
                id="customPrompt"
                placeholder={
                  scriptType === "affirmation"
                    ? "Leave empty to use default affirmation prompt. You can use ${title}, ${date}, and ${transcript} placeholders."
                    : "Leave empty to use default meditation prompt. You can use ${title}, ${date}, and ${transcript} placeholders."
                }
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[100px] resize-none text-sm"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Available placeholders: {"${title}"}, {"${date}"},{" "}
                {"${transcript}"}
              </div>
            </div>
            <Button
              onClick={handleScriptSubmit}
              disabled={isGeneratingScript}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-500"
            >
              {isGeneratingScript
                ? `Generating ${
                    scriptType === "affirmation" ? "Affirmation" : "Meditation"
                  } Script...`
                : `Generate ${
                    scriptType === "affirmation" ? "Affirmation" : "Meditation"
                  } Script`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Expansion Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-5 h-5 text-primary">🖼️</div>
              {selectedImage?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {selectedImage && (
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <div className="absolute top-4 right-4">
                  <Button
                    onClick={() =>
                      downloadImage(
                        selectedImage.url,
                        `${selectedImage.title
                          .toLowerCase()
                          .replace(/\s+/g, "_")}.png`
                      )
                    }
                    className="bg-black/50 hover:bg-black/70 text-white"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Audio Equalizer Modal */}
      <Dialog open={showEqualizer} onOpenChange={setShowEqualizer}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Audio Effects & Equalizer
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            {generatedAudio && (
              <AudioEqualizer
                audioUrl={generatedAudio}
                onProcessedAudio={handleProcessedAudio}
                savedSettings={eqSettings}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transcript Dialog */}
      <Dialog
        open={showTranscriptDialog}
        onOpenChange={setShowTranscriptDialog}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Add/Edit Transcript
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div>
              <Label htmlFor="transcriptInput">Transcript</Label>
              <Textarea
                id="transcriptInput"
                placeholder={`Paste your raw transcript here. It will be automatically cleaned as you type.

Automatic cleaning includes:
• Removing timestamps and music markers
• Converting ellipsis (...) to natural pauses
• Breaking sentences into individual ${
                  scriptType === "affirmation"
                    ? "affirmations"
                    : "meditation segments"
                }
• Adding proper punctuation where needed`}
                value={transcript}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  // Auto-clean the transcript as user types
                  const cleaned = cleanTranscript(rawValue);
                  setTranscript(cleaned);
                }}
                className="min-h-[400px] resize-none text-sm"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowTranscriptDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowTranscriptDialog(false)}
                className="bg-gradient-primary hover:shadow-glow"
              >
                Save Transcript
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffirmationGenerator;
