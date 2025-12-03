import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
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
  Video,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AudioEqualizer } from "@/components/AudioEqualizer";
import JSZip from "jszip";

interface VoiceSettings {
  model: string;
  voice: string;
  speed: number;
}

const AffirmationGenerator = () => {
  const [affirmations, setAffirmations] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("selected-model") || "provider-6/gpt-4.1";
  });
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem("selected-provider") || "";
  });
  const [selectedProviderType, setSelectedProviderType] = useState(() => {
    return localStorage.getItem("selected-provider-type") || "anthropic";
  });
  const [anthropicApiKey, setAnthropicApiKey] = useState(() => {
    return localStorage.getItem("anthropic-api-key") || "";
  });
  const [anthropicModel, setAnthropicModel] = useState(() => {
    const savedModel = localStorage.getItem("anthropic-model");
    // Migrate from old model names to new one
    if (savedModel && savedModel.includes("claude-3")) {
      localStorage.setItem("anthropic-model", "claude-sonnet-4-20250514");
      return "claude-sonnet-4-20250514";
    }
    return savedModel || "claude-sonnet-4-20250514";
  });
  const [xaiApiKey, setXaiApiKey] = useState(() => {
    return localStorage.getItem("xai-api-key") || "";
  });
  const [promptModel, setPromptModel] = useState<"anthropic" | "xai">(() => {
    return (
      (localStorage.getItem("prompt-model") as "anthropic" | "xai") ||
      "anthropic"
    );
  });
  const [falAiApiKey, setFalAiApiKey] = useState(() => {
    return localStorage.getItem("fal-ai-api-key") || "";
  });
  const [lastApiCall, setLastApiCall] = useState(0);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    model: "kokoro",
    voice: "af_bella(3)+af_v0nicole(5)+af_kore(1)+af_river(1)",
    speed: 1.0,
  });
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(30);
  const [subscribeButtonVerticalPosition, setSubscribeButtonVerticalPosition] =
    useState(85); // Percentage from top (0-100)
  const [captionVerticalPosition, setCaptionVerticalPosition] = useState(70); // Percentage from top (0-100)
  const [subscribeButtonCount, setSubscribeButtonCount] = useState(6); // Number of times to show subscribe button
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatingPromptForScene, setGeneratingPromptForScene] = useState<
    number | null
  >(null);
  const [generatingImageForScene, setGeneratingImageForScene] = useState<
    number | null
  >(null);
  const [imageGenerationProgress, setImageGenerationProgress] = useState({
    current: 0,
    total: 0,
  });

  const [affirmationTimings, setAffirmationTimings] = useState<
    Array<{
      text: string;
      start: number;
      end: number;
      words?: Array<{ word: string; start: number; end: number }>;
    }>
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
  const [affirmationLength, setAffirmationLength] = useState<"long" | "short">(
    "long"
  );
  const [scriptImages, setScriptImages] = useState<File[]>([]);
  const [bgAnimation, setBgAnimation] = useState(false);
  const [scriptBackgroundMusic, setScriptBackgroundMusic] =
    useState<File | null>(null);
  // XML-based timing feature
  const [xmlTimedImages, setXmlTimedImages] = useState<File[]>([]);
  const [xmlTimingFile, setXmlTimingFile] = useState<File | null>(null);
  const [parsedXmlTimings, setParsedXmlTimings] = useState<
    Array<{ imageName: string; start: number; end: number }>
  >([]);
  const [xmlTimingAnimation, setXmlTimingAnimation] = useState(false);
  const [scriptVideoOverlay, setScriptVideoOverlay] = useState<File | null>(
    null
  );
  const [scriptSubscribeVideo, setScriptSubscribeVideo] = useState<File | null>(
    null
  );
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  // Scene count: using flexible ranges that prioritize equal scene lengths
  // Stop 1: 50, Stop 2: 90-110, Stop 3: 110-150,
  // Stop 4: 150-200, Stop 5: 200-250
  // Store slider position (0-4) and calculate optimal scene count dynamically
  const [sceneSliderPosition, setSceneSliderPosition] = useState<number>(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showGenerateScenesDialog, setShowGenerateScenesDialog] =
    useState(false);
  const [scenePrompt, setScenePrompt] = useState("");
  const [scenes, setScenes] = useState<
    Array<{
      text: string;
      prompt: string;
      imageUrl: string | null;
      startTime?: number;
      endTime?: number;
      hasTimestamp?: boolean;
    }>
  >([]);
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Render server states
  const [renderServerUrl, setRenderServerUrl] = useState(() => {
    return localStorage.getItem("render-server-url") || "http://localhost:8001";
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const [audioLoading, setAudioLoading] = useState(false);
  const [showSampleDialog, setShowSampleDialog] = useState(false);

  // Image generation states (removed - placeholder for future features)

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

  // Scene count ranges - flexible ranges that allow wiggle room
  const sceneCountRanges = [
    { min: 50, max: 50 }, // Stop 1: exactly 50
    { min: 90, max: 110 }, // Stop 2: 90-110 range
    { min: 110, max: 150 }, // Stop 3: 110-150 range
    { min: 150, max: 200 }, // Stop 4: 150-200 range
    { min: 200, max: 250 }, // Stop 5: 200-250 range
  ] as const;

  // Calculate optimal scene count within range based on script structure
  // Prioritizes equal scene lengths - finds count that creates most uniform scenes
  const calculateOptimalSceneCount = (
    script: string,
    sliderPosition: number
  ): number => {
    const range = sceneCountRanges[sliderPosition] || sceneCountRanges[0];

    if (range.min === range.max) {
      // Fixed number (stop 1)
      return range.min;
    }

    if (!script.trim()) {
      return range.min;
    }

    // Count total words in script
    const totalWords = script
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    if (totalWords === 0) {
      return range.min;
    }

    // Find the count that results in the most equal word distribution
    // We want scenes with similar word counts (equal lengths)
    let bestCount = range.min;
    let bestEvenness = 0;

    for (let count = range.min; count <= range.max; count++) {
      const wordsPerScene = totalWords / count;

      // Calculate how "even" this division would be
      // More even = scenes are closer to the average
      // We measure evenness by how close wordsPerScene is to being a round number
      // This indicates scenes can be more uniformly sized
      const roundWordsPerScene = Math.round(wordsPerScene);
      const evenness =
        1 - Math.abs(wordsPerScene - roundWordsPerScene) / wordsPerScene;

      if (evenness > bestEvenness) {
        bestEvenness = evenness;
        bestCount = count;
      }
    }

    return bestCount;
  };

  // Function to divide script into scenes
  const divideIntoScenes = (
    script: string,
    numberOfScenes: number
  ): string[] => {
    if (!script.trim()) return [];

    // Split by sentences (ending with . , ? or !) - never cut within a sentence
    // Use regex to split on sentence boundaries, but NOT on decimal points (e.g., 14.5, 3.6)
    // Negative lookbehind ensures period is not preceded by digit
    // Negative lookahead ensures period is not followed by digit
    const sentenceRegex = /(?<!\d)[.,!?]+(?!\d)(?=\s|$)/g;
    const sentences: string[] = [];
    let lastIndex = 0;
    let match;

    // Find all sentence endings (excluding decimal points)
    while ((match = sentenceRegex.exec(script)) !== null) {
      const sentenceEnd = match.index + match[0].length;
      const sentence = script.substring(lastIndex, sentenceEnd).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = sentenceEnd;
    }

    // Add any remaining text as the last sentence (if no ending punctuation)
    const remaining = script.substring(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }

    if (sentences.length === 0) return [];

    // Count words in each sentence
    const sentencesWithWordCount = sentences.map((sentence) => ({
      text: sentence,
      words: sentence.split(/\s+/).filter((w) => w.length > 0).length,
    }));

    // Calculate total words
    const totalWords = sentencesWithWordCount.reduce(
      (sum, sentence) => sum + sentence.words,
      0
    );

    if (totalWords === 0) {
      // If no words, return empty scenes
      return Array(numberOfScenes).fill("");
    }

    // Calculate target words per scene for equal distribution
    const targetWordsPerScene = totalWords / numberOfScenes;

    const scenes: string[] = [];
    let currentScene: string[] = [];
    let currentSceneWordCount = 0;

    // Process each sentence sequentially, prioritizing equal lengths
    for (let i = 0; i < sentencesWithWordCount.length; i++) {
      const sentence = sentencesWithWordCount[i];
      const isLastSentence = i === sentencesWithWordCount.length - 1;
      const scenesRemaining = numberOfScenes - scenes.length;
      const sentencesRemaining = sentencesWithWordCount.length - i;

      // Add sentence to current scene
      currentScene.push(sentence.text);
      currentSceneWordCount += sentence.words;

      // Calculate remaining words and target for remaining scenes
      const wordsUsedSoFar =
        scenes.reduce((sum, scene) => {
          return sum + scene.split(/\s+/).filter((w) => w.length > 0).length;
        }, 0) + currentSceneWordCount;
      const wordsRemaining = totalWords - wordsUsedSoFar;

      // Dynamic target: remaining words divided by remaining scenes
      // This ensures equal distribution
      const dynamicTarget =
        scenesRemaining > 0 ? wordsRemaining / scenesRemaining : 0;

      // Determine if we should close this scene
      let shouldCloseScene = false;

      if (scenes.length === numberOfScenes - 1) {
        // This is the last scene - add all remaining sentences
        shouldCloseScene = isLastSentence;
      } else if (sentencesRemaining === scenesRemaining) {
        // Exactly enough sentences for remaining scenes - one sentence per scene
        shouldCloseScene = true;
      } else if (
        currentSceneWordCount >= dynamicTarget * 0.8 && // Allow 20% flexibility
        currentScene.length > 0
      ) {
        // Close scene when we're close to the target (with flexibility)
        // This prioritizes equal lengths over exact word counts
        shouldCloseScene = true;
      }

      if (shouldCloseScene) {
        scenes.push(currentScene.join(" "));
        currentScene = [];
        currentSceneWordCount = 0;
      }
    }

    // Add any remaining sentences as the last scene
    if (currentScene.length > 0) {
      scenes.push(currentScene.join(" "));
    }

    // If we have fewer scenes than target, split longest scenes to maintain equal lengths
    while (scenes.length < numberOfScenes && scenes.length > 0) {
      const longestIndex = scenes.reduce(
        (maxIdx, scene, idx, arr) =>
          scene.length > arr[maxIdx].length ? idx : maxIdx,
        0
      );
      const longestScene = scenes[longestIndex];

      // Try to split by sentences (look for sentence endings, but not decimal points)
      // Use regex that excludes decimal points (periods between digits)
      const sentenceEndings = longestScene.match(/(?<!\d)[.!?]+(?!\d)/g);
      if (sentenceEndings && sentenceEndings.length > 1) {
        // Split at sentence boundaries (excluding decimal points)
        const parts = longestScene.split(/((?<!\d)[.!?]+(?!\d)\s*)/);
        const sentencesInScene: string[] = [];
        let currentSentence = "";

        for (let i = 0; i < parts.length; i++) {
          currentSentence += parts[i];
          // Check if this part is a sentence ending (not a decimal point)
          if (parts[i] && /(?<!\d)[.!?]+(?!\d)/.test(parts[i])) {
            sentencesInScene.push(currentSentence.trim());
            currentSentence = "";
          }
        }
        if (currentSentence.trim()) {
          sentencesInScene.push(currentSentence.trim());
        }

        if (sentencesInScene.length > 1) {
          const mid = Math.ceil(sentencesInScene.length / 2);
          scenes[longestIndex] = sentencesInScene.slice(0, mid).join(" ");
          scenes.splice(
            longestIndex + 1,
            0,
            sentencesInScene.slice(mid).join(" ")
          );
        } else {
          // Can't split further, add empty scene
          scenes.push("");
        }
      } else {
        // Can't split further, add empty scene
        scenes.push("");
      }
    }

    // If we have too many, merge the smallest scenes
    while (scenes.length > numberOfScenes) {
      const smallestIndex = scenes.reduce(
        (minIdx, scene, idx, arr) =>
          scene.length < arr[minIdx].length ? idx : minIdx,
        0
      );

      if (smallestIndex < scenes.length - 1) {
        scenes[smallestIndex] =
          scenes[smallestIndex] + " " + scenes[smallestIndex + 1];
        scenes.splice(smallestIndex + 1, 1);
      } else if (smallestIndex > 0) {
        scenes[smallestIndex - 1] =
          scenes[smallestIndex - 1] + " " + scenes[smallestIndex];
        scenes.splice(smallestIndex, 1);
      } else {
        // Can't merge, break to avoid infinite loop
        break;
      }
    }

    return scenes;
  };

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

  const generateScript = async (title: string, date: string) => {
    const apiKey = promptModel === "anthropic" ? anthropicApiKey : xaiApiKey;
    const apiKeyName = promptModel === "anthropic" ? "Anthropic" : "X AI";

    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${apiKeyName} API key to generate scripts.`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScript(true);

    // Check rate limit for Anthropic
    if (promptModel === "anthropic" && !checkRateLimit()) {
      setIsGeneratingScript(false);
      return;
    }

    try {
      // Use custom prompt if provided, otherwise use default based on script type
      let prompt = customPrompt.trim();

      if (!prompt) {
        if (scriptType === "affirmation") {
          const affirmationCount = affirmationLength === "long" ? 130 : 15;
          prompt = `I want you to write ${affirmationCount} Affirmations that covers all aspects of life, titled "${title}". This script should be designed for a YouTube audience interested in listening to Affirmations.
Use clear, single-line affirmations.${
            date
              ? ` Some affirmations should mention the "${date}". It certainly need to be included in the very first affirmation.`
              : ""
          } Don't provide unwanted narrator, music, and such words in the actual script? I want something that I can just pass on to my voiceover artist: IMPORTANT! If a transcript is provided, use it ONLY for context and inspiration - create completely original affirmations. Do not copy the transcript's style or content. Do not use subheadings within the script or * (asterics) in the script. Avoid using "—" in the script. No bracketed content. Do not write the Title at the top before affirmations start, No abbreviations like "eg", instead use the word example: IMPORTANT!`;
        } else {
          prompt = `Write a (3500-4000) words long meditation script. Write in a manner to consider where ever pause is required. separate it as separate line or sentence. Make sure it is ready for narration no distractions like narrator or music etc should be used in the script. If a transcript is provided, use it ONLY for context and inspiration - create completely original meditation content. Do not copy the transcript's style or content. Do not use subheadings within the script or * (asterics) in the script. Avoid using "—" in the script. No bracketed content. No abbreviations like "eg", instead use the word example: IMPORTANT!`;
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

      // Handle streaming response
      let generatedScript = "";

      if (promptModel === "anthropic") {
        const anthropicClient = new Anthropic({
          apiKey: anthropicApiKey,
          dangerouslyAllowBrowser: true,
        });

        const completion = await anthropicClient.messages.create({
          model: anthropicModel,
          max_tokens: 4000,
          messages: [{ role: "user", content: finalPrompt }],
          stream: true,
        });

        // Handle Anthropic streaming
        for await (const chunk of completion) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const content = chunk.delta.text || "";
            generatedScript += content;
            setAffirmations(generatedScript);
          }
        }
      } else if (promptModel === "xai") {
        // Xai API call with CORS
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-0709",
            messages: [{ role: "user", content: finalPrompt }],
            max_tokens: 4000,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Xai API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  const content = data.choices[0].delta.content;
                  generatedScript += content;
                  setAffirmations(generatedScript);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
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
    const apiKey = anthropicApiKey;
    const apiKeyName = "Anthropic";

    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${apiKeyName} API key first.`,
        variant: "destructive",
      });
      return;
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

  const handleRenderVideo = async () => {
    // Validate required files
    if (!scriptBackgroundMusic) {
      toast({
        title: "Missing Background Music",
        description: "Please add background music to render the video.",
        variant: "destructive",
      });
      return;
    }

    if (!generatedAudio) {
      toast({
        title: "Missing Voiceover",
        description: "Please generate audio first before rendering.",
        variant: "destructive",
      });
      return;
    }

    // Check if we have either regular images or XML-timed images
    const hasRegularImages = scriptImages.length > 0;
    const hasXmlImages = xmlTimedImages.length > 0 && xmlTimingFile !== null;

    if (!hasRegularImages && !hasXmlImages) {
      toast({
        title: "Missing Background",
        description:
          "Please add at least one background image to render the video.",
        variant: "destructive",
      });
      return;
    }

    // If using XML timing, validate that we have both images and XML
    if (xmlTimedImages.length > 0 && !xmlTimingFile) {
      toast({
        title: "Missing XML File",
        description:
          "You uploaded images for XML timing but no XML file. Please upload the XML timing file.",
        variant: "destructive",
      });
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setRenderLogs([]);

    try {
      // Convert generated audio URL to blob
      const voiceoverResponse = await fetch(generatedAudio);
      const voiceoverBlob = await voiceoverResponse.blob();
      const voiceoverFile = new File([voiceoverBlob], "voiceover.mp3", {
        type: "audio/mpeg",
      });

      // Get voiceover duration
      const voiceoverDuration = await getAudioDuration(voiceoverFile);

      // Video duration is voiceover duration + 2 seconds
      const videoDuration = voiceoverDuration + 2;

      // Generate ASS file from affirmation timings (uses same timing logic as SRT to prevent overlaps)
      const assContent = generateASSContent(affirmationTimings, videoDuration);
      const assBlob = new Blob([assContent], { type: "text/plain" });
      const assFile = new File([assBlob], "subtitles.ass", {
        type: "text/plain",
      });

      // Get subscribe video duration if provided
      let subscribeDuration = 0;
      if (scriptSubscribeVideo) {
        subscribeDuration = await getVideoDuration(scriptSubscribeVideo);
      }

      // Check if we're using XML timing
      const usingXmlTiming = hasXmlImages && parsedXmlTimings.length > 0;

      let ffmpegCommand: string;
      const formData = new FormData();

      if (usingXmlTiming) {
        // Build FFmpeg command for XML timing (with or without animation)
        ffmpegCommand = buildXmlTimingFFmpegCommand(
          videoDuration,
          voiceoverDuration,
          !!scriptVideoOverlay,
          !!scriptSubscribeVideo,
          subscribeDuration,
          xmlTimingAnimation,
          xmlTimedImages,
          parsedXmlTimings
        );

        formData.append("ffmpeg_command", ffmpegCommand);
        formData.append("files", scriptBackgroundMusic);
        formData.append("files", voiceoverFile);

        // Only upload concat.txt when animation is disabled (concat demuxer needs it)
        if (!xmlTimingAnimation) {
          const concatContent = generateConcatFile(
            xmlTimedImages,
            parsedXmlTimings,
            videoDuration
          );

          const concatBlob = new Blob([concatContent], { type: "text/plain" });
          const concatFile = new File([concatBlob], "concat.txt", {
            type: "text/plain",
          });
          formData.append("files", concatFile);
        }

        // Add all XML-timed images
        xmlTimedImages.forEach((image) => {
          formData.append("files", image);
        });
      } else {
        // Regular timing: Use existing logic
        const videos: Array<{ file: File; duration: number; index: number }> =
          [];
        const images: Array<{ file: File; index: number }> = [];

        for (let i = 0; i < scriptImages.length; i++) {
          const file = scriptImages[i];
          if (isVideoFile(file)) {
            const duration = await getVideoDuration(file);
            videos.push({ file, duration, index: i });
          } else {
            images.push({ file, index: i });
          }
        }

        const totalVideoDuration = videos.reduce(
          (sum, v) => sum + v.duration,
          0
        );

        // Build FFmpeg command
        ffmpegCommand = buildFFmpegCommand(
          videoDuration,
          voiceoverDuration,
          scriptImages.length,
          videos,
          images,
          totalVideoDuration,
          bgAnimation,
          !!scriptVideoOverlay,
          !!scriptSubscribeVideo,
          subscribeDuration
        );

        formData.append("ffmpeg_command", ffmpegCommand);
        formData.append("files", scriptBackgroundMusic);
        formData.append("files", voiceoverFile);

        // Add all background images
        scriptImages.forEach((image) => {
          formData.append("files", image);
        });
      }

      // Add video overlay if provided
      if (scriptVideoOverlay) {
        formData.append("files", scriptVideoOverlay);
      }

      formData.append("files", assFile);

      // Add subscribe video if provided
      if (scriptSubscribeVideo) {
        formData.append("files", scriptSubscribeVideo);
      }

      // Submit render job
      const response = await fetch(`${renderServerUrl}/render`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit render job");
      }

      const { job_id } = await response.json();
      setRenderJobId(job_id);

      // Poll for completion
      await pollRenderStatus(job_id);
    } catch (error) {
      console.error("Render failed:", error);
      toast({
        title: "Render Failed",
        description:
          error instanceof Error ? error.message : "Failed to render video",
        variant: "destructive",
      });
      setIsRendering(false);
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = reject;
      audio.src = URL.createObjectURL(file);
    });
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  };

  // Helper to check if a word is punctuation (no space before)
  const isPunctuation = (word: string): boolean => {
    return /^[.,!?;:)}\]'""'']+$/.test(word.trim());
  };

  // Helper to check if a file is a video
  const isVideoFile = (file: File): boolean => {
    return file.type.startsWith("video/");
  };

  // Helper to check if any background file is a video
  const hasVideoBackground = (): boolean => {
    return scriptImages.some((file) => isVideoFile(file));
  };

  // Generate SRT content from Kokoro word-level timestamps
  const generateSRTContent = (
    timings: Array<{
      text: string;
      start: number;
      end: number;
      words?: Array<{ word: string; start: number; end: number }>;
    }>,
    maxDuration: number
  ): string => {
    // First pass: collect all captions with their natural timings
    const captions: Array<{ text: string; start: number; end: number }> = [];

    for (const timing of timings) {
      if (timing.start >= maxDuration) continue;

      // Use Kokoro's word-level timestamps
      if (timing.words && timing.words.length > 0) {
        let currentLine = "";
        let lineStartTime = 0;
        let lineEndTime = 0;

        for (let i = 0; i < timing.words.length; i++) {
          const word = timing.words[i];
          if (word.start >= maxDuration) break;

          // Build the test line
          const needsSpace =
            currentLine.length > 0 && !isPunctuation(word.word);
          const testLine = currentLine + (needsSpace ? " " : "") + word.word;

          // Check if adding this word exceeds the character limit
          if (testLine.length <= maxCharsPerLine) {
            // Add word to current line
            if (currentLine.length === 0) {
              lineStartTime = word.start;
            }
            currentLine = testLine;
            lineEndTime = Math.min(word.end, maxDuration);
          } else {
            // Line is full - save current line
            if (currentLine.length > 0) {
              captions.push({
                text: currentLine,
                start: lineStartTime,
                end: word.start, // Natural end is when next word starts
              });
            }
            // Start new line with this word
            currentLine = word.word;
            lineStartTime = word.start;
            lineEndTime = Math.min(word.end, maxDuration);
          }
        }

        // Save the last line if it has content
        if (currentLine.length > 0) {
          captions.push({
            text: currentLine,
            start: lineStartTime,
            end: lineEndTime,
          });
        }
      }
    }

    // Second pass: adjust so each caption ends exactly when the next starts
    for (let i = 0; i < captions.length - 1; i++) {
      captions[i].end = captions[i + 1].start;
    }

    // Generate SRT entries
    const srtEntries: string[] = [];
    captions.forEach((caption, index) => {
      srtEntries.push(
        `${index + 1}\n${formatSRTTime(caption.start)} --> ${formatSRTTime(
          caption.end
        )}\n${caption.text}\n`
      );
    });

    return srtEntries.join("\n");
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };

  // Format time for ASS format (H:MM:SS.cc) - centiseconds not milliseconds
  const formatASSTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100); // centiseconds
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  // Generate ASS content from the same caption data used for SRT
  // This preserves the exact timing solution that fixed overlaps
  const generateASSContent = (
    timings: Array<{
      text: string;
      start: number;
      end: number;
      words?: Array<{ word: string; start: number; end: number }>;
    }>,
    maxDuration: number
  ): string => {
    // First pass: collect all captions with their natural timings (SAME AS SRT)
    const captions: Array<{ text: string; start: number; end: number }> = [];

    for (const timing of timings) {
      if (timing.start >= maxDuration) continue;

      // Use Kokoro's word-level timestamps
      if (timing.words && timing.words.length > 0) {
        let currentLine = "";
        let lineStartTime = 0;
        let lineEndTime = 0;

        for (let i = 0; i < timing.words.length; i++) {
          const word = timing.words[i];
          if (word.start >= maxDuration) break;

          // Build the test line
          const needsSpace =
            currentLine.length > 0 && !isPunctuation(word.word);
          const testLine = currentLine + (needsSpace ? " " : "") + word.word;

          // Check if adding this word exceeds the character limit
          if (testLine.length <= maxCharsPerLine) {
            // Add word to current line
            if (currentLine.length === 0) {
              lineStartTime = word.start;
            }
            currentLine = testLine;
            lineEndTime = Math.min(word.end, maxDuration);
          } else {
            // Line is full - save current line
            if (currentLine.length > 0) {
              captions.push({
                text: currentLine,
                start: lineStartTime,
                end: word.start, // Natural end is when next word starts
              });
            }
            // Start new line with this word
            currentLine = word.word;
            lineStartTime = word.start;
            lineEndTime = Math.min(word.end, maxDuration);
          }
        }

        // Save the last line if it has content
        if (currentLine.length > 0) {
          captions.push({
            text: currentLine,
            start: lineStartTime,
            end: lineEndTime,
          });
        }
      }
    }

    // Second pass: adjust so each caption ends exactly when the next starts
    // THIS IS THE KEY FIX THAT PREVENTS OVERLAPS
    for (let i = 0; i < captions.length - 1; i++) {
      captions[i].end = captions[i + 1].start;
    }

    // Generate ASS file with inline color tag approach
    // Each word timing shows the FULL caption text with inline color overrides
    // Current spoken word = YELLOW, all other words = WHITE
    // Alignment: 2 = bottom-center (horizontally centered, anchored from bottom)
    // Colors: &H00FFFFFF = white text, &H0000FFFF = yellow (BGR format), &H00000000 = black outline
    // MarginV: vertical margin from bottom in pixels (calculated from percentage)
    const playResY = 1080;
    const marginVPixels = Math.round(
      ((100 - captionVerticalPosition) / 100) * playResY
    );
    let assContent = `[Script Info]
; Word-by-word yellow highlighting with inline color tags
Title: Affirmations
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: ${playResY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: White,Alice Bold,85,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,2,2,10,10,${marginVPixels},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Collect all words with their adjusted timestamps
    const allWords: Array<{
      word: string;
      start: number;
      end: number;
      captionIndex: number;
    }> = [];

    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];

      // Find all words that belong to this caption
      for (const timing of timings) {
        if (timing.words && timing.words.length > 0) {
          for (const word of timing.words) {
            if (word.start >= caption.start && word.start < caption.end) {
              allWords.push({
                word: word.word,
                start: word.start,
                end: word.end,
                captionIndex: i,
              });
            }
          }
        }
      }
    }

    // Sort words by start time
    allWords.sort((a, b) => a.start - b.start);

    // Apply overlap prevention to words (same logic as timestamps)
    for (let i = 0; i < allWords.length - 1; i++) {
      allWords[i].end = allWords[i + 1].start;
    }

    // Create dialogue events - each word shows FULL caption with inline color tags
    // Current word is yellow, all others are white
    for (let i = 0; i < allWords.length; i++) {
      const currentWord = allWords[i];
      const caption = captions[currentWord.captionIndex];

      // Get all words in this caption
      const captionWords = allWords.filter(
        (w) => w.captionIndex === currentWord.captionIndex
      );

      // Build the text with inline color tags
      let coloredText = "";

      for (let j = 0; j < captionWords.length; j++) {
        const w = captionWords[j];

        // Add space before word if needed
        if (j > 0 && !isPunctuation(w.word)) {
          coloredText += " ";
        }

        // Is this the current word being spoken?
        if (w.start === currentWord.start && w.word === currentWord.word) {
          // Make it YELLOW with color override tag
          coloredText += `{\\c&H00FFFF&}${w.word}{\\c&HFFFFFF&}`;
        } else {
          // Keep it WHITE (default)
          coloredText += w.word;
        }
      }

      // Add dialogue event for this word's timing
      assContent += `Dialogue: 0,${formatASSTime(
        currentWord.start
      )},${formatASSTime(currentWord.end)},White,,0,0,0,,${coloredText}\n`;
    }

    return assContent;
  };

  const findBestCutPoint = (targetDuration: number): number => {
    // Find the best silent gap to cut at, closest to the target duration
    if (affirmationTimings.length === 0) return targetDuration;

    let bestCutPoint = targetDuration;
    let smallestDiff = Infinity;

    // Look through affirmation timings to find gaps
    for (let i = 0; i < affirmationTimings.length - 1; i++) {
      const gapStart = affirmationTimings[i].end;
      const gapEnd = affirmationTimings[i + 1].start;
      const gapMidpoint = (gapStart + gapEnd) / 2;

      // Only consider gaps that are reasonably close to target
      if (gapMidpoint <= targetDuration) {
        const diff = Math.abs(gapMidpoint - targetDuration);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          bestCutPoint = gapMidpoint;
        }
      }
    }

    // If the last affirmation ends before target duration, that's our cut point
    const lastEnd = affirmationTimings[affirmationTimings.length - 1].end;
    if (
      lastEnd <= targetDuration &&
      Math.abs(lastEnd - targetDuration) < smallestDiff
    ) {
      bestCutPoint = lastEnd;
    }

    return bestCutPoint;
  };

  // Helper to escape filenames
  const escapeFilename = (filename: string): string => {
    if (
      filename.includes(" ") ||
      filename.includes("(") ||
      filename.includes(")")
    ) {
      return `"${filename.replace(/"/g, '\\"')}"`;
    }
    return filename;
  };

  // Generate concat file for XML-based timing
  const generateConcatFile = (
    images: File[],
    timings: Array<{ imageName: string; start: number; end: number }>,
    videoDuration: number
  ): string => {
    let content = "";

    // Match images to timings by filename
    const matchedTimings: Array<{ file: File; duration: number }> = [];

    images.forEach((imageFile) => {
      const imgNameLower = imageFile.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "");

      // Find matching timing
      const timing = timings.find((t) => {
        const xmlNameLower = t.imageName.toLowerCase().replace(/\.[^/.]+$/, "");
        return (
          xmlNameLower === imgNameLower ||
          xmlNameLower.includes(imgNameLower) ||
          imgNameLower.includes(xmlNameLower)
        );
      });

      if (timing) {
        matchedTimings.push({
          file: imageFile,
          duration: timing.end - timing.start,
        });
      }
    });

    // Sort by timing order
    const sorted = matchedTimings.sort((a, b) => {
      const aIdx = timings.findIndex((t) => {
        const aNameLower = a.file.name.toLowerCase().replace(/\.[^/.]+$/, "");
        const tNameLower = t.imageName.toLowerCase().replace(/\.[^/.]+$/, "");
        return (
          tNameLower === aNameLower ||
          tNameLower.includes(aNameLower) ||
          aNameLower.includes(tNameLower)
        );
      });
      const bIdx = timings.findIndex((t) => {
        const bNameLower = b.file.name.toLowerCase().replace(/\.[^/.]+$/, "");
        const tNameLower = t.imageName.toLowerCase().replace(/\.[^/.]+$/, "");
        return (
          tNameLower === bNameLower ||
          tNameLower.includes(bNameLower) ||
          bNameLower.includes(tNameLower)
        );
      });
      return aIdx - bIdx;
    });

    // Extend last image to video end
    if (sorted.length > 0) {
      const lastIdx = sorted.length - 1;
      const lastTiming = timings[lastIdx];
      sorted[lastIdx].duration = videoDuration - lastTiming.start;
    }

    // Generate concat format
    sorted.forEach((item, idx) => {
      content += `file '${item.file.name}'\n`;
      content += `duration ${item.duration.toFixed(3)}\n`;
      // Add file again for last frame
      if (idx === sorted.length - 1) {
        content += `file '${item.file.name}'\n`;
      }
    });

    return content;
  };

  // Build FFmpeg command for XML timing (concat demuxer or concat filter with animation)
  const buildXmlTimingFFmpegCommand = (
    videoDuration: number,
    voiceoverDuration: number,
    hasVideoOverlay: boolean,
    hasSubscribeVideo: boolean,
    subscribeDuration: number,
    enableAnimation: boolean,
    images: File[],
    timings: Array<{ imageName: string; start: number; end: number }>
  ): string => {
    let filterComplex = "";
    let inputIndex = 0;

    // Build inputs list - using -stream_loop for overlays instead of filter loop (much more memory efficient)
    let inputs = "";

    // Input 0: background music
    inputs += ` -i ${escapeFilename(scriptBackgroundMusic!.name)}`;
    const musicIdx = inputIndex++;

    // Input 1: voiceover
    inputs += ` -i voiceover.mp3`;
    const voiceIdx = inputIndex++;

    // Match images to timings for animation processing
    const matchedTimings: Array<{
      file: File;
      duration: number;
      index: number;
    }> = [];
    images.forEach((imageFile, imgIdx) => {
      const imgNameLower = imageFile.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "");

      const timing = timings.find((t) => {
        const xmlNameLower = t.imageName.toLowerCase().replace(/\.[^/.]+$/, "");
        return (
          xmlNameLower === imgNameLower ||
          xmlNameLower.includes(imgNameLower) ||
          imgNameLower.includes(xmlNameLower)
        );
      });

      if (timing) {
        matchedTimings.push({
          file: imageFile,
          duration: timing.end - timing.start,
          index: imgIdx,
        });
      }
    });

    // Sort by timing order
    const sorted = matchedTimings.sort((a, b) => {
      const aIdx = timings.findIndex((t) => {
        const aNameLower = a.file.name.toLowerCase().replace(/\.[^/.]+$/, "");
        const tNameLower = t.imageName.toLowerCase().replace(/\.[^/.]+$/, "");
        return (
          tNameLower === aNameLower ||
          tNameLower.includes(aNameLower) ||
          aNameLower.includes(tNameLower)
        );
      });
      const bIdx = timings.findIndex((t) => {
        const bNameLower = b.file.name.toLowerCase().replace(/\.[^/.]+$/, "");
        const tNameLower = t.imageName.toLowerCase().replace(/\.[^/.]+$/, "");
        return (
          tNameLower === bNameLower ||
          tNameLower.includes(bNameLower) ||
          bNameLower.includes(tNameLower)
        );
      });
      return aIdx - bIdx;
    });

    // Extend last image to video end
    if (sorted.length > 0) {
      const lastTiming = timings[sorted.length - 1];
      sorted[sorted.length - 1].duration = videoDuration - lastTiming.start;
    }

    let concatIdx = -1;
    let currentLayer = "";

    if (enableAnimation && sorted.length > 0) {
      // Animation enabled: Process each image individually with zoompan, then concat
      const fps = 30;
      let imageInputIndex = inputIndex;

      // Add all image inputs
      sorted.forEach((item) => {
        inputs += ` -i ${escapeFilename(item.file.name)}`;
      });

      // Process each image with zoompan based on its duration
      sorted.forEach((item, idx) => {
        const imageInputIdx = imageInputIndex + idx;
        const totalFrames = Math.ceil(item.duration * fps);

        // Scale up for zoom effect, then apply zoompan
        filterComplex += `[${imageInputIdx}:v]scale=2304:1296:force_original_aspect_ratio=decrease,pad=2304:1296:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=-1:size=1:start=0[scaled${idx}];`;
        filterComplex += `[scaled${idx}]zoompan=z='min(1.2-(0.2*on/${totalFrames}),1.2)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps},trim=duration=${item.duration.toFixed(
          3
        )},setpts=PTS-STARTPTS[img${idx}];`;
      });

      // Concatenate all processed images
      const concatInputs = sorted.map((_, idx) => `[img${idx}]`).join("");
      filterComplex += `${concatInputs}concat=n=${sorted.length}:v=1:a=0[img];`;
      currentLayer = "img";
      inputIndex += sorted.length;
    } else {
      // No animation: Use concat demuxer (more efficient)
      inputs += ` -f concat -safe 0 -i concat.txt`;
      concatIdx = inputIndex++;
      filterComplex += `[${concatIdx}:v]fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS[img];`;
      currentLayer = "img";
    }

    // Input indices for overlays (after images)
    let overlayIdx = -1;
    if (hasVideoOverlay) {
      inputs += ` -stream_loop -1 -i ${escapeFilename(
        scriptVideoOverlay!.name
      )}`;
      overlayIdx = inputIndex++;
    }

    let subscribeIdx = -1;
    if (hasSubscribeVideo) {
      inputs += ` -stream_loop -1 -i ${escapeFilename(
        scriptSubscribeVideo!.name
      )}`;
      subscribeIdx = inputIndex++;
    }

    // Add video overlay if provided (using stream_loop input, no memory-heavy loop filter needed)
    if (hasVideoOverlay && overlayIdx >= 0) {
      filterComplex += `[${overlayIdx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,format=yuva420p,colorchannelmixer=aa=0.3,trim=duration=${videoDuration},setpts=PTS-STARTPTS[overlay];`;
      filterComplex += `[${currentLayer}][overlay]overlay=format=auto[withoverlay];`;
      currentLayer = "withoverlay";
    }

    // Add subtitles
    filterComplex += `[${currentLayer}]ass=subtitles.ass[withsubs];`;
    currentLayer = "withsubs";

    // Add subscribe video if provided (using stream_loop input)
    if (hasSubscribeVideo && subscribeIdx >= 0) {
      const subscribeCount = subscribeButtonCount;
      const availableDuration = videoDuration - subscribeDuration;
      const interval = availableDuration / (subscribeCount - 1);
      const targetTimestamps: number[] = [];
      for (let i = 0; i < subscribeCount; i++) {
        targetTimestamps.push(Math.round(i * interval));
      }

      // No loop filter needed - stream_loop handles the looping at input level
      filterComplex += `[${subscribeIdx}:v]trim=duration=${videoDuration},setpts=PTS-STARTPTS[loopsub];`;

      const timeWindows = targetTimestamps.map((target) => {
        const offsetInCycle = target % subscribeDuration;
        const adjustedStart = target - offsetInCycle;
        const adjustedEnd = Math.min(
          adjustedStart + subscribeDuration,
          videoDuration
        );
        return { start: adjustedStart, end: adjustedEnd };
      });

      const enableExpr = timeWindows
        .map(
          ({ start, end }) => `between(t,${start.toFixed(3)},${end.toFixed(3)})`
        )
        .join("+");

      const verticalPos = subscribeButtonVerticalPosition / 100;
      filterComplex += `[${currentLayer}][loopsub]overlay=x=(W-w)/2:y=H*${verticalPos}-h/2:enable='${enableExpr}'[v];`;
    } else {
      filterComplex += `[${currentLayer}]copy[v];`;
    }

    // Audio processing
    filterComplex += `[${voiceIdx}:a]volume=15dB[vo];`;
    filterComplex += `[${musicIdx}:a]atrim=0:${videoDuration},volume=-2dB,afade=t=out:st=${voiceoverDuration}:d=2[bg];`;
    filterComplex += `[bg][vo]amix=inputs=2:duration=longest:dropout_transition=2[a]`;

    // Build command with memory-efficient settings
    // -threads 0: auto-detect optimal thread count
    // Using h264_nvenc for GPU acceleration
    const command = `ffmpeg${inputs} -filter_complex "${filterComplex}" -map "[v]" -map "[a]" -c:v h264_nvenc -preset fast -b:v 5M -c:a aac -b:a 192k -vsync cfr -r 30 -t ${videoDuration} output.mp4`;

    return command;
  };

  // Parse XML timing file for image timings
  const parseXmlForTimings = async (
    xmlFile: File
  ): Promise<Array<{ imageName: string; start: number; end: number }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlText = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");

          const timings: Array<{
            imageName: string;
            start: number;
            end: number;
          }> = [];

          // Parse simple custom XML format
          const customClips = xmlDoc.getElementsByTagName("clip");
          if (customClips.length > 0) {
            Array.from(customClips).forEach((clip) => {
              const name = clip.getAttribute("name") || "";
              const start = parseFloat(clip.getAttribute("start") || "0");
              const end = parseFloat(clip.getAttribute("end") || "0");
              timings.push({ imageName: name, start, end });
            });
          }

          // Parse FCPXML format
          const fcpClips = xmlDoc.getElementsByTagName("asset-clip");
          if (fcpClips.length > 0 && timings.length === 0) {
            Array.from(fcpClips).forEach((clip) => {
              const offset = clip.getAttribute("offset") || "0s";
              const duration = clip.getAttribute("duration") || "0s";
              const name = clip.getAttribute("name") || "";

              const parseTime = (timeStr: string): number => {
                const match = timeStr.match(/(\d+)\/(\d+)s/);
                if (match) return parseFloat(match[1]) / parseFloat(match[2]);
                const directMatch = timeStr.match(/(\d+(?:\.\d+)?)s/);
                if (directMatch) return parseFloat(directMatch[1]);
                return parseFloat(timeStr);
              };

              const start = parseTime(offset);
              const dur = parseTime(duration);
              timings.push({ imageName: name, start, end: start + dur });
            });
          }

          // Parse XMEML format (Final Cut Pro 7 / Premiere Pro XML)
          const premiereClips = xmlDoc.getElementsByTagName("clipitem");
          if (premiereClips.length > 0 && timings.length === 0) {
            // Get timebase from sequence level if available
            let defaultTimebase = 30;
            const sequenceRate = xmlDoc
              .getElementsByTagName("sequence")[0]
              ?.getElementsByTagName("rate")[0]
              ?.getElementsByTagName("timebase")[0]?.textContent;
            if (sequenceRate) {
              defaultTimebase = parseInt(sequenceRate);
            }

            Array.from(premiereClips).forEach((clip) => {
              const startElement = clip.getElementsByTagName("start")[0];
              const endElement = clip.getElementsByTagName("end")[0];

              if (startElement && endElement) {
                // Try to get name from clipitem directly first, then from file element
                let name =
                  clip.getElementsByTagName("name")[0]?.textContent || "";

                // If name not found at clip level, try file element
                if (!name) {
                  const fileElement = clip.getElementsByTagName("file")[0];
                  if (fileElement) {
                    name =
                      fileElement.getElementsByTagName("name")[0]
                        ?.textContent || "";
                  }
                }

                const start = parseInt(startElement.textContent || "0");
                const end = parseInt(endElement.textContent || "0");

                // Get timebase from clip or use default
                const timebaseElement = clip
                  .getElementsByTagName("rate")[0]
                  ?.getElementsByTagName("timebase")[0];
                const frameRate = timebaseElement
                  ? parseInt(
                      timebaseElement.textContent || String(defaultTimebase)
                    )
                  : defaultTimebase;

                if (name) {
                  timings.push({
                    imageName: name,
                    start: start / frameRate,
                    end: end / frameRate,
                  });
                }
              }
            });
          }

          timings.sort((a, b) => a.start - b.start);
          resolve(timings);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read XML file"));
      reader.readAsText(xmlFile);
    });
  };

  const buildFFmpegCommand = (
    videoDuration: number,
    voiceoverDuration: number,
    numBgFiles: number,
    videos: Array<{ file: File; duration: number; index: number }>,
    images: Array<{ file: File; index: number }>,
    totalVideoDuration: number,
    enableAnimation: boolean,
    hasVideoOverlay: boolean,
    hasSubscribeVideo: boolean,
    subscribeDuration: number
  ): string => {
    // Video duration is already calculated as voiceover + 2 seconds

    // Build filter complex
    // Input 0: background music
    // Input 1: voiceover (voiceover.mp3)
    // Input 2, 3, 4, ...: background images (N images)
    // Input 2+N: video overlay (if provided)
    // Input 2+N or 3+N: subscribe video (if provided)

    let filterComplex = "";
    let currentLayer = "img";
    let nextInputIndex = 2 + numBgFiles; // First index after background files
    const crossfadeDuration = 1.0;

    // Handle background: videos play first, then images spread across remaining time
    if (videos.length === 0 && images.length === 0) {
      // No background - shouldn't happen due to validation
      filterComplex += `color=c=black:s=1920x1080:d=${videoDuration}[img];`;
    } else if (videos.length > 0 && images.length === 0) {
      // Only videos: play sequentially or loop single video
      if (videos.length === 1) {
        // Single video: loop until video duration is reached
        const video = videos[0];
        const numLoops = Math.ceil(videoDuration / video.duration);
        const inputIndex = 2 + video.index;

        filterComplex += `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS[vbase];`;

        if (numLoops > 1) {
          filterComplex += `[vbase]loop=${numLoops}:32767:0,trim=duration=${videoDuration},setpts=PTS-STARTPTS[img];`;
        } else {
          filterComplex += `[vbase]trim=duration=${videoDuration},setpts=PTS-STARTPTS[img];`;
        }
      } else {
        // Multiple videos: concatenate them sequentially
        for (let i = 0; i < videos.length; i++) {
          const inputIndex = 2 + videos[i].index;
          filterComplex += `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS[v${i}];`;
        }

        // Concatenate all videos
        let concatInputs = "";
        for (let i = 0; i < videos.length; i++) {
          concatInputs += `[v${i}]`;
        }
        filterComplex += `${concatInputs}concat=n=${videos.length}:v=1:a=0[vconcat];`;

        // Loop or trim to match duration
        if (totalVideoDuration < videoDuration) {
          const numLoops = Math.ceil(videoDuration / totalVideoDuration);
          filterComplex += `[vconcat]loop=${numLoops}:32767:0,trim=duration=${videoDuration},setpts=PTS-STARTPTS[img];`;
        } else {
          filterComplex += `[vconcat]trim=duration=${videoDuration},setpts=PTS-STARTPTS[img];`;
        }
      }
    } else if (videos.length === 0 && images.length > 0) {
      // Only images: spread equally with crossfade (existing logic)
      if (images.length === 1) {
        // Single image: loop for entire duration
        const inputIndex = 2 + images[0].index;
        filterComplex += `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=-1:size=1:start=0,trim=duration=${videoDuration}[img];`;
      } else {
        // Multiple images with equal distribution and crossfade (original logic)
        const segmentDuration = videoDuration / images.length;

        for (let i = 0; i < images.length; i++) {
          const inputIndex = 2 + images[i].index;
          const imageDuration =
            segmentDuration + (i < images.length - 1 ? crossfadeDuration : 0);

          if (enableAnimation) {
            const fps = 30;
            const totalFrames = Math.ceil(imageDuration * fps);
            filterComplex += `[${inputIndex}:v]scale=2304:1296:force_original_aspect_ratio=decrease,pad=2304:1296:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=-1:size=1:start=0[scaled${i}];`;
            filterComplex += `[scaled${i}]zoompan=z='min(1.2-(0.2*on/${totalFrames}),1.2)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps},trim=duration=${imageDuration.toFixed(
              3
            )},setpts=PTS-STARTPTS[img${i}];`;
          } else {
            filterComplex += `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=-1:size=1:start=0,trim=duration=${imageDuration.toFixed(
              3
            )},setpts=PTS-STARTPTS[img${i}];`;
          }
        }

        // Build crossfade chain
        let previousOutput = "img0";
        for (let i = 1; i < images.length; i++) {
          const offsetTime = segmentDuration * i;
          const outputLabel = i === images.length - 1 ? "img" : `xf${i}`;
          filterComplex += `[${previousOutput}][img${i}]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offsetTime.toFixed(
            3
          )}[${outputLabel}];`;
          previousOutput = outputLabel;
        }
      }
    } else {
      // Mixed: videos first, then images spread across remaining time
      // Step 1: Concatenate all videos sequentially
      for (let i = 0; i < videos.length; i++) {
        const inputIndex = 2 + videos[i].index;
        filterComplex += `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS[v${i}];`;
      }

      let concatInputs = "";
      for (let i = 0; i < videos.length; i++) {
        concatInputs += `[v${i}]`;
      }
      filterComplex += `${concatInputs}concat=n=${
        videos.length
      }:v=1:a=0,trim=duration=${Math.min(
        totalVideoDuration,
        videoDuration
      )},setpts=PTS-STARTPTS[videos];`;

      // Step 2: Prepare images for remaining duration
      const remainingDuration = Math.max(0, videoDuration - totalVideoDuration);

      if (remainingDuration > 0 && images.length > 0) {
        const segmentDuration = remainingDuration / images.length;

        for (let i = 0; i < images.length; i++) {
          const inputIndex = 2 + images[i].index;
          const imageDuration =
            segmentDuration + (i < images.length - 1 ? crossfadeDuration : 0);

          if (enableAnimation) {
            const fps = 30;
            const totalFrames = Math.ceil(imageDuration * fps);
            filterComplex += `[${inputIndex}:v]scale=2304:1296:force_original_aspect_ratio=decrease,pad=2304:1296:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=-1:size=1:start=0[scaledimg${i}];`;
            filterComplex += `[scaledimg${i}]zoompan=z='min(1.2-(0.2*on/${totalFrames}),1.2)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps},trim=duration=${imageDuration.toFixed(
              3
            )},setpts=PTS-STARTPTS[imgprep${i}];`;
          } else {
            filterComplex += `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,loop=loop=-1:size=1:start=0,trim=duration=${imageDuration.toFixed(
              3
            )},setpts=PTS-STARTPTS[imgprep${i}];`;
          }
        }

        // Build crossfade chain for images
        let previousOutput = "imgprep0";
        for (let i = 1; i < images.length; i++) {
          const offsetTime = segmentDuration * i;
          const outputLabel = i === images.length - 1 ? "images" : `imgxf${i}`;
          filterComplex += `[${previousOutput}][imgprep${i}]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offsetTime.toFixed(
            3
          )}[${outputLabel}];`;
          previousOutput = outputLabel;
        }

        // Step 3: Concatenate videos and images
        filterComplex += `[videos][images]concat=n=2:v=1:a=0[img];`;
      } else {
        // No remaining duration or no images, just use videos
        filterComplex += `[videos]copy[img];`;
      }
    }

    // Add video overlay if provided (30% opacity, looped for entire duration)
    if (hasVideoOverlay) {
      const overlayInputIndex = nextInputIndex;
      nextInputIndex++;
      // Video overlay looping is handled by -stream_loop on input (more memory efficient)
      filterComplex += `[${overlayInputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,format=yuva420p,colorchannelmixer=aa=0.3,trim=duration=${videoDuration},setpts=PTS-STARTPTS[overlay];`;
      filterComplex += `[img][overlay]overlay=format=auto[withoverlay];`;
      currentLayer = "withoverlay";
    }

    // Add subtitles on top using ASS file (styling is already defined in the ASS file)
    filterComplex += `[${currentLayer}]ass=subtitles.ass[withsubs];`;

    // Add subscribe video overlay at dynamically calculated timestamps if provided
    if (hasSubscribeVideo) {
      const subscribeInputIndex = nextInputIndex;
      nextInputIndex++;

      // Calculate dynamic timestamps based on video duration
      // Number of times to show subscribe button (from user setting)
      const subscribeCount = subscribeButtonCount;

      // Calculate available duration (ensure last animation completes fully)
      const availableDuration = videoDuration - subscribeDuration;

      // Calculate interval between appearances
      const interval = availableDuration / (subscribeCount - 1);

      // Generate evenly spaced timestamps
      // First at 0, last positioned so animation completes before video ends
      const targetTimestamps: number[] = [];
      for (let i = 0; i < subscribeCount; i++) {
        targetTimestamps.push(Math.round(i * interval));
      }

      // Process the subscribe video - looping is handled by -stream_loop on input (more memory efficient)
      filterComplex += `[${subscribeInputIndex}:v]trim=duration=${videoDuration},setpts=PTS-STARTPTS[loopsub];`;

      // For each target timestamp, find where in the animation loop it falls
      // and adjust to show complete animation cycles
      const timeWindows = targetTimestamps.map((target) => {
        // Calculate how far into a loop cycle this timestamp falls
        const offsetInCycle = target % subscribeDuration;

        // Adjust start time to beginning of the nearest cycle
        const adjustedStart = target - offsetInCycle;

        // Show the full animation duration
        const adjustedEnd = adjustedStart + subscribeDuration;

        // Make sure we don't go beyond video duration
        const endTime = Math.min(adjustedEnd, videoDuration);

        return { start: adjustedStart, end: endTime };
      });

      // Create enable expression for all adjusted time windows
      const enableExpr = timeWindows
        .map(
          ({ start, end }) => `between(t,${start.toFixed(3)},${end.toFixed(3)})`
        )
        .join("+");

      // Overlay the looped video, only visible during the calculated time windows
      // Position based on subscribeButtonVerticalPosition setting, centered horizontally
      const verticalPos = subscribeButtonVerticalPosition / 100;
      filterComplex += `[withsubs][loopsub]overlay=x=(W-w)/2:y=H*${verticalPos}-h/2:enable='${enableExpr}'[v];`;
    } else {
      // No subscribe video, just pass through
      filterComplex += `[withsubs]copy[v];`;
    }

    // Audio processing:
    // - Voiceover at +15dB (full duration)
    // - Background music: trim to video duration, apply volume -2dB, fade out in last 2 seconds
    filterComplex += `[1:a]volume=15dB[vo];`;
    filterComplex += `[0:a]atrim=0:${videoDuration},volume=-2dB,afade=t=out:st=${voiceoverDuration}:d=2[bg];`;

    // Mix audio tracks - longest duration determines output
    filterComplex += `[bg][vo]amix=inputs=2:duration=longest:dropout_transition=2[a]`;

    // Build input list - escape filenames to handle spaces and special characters
    const escapeFilename = (filename: string): string => {
      // Replace spaces and wrap in quotes if needed
      if (
        filename.includes(" ") ||
        filename.includes("(") ||
        filename.includes(")")
      ) {
        return `"${filename.replace(/"/g, '\\"')}"`;
      }
      return filename;
    };

    // Build input list - music, voiceover, then all images
    let inputList = `-i ${escapeFilename(
      scriptBackgroundMusic!.name
    )} -i voiceover.mp3`;

    // Add all background images
    scriptImages.forEach((image) => {
      inputList += ` -i ${escapeFilename(image.name)}`;
    });

    if (hasVideoOverlay) {
      // Use -stream_loop -1 for memory-efficient infinite looping (re-reads file instead of buffering)
      inputList += ` -stream_loop -1 -i ${escapeFilename(
        scriptVideoOverlay!.name
      )}`;
    }
    if (hasSubscribeVideo) {
      // Use -stream_loop -1 for memory-efficient infinite looping (re-reads file instead of buffering)
      inputList += ` -stream_loop -1 -i ${escapeFilename(
        scriptSubscribeVideo!.name
      )}`;
    }

    // Build full command - try GPU encoding with h264_nvenc
    const command = `ffmpeg ${inputList} -filter_complex "${filterComplex}" -map "[v]" -map "[a]" -c:v h264_nvenc -preset fast -b:v 5M -c:a aac -b:a 192k -t ${videoDuration} output.mp4`;

    return command;
  };

  const pollRenderStatus = async (jobId: string): Promise<void> => {
    const pollInterval = 2000; // 2 seconds

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      try {
        const response = await fetch(`${renderServerUrl}/status/${jobId}`);
        const status = await response.json();

        // Debug log to see what the server is returning
        console.log("Server status response:", status);

        // Update logs if provided by server (check before error to capture error logs)
        if (status.log) {
          setRenderLogs((prev) => {
            const newLogs = Array.isArray(status.log)
              ? status.log
              : [status.log];
            // Only add new logs that aren't already in the array
            const uniqueLogs = [...prev];
            newLogs.forEach((log: string) => {
              if (!uniqueLogs.includes(log)) {
                uniqueLogs.push(log);
              }
            });
            return uniqueLogs;
          });
        } else if (status.message) {
          // Handle single message as well
          setRenderLogs((prev) => {
            if (!prev.includes(status.message)) {
              return [...prev, status.message];
            }
            return prev;
          });
        }

        // If there's an error, add it to logs and throw
        if (status.error) {
          const errorMessage =
            typeof status.error === "string"
              ? status.error
              : JSON.stringify(status.error);

          // Add error to logs before throwing
          setRenderLogs((prev) => {
            const errorLines = errorMessage
              .split("\n")
              .filter((line) => line.trim());
            const uniqueLogs = [...prev];
            errorLines.forEach((line: string) => {
              if (!uniqueLogs.includes(line)) {
                uniqueLogs.push(line);
              }
            });
            return uniqueLogs;
          });

          throw new Error(errorMessage);
        }

        // Update progress - check multiple possible field names
        let progress = 0;
        if (typeof status.progress === "number") {
          progress = status.progress;
        } else if (typeof status.progress_percentage === "number") {
          progress = status.progress_percentage;
        } else if (typeof status.percent === "number") {
          progress = status.percent;
        } else if (typeof status.percentage === "number") {
          progress = status.percentage;
        }

        // Ensure progress is between 0 and 100
        progress = Math.min(100, Math.max(0, progress));
        console.log("Setting render progress to:", progress);
        setRenderProgress(progress);

        if (status.status === "completed") {
          setRenderProgress(100);
          setRenderedVideoUrl(`${renderServerUrl}${status.video_url}`);
          setIsRendering(false);
          toast({
            title: "Render Complete",
            description: "Your video has been rendered successfully!",
          });
          break;
        }

        if (status.status === "failed") {
          const errorMessage = status.error || "Render failed";

          // Add error to logs before throwing
          setRenderLogs((prev) => {
            const errorLines = errorMessage
              .split("\n")
              .filter((line) => line.trim());
            const uniqueLogs = [...prev];
            errorLines.forEach((line: string) => {
              if (!uniqueLogs.includes(line)) {
                uniqueLogs.push(line);
              }
            });
            return uniqueLogs;
          });

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error("Failed to poll render status:", error);

        // Add error to logs if not already there
        if (error instanceof Error) {
          setRenderLogs((prev) => {
            const errorLines = error.message
              .split("\n")
              .filter((line) => line.trim());
            const uniqueLogs = [...prev];
            errorLines.forEach((line: string) => {
              if (!uniqueLogs.includes(line)) {
                uniqueLogs.push(line);
              }
            });
            return uniqueLogs;
          });
        }

        setIsRendering(false);
        throw error;
      }
    }
  };

  const generateDescription = async () => {
    const apiKey = promptModel === "anthropic" ? anthropicApiKey : xaiApiKey;
    const apiKeyName = promptModel === "anthropic" ? "Anthropic" : "X AI";

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

    // Check rate limit for Anthropic
    if (promptModel === "anthropic" && !checkRateLimit()) {
      setIsGeneratingDescription(false);
      return;
    }

    try {
      // Create content from affirmations for the prompt
      const srtContent = affirmationTimings
        .map((timing) => timing.text)
        .join("\n");

      const prompt = `Write me a short SEO Optimized Description (3-4 lines only) for this Youtube video based on the srt file. The title is "${savedScriptTitle}". Start with the exact title. Follow that with 3 SEO optimized keywords hashtags for the video and follow that with the same keywords without hashtag and separated by comma.

SRT Content:
${srtContent}`;

      // Handle streaming response for description
      let generatedDescription = "";

      if (promptModel === "anthropic") {
        const anthropicClient = new Anthropic({
          apiKey: anthropicApiKey,
          dangerouslyAllowBrowser: true,
        });

        const completion = await anthropicClient.messages.create({
          model: anthropicModel,
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });

        // Handle Anthropic streaming
        for await (const chunk of completion) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const content = chunk.delta.text || "";
            generatedDescription += content;
          }
        }
      } else if (promptModel === "xai") {
        // Xai API call with CORS
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-0709",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Xai API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  const content = data.choices[0].delta.content;
                  generatedDescription += content;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
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

  // Functions removed - placeholder for future features

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
    const wordTimings: Array<
      Array<{ word: string; start: number; end: number }>
    > = [];

    for (let i = 0; i < affirmationLines.length; i++) {
      const affirmation = affirmationLines[i].trim();
      if (!affirmation) continue;

      try {
        setProgress(((i + 1) / affirmationLines.length) * 70); // 70% for individual clips

        // Use Kokoro's /dev/captioned_speech endpoint to get word-level timestamps
        const response = await fetch(
          "http://localhost:8880/dev/captioned_speech",
          {
            method: "POST",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: voiceSettings.model,
              input: affirmation,
              voice: voiceSettings.voice,
              speed: voiceSettings.speed,
              response_format: "wav",
              timestamps: true,
              stream: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to generate audio for: "${affirmation}"`);
        }

        const data = await response.json();

        // Extract audio
        if (data.audio) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))],
            { type: "audio/wav" }
          );
          audioClips.push(audioBlob);
        } else {
          throw new Error("No audio data in response");
        }

        // Extract word timings (check both timestamps and captions fields)
        let wordTimingsForLine: Array<{
          word: string;
          start: number;
          end: number;
        }> = [];

        const timestampData = data.timestamps || data.captions || [];
        if (Array.isArray(timestampData) && timestampData.length > 0) {
          const rawWordTimings = timestampData.map((ts: any) => ({
            word: ts.word || ts.text || "",
            start: ts.start || ts.start_time || 0,
            end: ts.end || ts.end_time || 0,
          }));

          // MERGE PUNCTUATION: Attach punctuation to previous word to fix placement
          // This prevents issues like "Depositors. " becoming "Depositors .withdrew"
          wordTimingsForLine = [];
          for (let i = 0; i < rawWordTimings.length; i++) {
            const current = rawWordTimings[i];

            // Check if this is standalone punctuation that should be merged
            if (isPunctuation(current.word) && wordTimingsForLine.length > 0) {
              // Merge with previous word
              const prev = wordTimingsForLine[wordTimingsForLine.length - 1];
              prev.word = prev.word + current.word; // Attach punctuation
              prev.end = current.end; // Extend end time to include punctuation
            } else {
              // Regular word, add as-is
              wordTimingsForLine.push({ ...current });
            }
          }
        }

        wordTimings.push(wordTimingsForLine);
      } catch (error) {
        toast({
          title: "Generation Error",
          description: `Failed to generate audio for affirmation ${i + 1}`,
          variant: "destructive",
        });
        throw error;
      }
    }

    return { audioClips, wordTimings };
  };

  const removeInternalPauses = (
    audioBuffer: AudioBuffer,
    maxPauseLength: number = 0.4
  ): {
    buffer: AudioBuffer;
    timeAdjustments: Array<{ originalTime: number; adjustedTime: number }>;
  } => {
    // Use the same sample rate as the input buffer
    const inputData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const silenceThreshold = 0.01; // Volume threshold for silence detection
    const maxPauseSamples = maxPauseLength * sampleRate;

    const outputData: number[] = [];
    let currentSilenceLength = 0;
    let removedSamples = 0;
    const timeAdjustments: Array<{
      originalTime: number;
      adjustedTime: number;
    }> = [];

    // Track time adjustments at key points
    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      const isSilent = Math.abs(sample) < silenceThreshold;

      if (isSilent) {
        currentSilenceLength++;
        // Only add silence if it's shorter than max allowed pause
        if (currentSilenceLength <= maxPauseSamples) {
          outputData.push(sample);
        } else {
          // Track removed silence
          removedSamples++;
          // Record adjustment every 0.1 seconds of removed audio
          if (removedSamples % Math.floor(sampleRate * 0.1) === 0) {
            timeAdjustments.push({
              originalTime: i / sampleRate,
              adjustedTime: outputData.length / sampleRate,
            });
          }
        }
      } else {
        currentSilenceLength = 0;
        outputData.push(sample);
      }
    }

    // Add final adjustment point
    timeAdjustments.push({
      originalTime: inputData.length / sampleRate,
      adjustedTime: outputData.length / sampleRate,
    });

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

    return { buffer: outputBuffer, timeAdjustments };
  };

  const combineAudioClips = async (
    audioClips: Blob[],
    affirmationLines: string[],
    wordTimings: Array<Array<{ word: string; start: number; end: number }>>
  ): Promise<Blob> => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const audioBuffers: AudioBuffer[] = [];
    const timings: Array<{
      text: string;
      start: number;
      end: number;
      words?: Array<{ word: string; start: number; end: number }>;
    }> = [];

    try {
      // Check if we have word timings
      const hasWordTimings = wordTimings.some((wt) => wt && wt.length > 0);

      // Decode all audio clips
      for (const clip of audioClips) {
        const arrayBuffer = await clip.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // If we have word timestamps, keep original audio (timestamps match original)
        // If no word timestamps, remove pauses
        if (hasWordTimings) {
          audioBuffers.push(audioBuffer);
        } else {
          const { buffer: processedBuffer } = removeInternalPauses(audioBuffer);
          audioBuffers.push(processedBuffer);
        }
      }

      // Calculate total duration
      const totalDuration = audioBuffers.reduce(
        (sum, buffer) => sum + buffer.duration,
        0
      );

      // Create output buffer
      const sampleRate = audioBuffers[0].sampleRate;
      const outputBuffer = audioContext.createBuffer(
        1,
        totalDuration * sampleRate,
        sampleRate
      );
      const outputData = outputBuffer.getChannelData(0);

      // Combine audio and track timings
      let currentTime = 0;
      let currentOffset = 0;
      for (let i = 0; i < audioBuffers.length; i++) {
        const buffer = audioBuffers[i];
        const inputData = buffer.getChannelData(0);
        const startTime = currentTime;
        const endTime = currentTime + buffer.duration;

        // Adjust word timings by adding offset for combined audio position
        const adjustedWordTimings =
          wordTimings[i]?.length > 0
            ? wordTimings[i].map((word) => ({
                word: word.word,
                start: word.start + startTime,
                end: word.end + startTime,
              }))
            : undefined;

        // Track timing for .srt generation
        timings.push({
          text: affirmationLines[i].trim(),
          start: startTime,
          end: endTime,
          words: adjustedWordTimings,
        });

        // Copy audio data
        for (let j = 0; j < inputData.length; j++) {
          outputData[currentOffset + j] = inputData[j];
        }

        currentOffset += inputData.length;
        currentTime = endTime;
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

      const { audioClips, wordTimings } = await generateAudioClips(lines);

      setProgress(80);
      const combinedAudio = await combineAudioClips(
        audioClips,
        lines,
        wordTimings
      );

      const audioUrl = URL.createObjectURL(combinedAudio);
      setGeneratedAudio(audioUrl);

      // Auto-apply EQ if enabled OR if EQ settings exist (manual application)
      if ((autoApplyEQ || eqSettings) && eqSettings) {
        try {
          // Set progress to 90% when starting EQ processing
          setProgress(90);

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

            // Set progress to 100% when EQ processing is complete
            setProgress(100);

            toast({
              title: "Auto EQ Applied!",
              description: `Applied ${eqSettings.selectedPreset} preset with ${
                eqSettings.pitchShift > 0 ? "+" : ""
              }${eqSettings.pitchShift} pitch and ${
                eqSettings.reverbAmount
              }% reverb.`,
            });
          };

          // Wait for EQ processing to complete before continuing
          await processAudioWithEQ();
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
        // Set progress to 100% for voices without auto EQ
        setProgress(100);

        toast({
          title: "Generation Complete!",
          description: "Your affirmation audio is ready for download.",
        });
      }

      // Map timestamps to scenes if scenes exist
      if (scenes.length > 0) {
        setTimeout(() => mapTimestampsToScenes(), 100);
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
      // Don't reset progress to 0 - keep it at 100% to show completion
      // Progress will be reset to 0 when starting a new generation
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

  // Generate SRT for download - uses same logic as video rendering
  const generateSrtContent = (): string => {
    // First pass: collect all captions with their natural timings
    const captions: Array<{ text: string; start: number; end: number }> = [];

    for (const timing of affirmationTimings) {
      // Use Kokoro's word-level timestamps
      if (timing.words && timing.words.length > 0) {
        let currentLine = "";
        let lineStartTime = 0;
        let lineEndTime = 0;

        for (let i = 0; i < timing.words.length; i++) {
          const word = timing.words[i];

          // Build the test line
          const needsSpace =
            currentLine.length > 0 && !isPunctuation(word.word);
          const testLine = currentLine + (needsSpace ? " " : "") + word.word;

          // Check if adding this word exceeds the character limit
          if (testLine.length <= maxCharsPerLine) {
            // Add word to current line
            if (currentLine.length === 0) {
              lineStartTime = word.start;
            }
            currentLine = testLine;
            lineEndTime = word.end;
          } else {
            // Line is full - save current line
            if (currentLine.length > 0) {
              captions.push({
                text: currentLine,
                start: lineStartTime,
                end: word.start, // Natural end is when next word starts
              });
            }
            // Start new line with this word
            currentLine = word.word;
            lineStartTime = word.start;
            lineEndTime = word.end;
          }
        }

        // Save the last line if it has content
        if (currentLine.length > 0) {
          captions.push({
            text: currentLine,
            start: lineStartTime,
            end: lineEndTime,
          });
        }
      }
    }

    // Second pass: adjust so each caption ends exactly when the next starts
    for (let i = 0; i < captions.length - 1; i++) {
      captions[i].end = captions[i + 1].start;
    }

    // Generate SRT entries
    const srtEntries: string[] = [];
    captions.forEach((caption, index) => {
      srtEntries.push(
        `${index + 1}\n${formatTime(caption.start)} --> ${formatTime(
          caption.end
        )}\n${caption.text}\n`
      );
    });

    return srtEntries.join("\n");
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

  // Download ASS file - uses exact same timing as SRT (no overlaps)
  const handleDownloadAss = () => {
    if (affirmationTimings.length > 0) {
      // Calculate video duration (same as in rendering)
      const voiceoverDuration =
        affirmationTimings[affirmationTimings.length - 1].end;
      const videoDuration = voiceoverDuration + 2;

      const assContent = generateASSContent(affirmationTimings, videoDuration);
      const blob = new Blob([assContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = savedScriptTitle
        ? `${savedScriptTitle
            .replace(/[<>:"/\\|?*]/g, "_")
            .replace(/\s+/g, " ")
            .trim()}.ass`
        : "affirmations.ass";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    }
  };

  // Generate timestamp file with word-level timestamps
  // Uses the same overlap-handling logic as SRT/ASS
  const generateTimestampContent = (
    timings: Array<{
      text: string;
      start: number;
      end: number;
      words?: Array<{ word: string; start: number; end: number }>;
    }>,
    maxDuration: number
  ): string => {
    // Collect all word-level timestamps
    const wordTimestamps: Array<{ word: string; start: number; end: number }> =
      [];

    for (const timing of timings) {
      if (timing.start >= maxDuration) continue;

      // Use Kokoro's word-level timestamps
      if (timing.words && timing.words.length > 0) {
        for (const word of timing.words) {
          if (word.start >= maxDuration) break;

          wordTimestamps.push({
            word: word.word,
            start: word.start,
            end: Math.min(word.end, maxDuration),
          });
        }
      }
    }

    // Second pass: adjust so each word ends exactly when the next starts
    // THIS IS THE KEY FIX THAT PREVENTS OVERLAPS (same as SRT/ASS)
    for (let i = 0; i < wordTimestamps.length - 1; i++) {
      wordTimestamps[i].end = wordTimestamps[i + 1].start;
    }

    // Format timestamps as JSON for easy parsing
    const timestampData = {
      version: "1.0",
      note: "Word-level timestamps with overlap prevention (same logic as SRT/ASS subtitles)",
      words: wordTimestamps.map((wt) => ({
        word: wt.word,
        start: wt.start,
        end: wt.end,
      })),
    };

    return JSON.stringify(timestampData, null, 2);
  };

  // Map word-level timestamps to scenes
  // Improved logic based on ParagraphProcessor for better decimal point and punctuation handling
  const mapTimestampsToScenes = (scenesToMap?: typeof scenes) => {
    const scenesToProcess = scenesToMap || scenes;
    if (affirmationTimings.length === 0 || scenesToProcess.length === 0) {
      return;
    }

    // Collect all word-level timestamps from affirmationTimings
    const allWords: Array<{ word: string; start: number; end: number }> = [];

    for (const timing of affirmationTimings) {
      if (timing.words && timing.words.length > 0) {
        allWords.push(...timing.words);
      }
    }

    if (allWords.length === 0) {
      toast({
        title: "No Word Timestamps",
        description: "No word-level timestamps available for mapping",
        variant: "destructive",
      });
      return;
    }

    // Normalize a single word (for word-by-word comparison)
    // Remove punctuation but preserve numbers (including decimals)
    const normalizeWord = (word: string) => {
      return word
        .toLowerCase()
        .replace(/[.,!?;:()\[\]"']/g, "") // Remove punctuation but keep numbers
        .trim();
    };

    // Build normalized word sequence from timestamps (ONCE, outside the loop)
    const timestampWords: Array<{
      word: string;
      normalized: string;
      start: number;
      end: number;
      index: number;
    }> = allWords.map((w, idx) => ({
      word: w.word,
      normalized: normalizeWord(w.word),
      start: w.start,
      end: w.end,
      index: idx,
    }));

    // Track current position in timestamp array (prevents re-matching and allows sequential matching)
    let currentWordIndex = 0;

    // Map each scene to timestamps
    const updatedScenes = scenesToProcess.map((scene, sceneIndex) => {
      // Split scene text into words (preserve original text structure)
      const sceneText = scene.text.trim();
      const sceneWords = sceneText.split(/\s+/);

      if (sceneWords.length === 0) {
        return {
          ...scene,
          hasTimestamp: false,
        };
      }

      // Try to find matching sequence starting from current position
      let bestMatch = { startWordIdx: -1, endWordIdx: -1, score: 0 };

      // Search for the scene starting from where we left off
      for (
        let startIdx = currentWordIndex;
        startIdx < timestampWords.length;
        startIdx++
      ) {
        let matchedWords = 0;
        let sceneWordIdx = 0;
        let wordIdx = startIdx;

        // Try to match all words in the scene
        while (
          sceneWordIdx < sceneWords.length &&
          wordIdx < timestampWords.length
        ) {
          const sentenceWord = sceneWords[sceneWordIdx];
          const timestampWord = timestampWords[wordIdx].word;

          // Normalize both words for comparison (remove punctuation)
          const normalizedSentenceWord = normalizeWord(sentenceWord);
          const normalizedTimestampWord = timestampWords[wordIdx].normalized;

          if (normalizedSentenceWord === normalizedTimestampWord) {
            matchedWords++;
            sceneWordIdx++;
            wordIdx++;
          } else if (normalizedTimestampWord === "") {
            // Skip punctuation-only words in timestamp data
            wordIdx++;
          } else if (normalizedSentenceWord === "") {
            // Skip empty words in scene
            sceneWordIdx++;
          } else {
            // No match, break
            break;
          }
        }

        // Calculate match score
        const score =
          sceneWords.length > 0 ? matchedWords / sceneWords.length : 0;

        // If we have a good match (>70%), use it (similar to ParagraphProcessor)
        if (score > 0.7 && score > bestMatch.score) {
          bestMatch = {
            startWordIdx: startIdx,
            endWordIdx: wordIdx - 1,
            score: score,
          };

          // If it's a very good match (>90%), stop searching
          if (score > 0.9) {
            break;
          }
        }

        // Don't search too far ahead (limit search window)
        if (startIdx - currentWordIndex > 50) {
          break;
        }
      }

      if (bestMatch.startWordIdx !== -1 && bestMatch.endWordIdx !== -1) {
        // Get the timestamps for this scene
        const startTime = timestampWords[bestMatch.startWordIdx].start;
        const endTime = timestampWords[bestMatch.endWordIdx].end;

        // Update search position for next scene
        currentWordIndex = bestMatch.endWordIdx + 1;

        const matchedWords = timestampWords
          .slice(bestMatch.startWordIdx, bestMatch.endWordIdx + 1)
          .map((w) => w.word)
          .join(" ");

        console.log(
          `✓ Matched scene ${sceneIndex + 1}: "${scene.text.substring(
            0,
            40
          )}..."\n` +
            `  to "${matchedWords.substring(0, 40)}..." \n` +
            `  Score: ${(bestMatch.score * 100).toFixed(1)}% | ` +
            `  Time: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`
        );

        return {
          ...scene,
          startTime,
          endTime,
          hasTimestamp: true,
        };
      }

      console.warn(
        `✗ Could not find match for scene ${
          sceneIndex + 1
        }: "${scene.text.substring(0, 50)}..."`
      );

      return {
        ...scene,
        hasTimestamp: false,
      };
    });

    setScenes(updatedScenes);

    const matchedCount = updatedScenes.filter((s) => s.hasTimestamp).length;
    toast({
      title: "Timestamps Mapped",
      description: `${matchedCount} of ${scenesToProcess.length} scenes matched with timestamps`,
    });
  };

  // Generate XMEML timeline for Premiere Pro
  const generateXMEML = (): string => {
    const frameRate = 30;
    const width = 1920;
    const height = 1080;

    // Collect all scenes with images and timestamps
    const allClips = scenes
      .map((scene, index) => ({
        scene,
        filename: `scene-${String(index + 1).padStart(4, "0")}.jpg`,
        index,
      }))
      .filter(
        (clip) =>
          clip.scene.imageUrl &&
          clip.scene.startTime !== undefined &&
          clip.scene.endTime !== undefined
      );

    if (allClips.length === 0) {
      return "";
    }

    // Calculate adjusted start and end frames to fill gaps
    const adjustedClips: Array<{
      scene: (typeof scenes)[0];
      filename: string;
      index: number;
      startFrame: number;
      endFrame: number;
      duration: number;
    }> = [];

    for (let idx = 0; idx < allClips.length; idx++) {
      const clip = allClips[idx];
      let startFrame: number;
      let endFrame: number;

      // First clip starts at frame 0
      if (idx === 0) {
        startFrame = 0;
      } else {
        // Each subsequent clip starts where the previous one ended
        startFrame = adjustedClips[idx - 1].endFrame;
      }

      // End frame: either extends to next clip's start or to its natural end
      if (idx < allClips.length - 1) {
        // Extend to where next clip's audio starts
        const nextStartFrame = Math.floor(
          allClips[idx + 1].scene.startTime! * frameRate
        );
        endFrame = nextStartFrame;
      } else {
        // Last clip: use its natural end time
        endFrame = Math.ceil(clip.scene.endTime! * frameRate);
      }

      // Ensure at least 1 frame duration
      if (endFrame <= startFrame) {
        endFrame = startFrame + 1;
      }

      adjustedClips.push({
        ...clip,
        startFrame,
        endFrame,
        duration: endFrame - startFrame,
      });
    }

    // Calculate total duration from the last clip
    const totalDuration = adjustedClips[adjustedClips.length - 1].endFrame;

    // Generate clip nodes for the timeline with file definitions INSIDE
    const clipNodes = adjustedClips
      .map((clip, idx) => {
        return `          <clipitem id="clipitem-${idx + 1}">
            <name>${clip.filename}</name>
            <duration>${clip.duration}</duration>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${clip.startFrame}</start>
            <end>${clip.endFrame}</end>
            <in>0</in>
            <out>${clip.duration}</out>
            <file id="file-${idx + 1}">
              <name>${clip.filename}</name>
              <pathurl>file://localhost/${clip.filename}</pathurl>
              <rate>
                <timebase>${frameRate}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <duration>${clip.duration}</duration>
              <media>
                <video>
                  <samplecharacteristics>
                    <width>${width}</width>
                    <height>${height}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
          </clipitem>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>Script Timeline</name>
    <duration>${totalDuration}</duration>
    <rate>
      <timebase>${frameRate}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${frameRate}</timebase>
        <ntsc>FALSE</ntsc>
      </rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>1920</width>
            <height>1080</height>
            <pixelaspectratio>square</pixelaspectratio>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
          </samplecharacteristics>
        </format>
        <track>
${clipNodes}
        </track>
      </video>
    </media>
  </sequence>
</xmeml>`;

    return xml;
  };

  // Download all images as ZIP
  const downloadAllImages = async () => {
    const allImages = scenes.filter((scene) => scene.imageUrl);

    if (allImages.length === 0) {
      toast({
        title: "No Images",
        description: "No images to download!",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preparing Download",
      description: `Preparing ${allImages.length} images for download...`,
    });

    try {
      const zip = new JSZip();

      // Helper function to convert image to JPG (much smaller than PNG)
      const convertImageToJPG = async (imageUrl: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          img.onload = () => {
            try {
              // Create canvas with image dimensions
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;

              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
              }

              // Fill with white background (for transparency handling)
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Draw image on canvas
              ctx.drawImage(img, 0, 0);

              // Convert canvas to blob (JPEG format - much smaller file size)
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error("Failed to convert canvas to blob"));
                  }
                },
                "image/jpeg",
                0.85 // Good quality, significantly smaller than PNG
              );
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => {
            reject(new Error("Failed to load image"));
          };

          img.src = imageUrl;
        });
      };

      // Add each image to the zip file
      for (let i = 0; i < allImages.length; i++) {
        try {
          const scene = allImages[i];
          const imageUrl = scene.imageUrl!;

          // Convert image to JPG format (smaller file size)
          const imageBlob = await convertImageToJPG(imageUrl);

          // Add image to zip with numbered filename and proper extension
          const paddedNumber = String(i + 1).padStart(4, "0");
          zip.file(`scene-${paddedNumber}.jpg`, imageBlob);
        } catch (error) {
          console.error(`Failed to add image ${i + 1} to zip:`, error);
          toast({
            title: "Error",
            description: `Failed to add image ${i + 1}`,
            variant: "destructive",
          });
        }
      }

      // Generate the zip file with compression
      toast({
        title: "Creating Zip",
        description: "Creating zip file...",
      });
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      // Create download link for the zip file
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `script-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(zipUrl), 100);

      toast({
        title: "Download Complete",
        description: "All images downloaded as zip file!",
      });
    } catch (error) {
      console.error("Failed to create zip file:", error);
      toast({
        title: "Error",
        description: "Failed to create zip file",
        variant: "destructive",
      });
    }
  };

  // Download images with timeline XML for Premiere Pro
  const downloadWithTimeline = async () => {
    if (affirmationTimings.length === 0) {
      toast({
        title: "No Timestamps",
        description: "Please generate voice with timestamps first!",
        variant: "destructive",
      });
      return;
    }

    // Check if we need to map timestamps first
    const scenesWithImages = scenes.filter((scene) => scene.imageUrl);
    if (scenesWithImages.length === 0) {
      toast({
        title: "No Images",
        description: "Please generate images for scenes first!",
        variant: "destructive",
      });
      return;
    }

    // Automatically map timestamps if not already mapped
    const needsMapping = scenesWithImages.some(
      (scene) => scene.startTime === undefined || scene.endTime === undefined
    );

    if (needsMapping && scenes.length > 0) {
      toast({
        title: "Mapping Timestamps",
        description: "Mapping timestamps to scenes...",
      });
      mapTimestampsToScenes();

      // Wait a bit for state to update
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const imagesWithTimestamps = scenes.filter(
      (scene) =>
        scene.imageUrl &&
        scene.startTime !== undefined &&
        scene.endTime !== undefined
    );

    if (imagesWithTimestamps.length === 0) {
      toast({
        title: "No Images with Timestamps",
        description:
          "Could not map timestamps to images. Please ensure scenes are synced.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preparing Timeline Package",
      description: `Preparing ${imagesWithTimestamps.length} images with timeline...`,
    });

    try {
      const zip = new JSZip();

      // Helper function to convert image to JPG (much smaller than PNG)
      const convertImageToJPG = async (imageUrl: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;

              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
              }

              // Fill with white background (for transparency handling)
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.drawImage(img, 0, 0);

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error("Failed to convert canvas to blob"));
                  }
                },
                "image/jpeg",
                0.85 // Good quality, significantly smaller than PNG
              );
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => {
            reject(new Error("Failed to load image"));
          };

          img.src = imageUrl;
        });
      };

      // Add each image to the zip file
      let imageIndex = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene.imageUrl && scene.startTime !== undefined) {
          try {
            const imageBlob = await convertImageToJPG(scene.imageUrl);
            const paddedNumber = String(i + 1).padStart(4, "0");
            zip.file(`scene-${paddedNumber}.jpg`, imageBlob);
            imageIndex++;
          } catch (error) {
            console.error(
              `Failed to add image ${imageIndex + 1} to zip:`,
              error
            );
            toast({
              title: "Error",
              description: `Failed to add image ${imageIndex + 1}`,
              variant: "destructive",
            });
          }
        }
      }

      // Generate and add XMEML file
      const xmeml = generateXMEML();
      if (xmeml) {
        zip.file("timeline.xml", xmeml);
      }

      // Generate the zip file
      toast({
        title: "Creating Timeline Package",
        description: "Creating zip file with timeline...",
      });
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      // Create download link
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `script-timeline-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(zipUrl), 100);

      toast({
        title: "Download Complete",
        description:
          "Timeline package downloaded! Drag timeline.xml into Premiere Pro.",
      });
    } catch (error) {
      console.error("Failed to create timeline package:", error);
      toast({
        title: "Error",
        description: "Failed to create timeline package",
        variant: "destructive",
      });
    }
  };

  // Generate prompt for a single scene
  const generatePromptForScene = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;

    const apiKey = promptModel === "anthropic" ? anthropicApiKey : xaiApiKey;
    const apiKeyName = promptModel === "anthropic" ? "Anthropic" : "X AI";

    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${apiKeyName} API key in settings.`,
        variant: "destructive",
      });
      return;
    }

    setGeneratingPromptForScene(sceneIndex);

    const styleGuide =
      scenePrompt.trim() || "Create vivid, detailed image prompts";

    const aiPrompt = `Generate an image generation prompt for this scene from a script.

Style Guide: ${styleGuide}

Full Script for Context:
${affirmations}

Scene to generate prompt for:
${scene.text}

Generate a single, detailed image generation prompt that follows the style guide and captures the essence of this scene. Output ONLY the prompt, nothing else.`;

    try {
      let generatedPrompt = "";

      if (promptModel === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          mode: "cors",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: anthropicModel,
            max_tokens: 2048,
            messages: [{ role: "user", content: aiPrompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        generatedPrompt = data.content?.[0]?.text || "";
      } else {
        // X.AI API
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          mode: "cors",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-0709",
            messages: [{ role: "user", content: aiPrompt }],
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        generatedPrompt = data.choices?.[0]?.message?.content || "";
      }

      if (generatedPrompt.trim()) {
        const newScenes = [...scenes];
        newScenes[sceneIndex].prompt = generatedPrompt.trim();
        setScenes(newScenes);

        toast({
          title: "Prompt Generated",
          description: `Generated prompt for scene ${sceneIndex + 1}`,
        });
      } else {
        throw new Error("No prompt generated");
      }
    } catch (error) {
      console.error("Prompt generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate prompt",
        variant: "destructive",
      });
    } finally {
      setGeneratingPromptForScene(null);
    }
  };

  // Generate image for a single scene
  const generateImageForScene = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;

    if (!scene.prompt.trim()) {
      toast({
        title: "No Prompt",
        description: "Please generate a prompt first!",
        variant: "destructive",
      });
      return;
    }

    if (!falAiApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Fal AI API key in settings.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingImageForScene(sceneIndex);

    try {
      const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falAiApiKey}`,
        },
        body: JSON.stringify({
          prompt: scene.prompt,
          image_size: "landscape_16_9",
          num_inference_steps: 4,
          num_images: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || data.detail || "Fal AI API error"
        );
      }

      const imageUrl = data.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL in response");
      }

      const newScenes = [...scenes];
      newScenes[sceneIndex].imageUrl = imageUrl;
      setScenes(newScenes);

      toast({
        title: "Image Generated",
        description: `Generated image for scene ${sceneIndex + 1}`,
      });
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setGeneratingImageForScene(null);
    }
  };

  // Download timestamp file
  const handleDownloadTimestamps = () => {
    if (affirmationTimings.length > 0) {
      // Calculate video duration (same as in rendering)
      const voiceoverDuration =
        affirmationTimings[affirmationTimings.length - 1].end;
      const videoDuration = voiceoverDuration + 2;

      const timestampContent = generateTimestampContent(
        affirmationTimings,
        videoDuration
      );
      const blob = new Blob([timestampContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = savedScriptTitle
        ? `${savedScriptTitle
            .replace(/[<>:"/\\|?*]/g, "_")
            .replace(/\s+/g, " ")
            .trim()}_timestamps.json`
        : "affirmations_timestamps.json";
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
        let autoApplyEQ = false;

        if (event.key.toLowerCase() === "i") {
          newVoice = "af_jessica(1)+af_v0nicole(8)+af_v0(1)";
          shortcutName = "Ivory Affirmation";
          newSpeed = 0.8;
          event.preventDefault();
        } else if (event.key.toLowerCase() === "g") {
          newVoice = "bm_fable(7)+bm_george(2)+af_nicole(1)";
          shortcutName = "Grounded Spirit Meditation";
          newSpeed = 0.8;
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
          } else {
            // Reset EQ settings for non-auto-EQ voices
            setEqSettings(null);
            setAutoApplyEQ(false);
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
    localStorage.setItem("selected-model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("selected-provider", selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    localStorage.setItem("selected-provider-type", selectedProviderType);
  }, [selectedProviderType]);

  useEffect(() => {
    if (anthropicApiKey) {
      localStorage.setItem("anthropic-api-key", anthropicApiKey);
    } else {
      localStorage.removeItem("anthropic-api-key");
    }
  }, [anthropicApiKey]);

  useEffect(() => {
    localStorage.setItem("anthropic-model", anthropicModel);
  }, [anthropicModel]);

  useEffect(() => {
    if (xaiApiKey) {
      localStorage.setItem("xai-api-key", xaiApiKey);
    } else {
      localStorage.removeItem("xai-api-key");
    }
  }, [xaiApiKey]);

  useEffect(() => {
    localStorage.setItem("prompt-model", promptModel);
  }, [promptModel]);

  useEffect(() => {
    if (falAiApiKey) {
      localStorage.setItem("fal-ai-api-key", falAiApiKey);
    } else {
      localStorage.removeItem("fal-ai-api-key");
    }
  }, [falAiApiKey]);

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
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center px-6">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="w-full space-y-8">
          {/* Main Content */}
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Input Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border">
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

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateScript}
                      disabled={isGeneratingScript}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      size="lg"
                    >
                      <Bot className="w-4 h-4 mr-0.5" />
                      {isGeneratingScript ? "Generating..." : "Generate Script"}
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      size="lg"
                    >
                      {isGenerating ? "Generating..." : "Generate Audio"}
                    </Button>
                  </div>

                  {isGenerating && (
                    <div className="mt-4 p-4 bg-white rounded-lg border space-y-2">
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">
                        {progress < 70
                          ? "Processing affirmations..."
                          : progress < 90
                          ? "Combining audio clips..."
                          : "Applying audio effects..."}
                      </p>
                    </div>
                  )}

                  {generatedAudio && (
                    <div className="mt-4 p-4 bg-white rounded-lg border">
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

                        {/* Audio Effects Button and Download Buttons */}
                        <div className="flex flex-wrap gap-2 pt-2 justify-center">
                          <Button
                            onClick={() => setShowEqualizer(true)}
                            variant="outline"
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Audio Effects
                          </Button>
                          <Button
                            onClick={handleDownload}
                            variant="outline"
                            size="sm"
                            className="!rounded-md"
                          >
                            <Download className="w-4 h-4 mr-0.5" />
                            Audio
                          </Button>
                          <Button
                            onClick={handleDownloadSrt}
                            variant="outline"
                            size="sm"
                            disabled={affirmationTimings.length === 0}
                            className="!rounded-md"
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
                            className="!rounded-md"
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
                            className="!rounded-md"
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

            {/* Settings Section */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border">
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

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="maxChars">Max Char/Line</Label>
                      <Input
                        id="maxChars"
                        type="number"
                        min="1"
                        max="42"
                        step="1"
                        value={maxCharsPerLine}
                        onChange={(e) =>
                          setMaxCharsPerLine(parseInt(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="captionVerticalPos">
                        Caption Position
                      </Label>
                      <Input
                        id="captionVerticalPos"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={captionVerticalPosition}
                        onChange={(e) =>
                          setCaptionVerticalPosition(parseInt(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="subscribeButtonVerticalPos">
                        Subscribe Position
                      </Label>
                      <Input
                        id="subscribeButtonVerticalPos"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={subscribeButtonVerticalPosition}
                        onChange={(e) =>
                          setSubscribeButtonVerticalPosition(
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subscribeButtonCount">
                      Subscribe Button Appearances
                    </Label>
                    <Input
                      id="subscribeButtonCount"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={subscribeButtonCount}
                      onChange={(e) =>
                        setSubscribeButtonCount(parseInt(e.target.value))
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm mb-2 block">Video Assets</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("script-image-input")
                              ?.click()
                          }
                          className="flex-1 !rounded-md"
                        >
                          {scriptImages.length > 0 && (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Add Bg{" "}
                          {scriptImages.length > 0 &&
                            `(${scriptImages.length})`}
                        </Button>
                        <Button
                          variant={bgAnimation ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBgAnimation(!bgAnimation)}
                          disabled={
                            scriptImages.length <= 1 || hasVideoBackground()
                          }
                          className="px-3 !rounded-md"
                          title={
                            hasVideoBackground()
                              ? "Animation not available for videos"
                              : scriptImages.length <= 1
                              ? "Upload multiple images to enable animation"
                              : bgAnimation
                              ? "Animation On"
                              : "Animation Off"
                          }
                        >
                          {bgAnimation ? "Anim: On" : "Anim: Off"}
                        </Button>
                      </div>
                      <input
                        id="script-image-input"
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setScriptImages(files);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("script-music-input")
                              ?.click()
                          }
                          className="flex-1 !rounded-md"
                        >
                          {scriptBackgroundMusic && (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          BGM
                        </Button>
                        <input
                          id="script-music-input"
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setScriptBackgroundMusic(file);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("script-overlay-input")
                              ?.click()
                          }
                          className="flex-1 !rounded-md"
                        >
                          {scriptVideoOverlay && (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Overlay
                        </Button>
                        <input
                          id="script-overlay-input"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setScriptVideoOverlay(file);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("script-subscribe-input")
                              ?.click()
                          }
                          className="flex-1 !rounded-md"
                        >
                          {scriptSubscribeVideo && (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Subscribe
                        </Button>
                        <input
                          id="script-subscribe-input"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setScriptSubscribeVideo(file);
                            }
                          }}
                        />
                      </div>

                      <Separator />

                      {/* XML-Based Timing Feature */}
                      <div>
                        <Label className="text-sm mb-2 block">
                          XML-Based Timing (Advanced)
                        </Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                document
                                  .getElementById("xml-images-input")
                                  ?.click();
                              }}
                              className="flex-1 !rounded-md"
                            >
                              {xmlTimedImages.length > 0 && (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              Upload Images{" "}
                              {xmlTimedImages.length > 0 &&
                                `(${xmlTimedImages.length})`}
                            </Button>
                            <Button
                              variant={
                                xmlTimingAnimation ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                setXmlTimingAnimation(!xmlTimingAnimation)
                              }
                              disabled={
                                xmlTimedImages.length === 0 || !xmlTimingFile
                              }
                              className="px-3 !rounded-md"
                              title={
                                xmlTimedImages.length === 0 || !xmlTimingFile
                                  ? "Upload images and XML file to enable animation"
                                  : xmlTimingAnimation
                                  ? "Animation On"
                                  : "Animation Off"
                              }
                            >
                              {xmlTimingAnimation ? "Anim: On" : "Anim: Off"}
                            </Button>
                          </div>
                          <input
                            id="xml-images-input"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                setXmlTimedImages(files);
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              document
                                .getElementById("xml-timing-file-input")
                                ?.click();
                            }}
                            className="w-full !rounded-md"
                            disabled={xmlTimedImages.length === 0}
                          >
                            {xmlTimingFile && (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Upload XML Timing File
                          </Button>
                          <input
                            id="xml-timing-file-input"
                            type="file"
                            accept=".xml"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const timings = await parseXmlForTimings(
                                    file
                                  );
                                  setXmlTimingFile(file);
                                  setParsedXmlTimings(timings);
                                  toast({
                                    title: "XML Loaded",
                                    description: `Found ${timings.length} timing entries. Last image will extend to video end.`,
                                  });
                                } catch (error) {
                                  toast({
                                    title: "XML Parse Error",
                                    description:
                                      "Failed to parse XML file. Check format.",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          />
                          {xmlTimingFile && parsedXmlTimings.length > 0 && (
                            <div className="text-xs text-green-600 dark:text-green-400 px-2 py-1 bg-green-50 dark:bg-green-950 rounded">
                              ✓ XML timing active: {parsedXmlTimings.length}{" "}
                              entries loaded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generate Section */}
              {generatedAudio && (
                <Card className="border">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleRenderVideo()}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          size="sm"
                          disabled={
                            isRendering ||
                            !scriptBackgroundMusic ||
                            (scriptImages.length === 0 &&
                              xmlTimedImages.length === 0) ||
                            affirmationTimings.length === 0
                          }
                        >
                          <Video className="w-4 h-4 mr-0.5" />
                          {isRendering ? "Rendering..." : "Render Video"}
                        </Button>

                        {isRendering && (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{Math.round(renderProgress)}%</span>
                              </div>
                              <Progress
                                value={renderProgress}
                                className="h-2"
                              />
                            </div>
                            {renderLogs.length > 0 && (
                              <div className="bg-white rounded-md p-2 max-h-48 overflow-y-auto">
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Server Logs:
                                </div>
                                <div className="space-y-0.5">
                                  {renderLogs.map((log, index) => {
                                    const isError =
                                      log.toLowerCase().includes("error") ||
                                      log.toLowerCase().includes("failed") ||
                                      log
                                        .toLowerCase()
                                        .includes("no such file");
                                    return (
                                      <div
                                        key={index}
                                        className={`text-xs font-mono ${
                                          isError
                                            ? "text-destructive"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {log}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {renderedVideoUrl && (
                          <div className="text-xs text-muted-foreground bg-white p-2 rounded">
                            <a
                              href={renderedVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Download Rendered Video
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Scene Division Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="w-1/2">
                      <Label className="text-sm mb-2 block">
                        Number of Scenes:{" "}
                        {affirmations.trim()
                          ? calculateOptimalSceneCount(
                              affirmations,
                              sceneSliderPosition
                            )
                          : sceneCountRanges[sceneSliderPosition]?.min || 50}
                      </Label>
                      <Slider
                        value={[sceneSliderPosition]}
                        onValueChange={(value) =>
                          setSceneSliderPosition(value[0])
                        }
                        min={0}
                        max={4}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadAllImages}
                        disabled={
                          !scenes.some((scene) => scene.imageUrl) ||
                          scenes.filter((scene) => scene.imageUrl).length === 0
                        }
                        className="!rounded-md"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Images
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadWithTimeline}
                        disabled={
                          affirmationTimings.length === 0 ||
                          !scenes.some((scene) => scene.imageUrl) ||
                          scenes.filter((scene) => scene.imageUrl).length === 0
                        }
                        className="!rounded-md"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Timeline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Copy generated prompts to scenes if they exist
                          if (
                            generatedPrompts.length > 0 &&
                            scenes.length > 0
                          ) {
                            const updatedScenes = scenes.map(
                              (scene, index) => ({
                                ...scene,
                                prompt:
                                  scene.prompt || generatedPrompts[index] || "",
                              })
                            );
                            setScenes(updatedScenes);
                          }
                          setShowAdvancedSettings(true);
                        }}
                        className="!rounded-md"
                      >
                        Advanced
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!affirmations.trim()) {
                          return;
                        }

                        // Calculate optimal scene count based on slider position and script
                        const optimalSceneCount = calculateOptimalSceneCount(
                          affirmations,
                          sceneSliderPosition
                        );

                        // Always recreate scenes based on optimal count (prioritizes equal lengths)
                        const sceneTexts = divideIntoScenes(
                          affirmations,
                          optimalSceneCount
                        );

                        // Try to preserve existing prompts and images by matching scene text
                        const existingScenesData = new Map<
                          string,
                          { prompt: string; imageUrl: string | null }
                        >();
                        scenes.forEach((scene) => {
                          existingScenesData.set(scene.text, {
                            prompt: scene.prompt,
                            imageUrl: scene.imageUrl,
                          });
                        });

                        // Create new scenes with preserved data where possible
                        const newScenes = sceneTexts.map((text) => {
                          const existing = existingScenesData.get(text);
                          return {
                            text,
                            prompt: existing?.prompt || "",
                            imageUrl: existing?.imageUrl || null,
                          };
                        });

                        setScenes(newScenes);

                        // Map timestamps if voice has been generated
                        if (affirmationTimings.length > 0) {
                          mapTimestampsToScenes(newScenes);
                        }

                        // Open advanced settings to show scenes
                        setShowAdvancedSettings(true);
                      }}
                      disabled={!affirmations.trim()}
                      className="flex-1 !rounded-md"
                    >
                      Scenes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGenerateScenesDialog(true)}
                      className="flex-1 !rounded-md"
                    >
                      Generate Prompts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (generatedPrompts.length === 0) {
                          toast({
                            title: "No Prompts",
                            description: "Please generate prompts first.",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (!falAiApiKey.trim()) {
                          toast({
                            title: "API Key Required",
                            description:
                              "Please enter your Fal AI API key in settings.",
                            variant: "destructive",
                          });
                          return;
                        }

                        setIsGeneratingImages(true);

                        try {
                          const totalImages = generatedPrompts.length;

                          if (totalImages === 0) {
                            toast({
                              title: "No Prompts",
                              description: "Generate prompts first!",
                              variant: "destructive",
                            });
                            setIsGeneratingImages(false);
                            return;
                          }

                          toast({
                            title: "Generating Images",
                            description: `Starting generation of ${totalImages} images...`,
                          });

                          setImageGenerationProgress({
                            current: 0,
                            total: totalImages,
                          });

                          // Process in batches of 50 concurrently (copied from ParagraphProcessor.tsx lines 1311-1340)
                          const batchSize = 50;
                          let completedImages = 0;
                          const newGeneratedImages: string[] = [];

                          for (
                            let i = 0;
                            i < generatedPrompts.length;
                            i += batchSize
                          ) {
                            const batch = generatedPrompts.slice(
                              i,
                              i + batchSize
                            );

                            // Generate all images in current batch concurrently
                            await Promise.all(
                              batch.map(async (prompt, batchIdx) => {
                                const globalIndex = i + batchIdx;

                                try {
                                  const response = await fetch(
                                    "https://fal.run/fal-ai/flux/schnell",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Key ${falAiApiKey}`,
                                      },
                                      body: JSON.stringify({
                                        prompt: prompt,
                                        image_size: "landscape_16_9",
                                        num_inference_steps: 4,
                                        num_images: 1,
                                      }),
                                    }
                                  );

                                  const data = await response.json();

                                  if (!response.ok) {
                                    throw new Error(
                                      data.error?.message ||
                                        data.detail ||
                                        "Fal AI API error"
                                    );
                                  }

                                  const imageUrl = data.images?.[0]?.url;
                                  if (!imageUrl) {
                                    throw new Error("No image URL in response");
                                  }

                                  newGeneratedImages[globalIndex] = imageUrl;

                                  setGeneratedImages((prev) => {
                                    const updated = [...prev];
                                    updated[globalIndex] = imageUrl;
                                    return updated;
                                  });

                                  // Update scene with image URL
                                  setScenes((prevScenes) => {
                                    const updated = [...prevScenes];
                                    if (updated[globalIndex]) {
                                      updated[globalIndex] = {
                                        ...updated[globalIndex],
                                        imageUrl,
                                      };
                                    }
                                    return updated;
                                  });

                                  completedImages++;
                                  setImageGenerationProgress({
                                    current: completedImages,
                                    total: totalImages,
                                  });
                                } catch (error) {
                                  console.error(
                                    `Failed to generate image ${
                                      globalIndex + 1
                                    }:`,
                                    error
                                  );
                                  completedImages++;
                                  setImageGenerationProgress({
                                    current: completedImages,
                                    total: totalImages,
                                  });
                                }
                              })
                            );

                            // Progress toast after each batch
                            toast({
                              title: "Progress",
                              description: `Generated ${completedImages} of ${totalImages} images`,
                            });
                          }

                          toast({
                            title: "Images Generated",
                            description: `Successfully generated ${completedImages} images.`,
                          });
                        } catch (error) {
                          console.error("Image generation failed:", error);
                          toast({
                            title: "Generation Failed",
                            description:
                              "Failed to generate images. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsGeneratingImages(false);
                          setImageGenerationProgress({ current: 0, total: 0 });
                        }
                      }}
                      disabled={
                        isGeneratingImages || generatedPrompts.length === 0
                      }
                      className="flex-1 !rounded-md"
                    >
                      {isGeneratingImages
                        ? `Generating ${imageGenerationProgress.current}/${imageGenerationProgress.total}...`
                        : "Generate Images"}
                    </Button>
                  </div>

                  {scenes.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Image Prompts Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Image Prompts
                        </Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-96 overflow-y-auto bg-white">
                          {generatedPrompts.length > 0 ? (
                            generatedPrompts.map((prompt, index) => (
                              <div
                                key={index}
                                className="text-xs p-2 border-b last:border-b-0"
                              >
                                {prompt}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No prompts yet
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Generated Images Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Generated Images
                        </Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-96 overflow-y-auto bg-white">
                          {generatedImages.length > 0 ? (
                            generatedImages.map((imageUrl, index) => (
                              <div
                                key={index}
                                className="aspect-video rounded-md border overflow-hidden"
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Scene ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))
                          ) : (
                            <div className="aspect-video border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center">
                              <p className="text-xs text-muted-foreground text-center">
                                No images yet
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* API Button - Bottom Left */}
          <Button
            onClick={() => setShowSampleDialog(true)}
            size="sm"
            variant="outline"
            className="fixed bottom-4 left-4 z-50 flex items-center gap-0.5 bg-white border hover:border-primary !rounded-md"
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
                {/* Prompt Generation Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Prompt Generation</h3>

                  <div className="space-y-2">
                    <Label htmlFor="prompt-model">Model</Label>
                    <Select
                      value={promptModel}
                      onValueChange={(value: "anthropic" | "xai") =>
                        setPromptModel(value)
                      }
                    >
                      <SelectTrigger id="prompt-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">
                          Anthropic Claude Sonnet 4
                        </SelectItem>
                        <SelectItem value="xai">X AI Grok 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                    <Input
                      id="anthropic-key"
                      type="password"
                      placeholder="sk-ant-..."
                      value={anthropicApiKey}
                      onChange={(e) => setAnthropicApiKey(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="xai-key">X AI API Key</Label>
                    <Input
                      id="xai-key"
                      type="password"
                      placeholder="xai-..."
                      value={xaiApiKey}
                      onChange={(e) => setXaiApiKey(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {promptModel === "anthropic" && (
                    <div className="space-y-2">
                      <Label htmlFor="anthropicModel">Anthropic Model</Label>
                      <Input
                        id="anthropicModel"
                        type="text"
                        placeholder="claude-sonnet-4-20250514"
                        value={anthropicModel}
                        onChange={(e) => setAnthropicModel(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Image Generation Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Image Generation</h3>

                  <div className="space-y-2">
                    <Label htmlFor="image-model">Model</Label>
                    <Select value="fal" disabled>
                      <SelectTrigger id="image-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fal">
                          Fal AI (Flux 1.1 Schnell)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fal-key">Fal AI API Key</Label>
                    <Input
                      id="fal-key"
                      type="password"
                      placeholder="fal_..."
                      value={falAiApiKey}
                      onChange={(e) => setFalAiApiKey(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Render Server</h3>
                  <div>
                    <Label htmlFor="renderServerUrl">Render Server URL</Label>
                    <Input
                      id="renderServerUrl"
                      type="text"
                      placeholder="http://localhost:8001"
                      value={renderServerUrl}
                      onChange={(e) => {
                        setRenderServerUrl(e.target.value);
                        localStorage.setItem(
                          "render-server-url",
                          e.target.value
                        );
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL of your FFmpeg render server (Docker container)
                    </p>
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
                  <div className="flex justify-between items-center p-2 rounded bg-white">
                    <span className="font-mono">Ctrl + I</span>
                    <span>Ivory Affirmation</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-white">
                    <span className="font-mono">Ctrl + G</span>
                    <span>Gradient Voice (with auto EQ)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-white">
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
                      variant={
                        scriptType === "affirmation" ? "default" : "outline"
                      }
                      onClick={() => setScriptType("affirmation")}
                      className={`flex-1 ${
                        scriptType === "affirmation"
                          ? "bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      Affirmation Script
                    </Button>
                    <Button
                      variant={
                        scriptType === "meditation" ? "default" : "outline"
                      }
                      onClick={() => setScriptType("meditation")}
                      className={`flex-1 ${
                        scriptType === "meditation"
                          ? "bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      Meditation Script
                    </Button>
                  </div>
                </div>
                {scriptType === "affirmation" && (
                  <div>
                    <Label>Affirmation Length</Label>
                    <div className="flex space-x-4 mt-2">
                      <Button
                        variant={
                          affirmationLength === "long" ? "default" : "outline"
                        }
                        onClick={() => setAffirmationLength("long")}
                        className={`flex-1 ${
                          affirmationLength === "long"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        Long
                      </Button>
                      <Button
                        variant={
                          affirmationLength === "short" ? "default" : "outline"
                        }
                        onClick={() => setAffirmationLength("short")}
                        className={`flex-1 ${
                          affirmationLength === "short"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        Short
                      </Button>
                    </div>
                  </div>
                )}
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
                  <Label htmlFor="scriptDate">
                    Date (optional, for context)
                  </Label>
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
                    <div className="text-xs text-muted-foreground bg-white p-2 rounded">
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
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isGeneratingScript
                    ? `Generating ${
                        scriptType === "affirmation"
                          ? "Affirmation"
                          : "Meditation"
                      } Script...`
                    : `Generate ${
                        scriptType === "affirmation"
                          ? "Affirmation"
                          : "Meditation"
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
                              .replace(/\s+/g, "_")}.jpg`
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Save Transcript
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Generate Prompts Dialog */}
          <Dialog
            open={showGenerateScenesDialog}
            onOpenChange={setShowGenerateScenesDialog}
          >
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate Prompts</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <div>
                  <Label htmlFor="scenePrompt" className="text-sm">
                    Image Generation Prompt
                  </Label>
                  <Textarea
                    id="scenePrompt"
                    placeholder="Enter style or instructions for image generation..."
                    value={scenePrompt}
                    onChange={(e) => setScenePrompt(e.target.value)}
                    className="min-h-[120px] resize-none mt-2"
                  />
                </div>

                {/* Placeholder for future settings */}
                <div className="space-y-4">
                  {/* Settings will be added here */}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowGenerateScenesDialog(false)}
                    className="!rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!affirmations.trim()) {
                        toast({
                          title: "No Script",
                          description: "Please add a script first.",
                          variant: "destructive",
                        });
                        return;
                      }

                      const apiKey =
                        promptModel === "anthropic"
                          ? anthropicApiKey
                          : xaiApiKey;
                      const apiKeyName =
                        promptModel === "anthropic" ? "Anthropic" : "X AI";

                      if (!apiKey.trim()) {
                        toast({
                          title: "API Key Required",
                          description: `Please enter your ${apiKeyName} API key in settings.`,
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsGeneratingScript(true);

                      // Clear previous prompts and close dialog to show streaming
                      setGeneratedPrompts([]);
                      setShowGenerateScenesDialog(false);

                      try {
                        // Use existing scenes or create them if they don't exist
                        let sceneTexts: string[];
                        if (scenes.length > 0) {
                          // Use existing scenes
                          sceneTexts = scenes.map((s) => s.text);
                        } else {
                          // Create scenes if they don't exist - use optimal count
                          const optimalSceneCount = calculateOptimalSceneCount(
                            affirmations,
                            sceneSliderPosition
                          );
                          sceneTexts = divideIntoScenes(
                            affirmations,
                            optimalSceneCount
                          );
                          const newScenes = sceneTexts.map((text) => ({
                            text,
                            prompt: "",
                            imageUrl: null,
                          }));
                          setScenes(newScenes);
                        }

                        const styleGuide =
                          scenePrompt.trim() ||
                          "Create vivid, detailed image prompts";

                        // Split scenes into batches of 50 for accuracy and token limits
                        const batchSize = 50;
                        const batches: string[][] = [];
                        for (let i = 0; i < sceneTexts.length; i += batchSize) {
                          batches.push(sceneTexts.slice(i, i + batchSize));
                        }

                        let allPrompts: string[] = [];

                        // Process each batch
                        for (
                          let batchIndex = 0;
                          batchIndex < batches.length;
                          batchIndex++
                        ) {
                          const batch = batches[batchIndex];
                          const startIndex = batchIndex * batchSize;

                          toast({
                            title: "Generating Batch",
                            description: `Processing batch ${
                              batchIndex + 1
                            } of ${batches.length} (scenes ${startIndex + 1}-${
                              startIndex + batch.length
                            })`,
                          });

                          // Create the prompt for AI - same structure for every batch
                          const aiPrompt = `I have a script that has been divided into ${
                            sceneTexts.length
                          } scenes total. I need you to generate image generation prompts for scenes ${
                            startIndex + 1
                          } to ${startIndex + batch.length}.

Style Guide: ${styleGuide}

Full Script for Context:
${affirmations}

---

Scene Division (Batch ${batchIndex + 1}):
${batch
  .map((text, index) => `Scene ${startIndex + index + 1}: ${text}`)
  .join("\n\n")}

---

Please generate ${
                            batch.length
                          } image generation prompts (one for each scene in this batch) that follow the style guide and capture the essence of each scene. Output ONLY the prompts, numbered from ${
                            startIndex + 1
                          } to ${
                            startIndex + batch.length
                          }, one per line, in this format:
${startIndex + 1}. [prompt for scene ${startIndex + 1}]
${startIndex + 2}. [prompt for scene ${startIndex + 2}]
...and so on.`;

                          let generatedText = "";

                          if (promptModel === "anthropic") {
                            const anthropicClient = new Anthropic({
                              apiKey: anthropicApiKey,
                              dangerouslyAllowBrowser: true,
                            });

                            const completion =
                              await anthropicClient.messages.create({
                                model: anthropicModel,
                                max_tokens: 8000,
                                messages: [{ role: "user", content: aiPrompt }],
                                stream: true,
                              });

                            // Handle Anthropic streaming
                            for await (const chunk of completion) {
                              if (
                                chunk.type === "content_block_delta" &&
                                chunk.delta.type === "text_delta"
                              ) {
                                const content = chunk.delta.text || "";
                                generatedText += content;

                                // Parse and update prompts in real-time (batch only)
                                const promptLines = generatedText
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter((line) => line.length > 0)
                                  .map((line) =>
                                    line.replace(/^\d+[\.\)\:\-]\s*/, "").trim()
                                  );

                                // Combine with previous batches and display
                                setGeneratedPrompts([
                                  ...allPrompts,
                                  ...promptLines,
                                ]);
                              }
                            }
                          } else if (promptModel === "xai") {
                            const response = await fetch(
                              "https://api.x.ai/v1/chat/completions",
                              {
                                method: "POST",
                                mode: "cors",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${xaiApiKey}`,
                                },
                                body: JSON.stringify({
                                  model: "grok-4-0709",
                                  messages: [
                                    { role: "user", content: aiPrompt },
                                  ],
                                  max_tokens: 8000,
                                  stream: true,
                                }),
                              }
                            );

                            if (!response.ok) {
                              throw new Error(
                                `Xai API error: ${response.statusText}`
                              );
                            }

                            const reader = response.body?.getReader();
                            const decoder = new TextDecoder();

                            if (!reader) {
                              throw new Error("No response body");
                            }

                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;

                              const chunk = decoder.decode(value, {
                                stream: true,
                              });
                              const lines = chunk.split("\n");

                              for (const line of lines) {
                                if (
                                  line.startsWith("data: ") &&
                                  line !== "data: [DONE]"
                                ) {
                                  try {
                                    const data = JSON.parse(line.slice(6));
                                    if (data.choices?.[0]?.delta?.content) {
                                      const content =
                                        data.choices[0].delta.content;
                                      generatedText += content;

                                      // Parse and update prompts in real-time (batch only)
                                      const promptLines = generatedText
                                        .split("\n")
                                        .map((line) => line.trim())
                                        .filter((line) => line.length > 0)
                                        .map((line) =>
                                          line
                                            .replace(/^\d+[\.\)\:\-]\s*/, "")
                                            .trim()
                                        );

                                      // Combine with previous batches and display
                                      setGeneratedPrompts([
                                        ...allPrompts,
                                        ...promptLines,
                                      ]);
                                    }
                                  } catch (e) {
                                    // Skip invalid JSON
                                  }
                                }
                              }
                            }
                          }

                          // Parse the final batch prompts
                          const batchPromptLines = generatedText
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0)
                            .map((line) =>
                              line.replace(/^\d+[\.\)\:\-]\s*/, "").trim()
                            );

                          // Add batch prompts to all prompts
                          allPrompts = [...allPrompts, ...batchPromptLines];
                          setGeneratedPrompts(allPrompts);
                        }

                        // Update scene objects with final generated prompts
                        const updatedScenes = sceneTexts.map((text, index) => ({
                          text,
                          prompt: allPrompts[index] || "",
                          imageUrl: null,
                        }));

                        setScenes(updatedScenes);

                        toast({
                          title: "All Prompts Generated",
                          description: `Generated ${allPrompts.length} image prompts using ${apiKeyName} in ${batches.length} batch(es).`,
                        });
                      } catch (error) {
                        console.error("Prompt generation failed:", error);
                        toast({
                          title: "Generation Failed",
                          description:
                            "Failed to generate prompts. Please check your API key and try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsGeneratingScript(false);
                      }
                    }}
                    disabled={isGeneratingScript}
                    className="!rounded-md"
                  >
                    {isGeneratingScript ? "Generating..." : "Generate Prompts"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Advanced Settings Dialog */}
          <Dialog
            open={showAdvancedSettings}
            onOpenChange={setShowAdvancedSettings}
          >
            <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Advanced Scene Settings</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-6">
                  {scenes.map((scene, index) => (
                    <Card key={index} className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          Scene {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Scene Text */}
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Scene Text
                              {scene.hasTimestamp !== undefined && (
                                <span
                                  className={`ml-2 text-xs ${
                                    scene.hasTimestamp
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {scene.hasTimestamp
                                    ? "✓ Synced"
                                    : "✗ No Match"}
                                </span>
                              )}
                            </Label>
                            <Textarea
                              value={scene.text}
                              onChange={(e) => {
                                const newScenes = [...scenes];
                                newScenes[index].text = e.target.value;
                                setScenes(newScenes);
                              }}
                              className={`min-h-[100px] text-xs ${
                                scene.hasTimestamp === true
                                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                  : scene.hasTimestamp === false
                                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                                  : ""
                              }`}
                            />
                            {scene.startTime !== undefined &&
                              scene.endTime !== undefined && (
                                <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                                  ⏱️ {scene.startTime.toFixed(2)}s -{" "}
                                  {scene.endTime.toFixed(2)}s
                                </p>
                              )}
                          </div>

                          {/* Image Prompt */}
                          <div className="space-y-2">
                            <Label className="text-xs">Image Prompt</Label>
                            <Textarea
                              value={scene.prompt}
                              onChange={(e) => {
                                const newScenes = [...scenes];
                                newScenes[index].prompt = e.target.value;
                                setScenes(newScenes);
                              }}
                              className="min-h-[100px] text-xs"
                              placeholder="Enter image generation prompt..."
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full !rounded-md"
                              onClick={() => generatePromptForScene(index)}
                              disabled={generatingPromptForScene === index}
                            >
                              {generatingPromptForScene === index ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                "Generate Prompt"
                              )}
                            </Button>
                          </div>

                          {/* Image Display */}
                          <div className="space-y-2">
                            <Label className="text-xs">Generated Image</Label>
                            <div className="aspect-video border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center overflow-hidden bg-white">
                              {scene.imageUrl ? (
                                <img
                                  src={scene.imageUrl}
                                  alt={`Scene ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  No image
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full !rounded-md"
                              onClick={() => generateImageForScene(index)}
                              disabled={
                                !scene.prompt.trim() ||
                                generatingImageForScene === index
                              }
                            >
                              {generatingImageForScene === index ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                "Generate Image"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center gap-2 p-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={downloadAllImages}
                    disabled={
                      !scenes.some((scene) => scene.imageUrl) ||
                      scenes.filter((scene) => scene.imageUrl).length === 0
                    }
                    className="!rounded-md"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Images
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadWithTimeline}
                    disabled={
                      affirmationTimings.length === 0 ||
                      !scenes.some(
                        (scene) =>
                          scene.imageUrl &&
                          scene.startTime !== undefined &&
                          scene.endTime !== undefined
                      )
                    }
                    className="!rounded-md"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download with Timeline
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedSettings(false)}
                  className="!rounded-md"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AffirmationGenerator;
