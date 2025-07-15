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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OpenAI from "openai";

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
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const { toast } = useToast();

  const generateScript = async (title: string, date: string) => {
    if (!a4fApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your A4F API key to generate scripts.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScript(true);

    try {
      const a4fClient = new OpenAI({
        apiKey: a4fApiKey,
        baseURL: "https://api.a4f.co/v1",
        dangerouslyAllowBrowser: true,
      });

      const prompt = `I want you to write 150 Affirmations that covers all aspects of life, titled "${title}". This script should be designed for a YouTube audience interested in listening to Affirmations.
Use clear, single-line affirmations like in your reference. Some affirmations should mention the "${date}". It certainly need to be included in the very first affirmation. Don't provide unwanted narrator, music, and such words in the actual script? I want something that I can just pass on to my voiceover artist: IMPORTANT!`;

      const completion = await a4fClient.chat.completions.create({
        model: "provider-3/grok-4-0709",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const generatedScript = completion.choices[0].message.content;

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
          description: `Successfully generated affirmations for "${title}"`,
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
    if (!a4fApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your A4F API key first.",
        variant: "destructive",
      });
      return;
    }
    setShowScriptDialog(true);
  };

  const handleScriptSubmit = () => {
    if (!scriptTitle.trim() || !scriptDate.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both title and date.",
        variant: "destructive",
      });
      return;
    }
    generateScript(scriptTitle, scriptDate);
  };

  const generateDescription = async () => {
    if (!a4fApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your A4F API key to generate descriptions.",
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

    try {
      const a4fClient = new OpenAI({
        apiKey: a4fApiKey,
        baseURL: "https://api.a4f.co/v1",
        dangerouslyAllowBrowser: true,
      });

      // Create content from affirmations for the prompt
      const srtContent = affirmationTimings
        .map((timing) => timing.text)
        .join("\n");

      const prompt = `Write me a short SEO Optimized Description (3-4 lines only) for this Youtube video based on the srt file. The title is "${savedScriptTitle}". Start with the exact title. Follow that with 3 SEO optimized keywords hashtags for the video and follow that with the same keywords without hashtag and separated by comma.

SRT Content:
${srtContent}`;

      const completion = await a4fClient.chat.completions.create({
        model: "provider-3/grok-4-0709",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const generatedDescription = completion.choices[0].message.content;

      if (generatedDescription) {
        // Download as .txt file
        const blob = new Blob([generatedDescription], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${savedScriptTitle
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_description.txt`;
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
    const audioContext = new AudioContext();
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

    // Create new audio buffer with reduced pauses
    const outputBuffer = audioContext.createBuffer(
      1,
      outputData.length,
      sampleRate
    );
    const outputChannel = outputBuffer.getChannelData(0);
    for (let i = 0; i < outputData.length; i++) {
      outputChannel[i] = outputData[i];
    }

    return outputBuffer;
  };

  const combineAudioClips = async (
    audioClips: Blob[],
    affirmationLines: string[]
  ): Promise<Blob> => {
    const audioContext = new AudioContext();
    const audioBuffers: AudioBuffer[] = [];
    const timings: Array<{ text: string; start: number; end: number }> = [];

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
    return audioBufferToWav(outputBuffer);
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

      toast({
        title: "Generation Complete!",
        description: "Your affirmation audio is ready for download.",
      });
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
    if (generatedAudio) {
      const a = document.createElement("a");
      a.href = generatedAudio;
      a.download = "affirmations.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadSrt = () => {
    if (affirmationTimings.length > 0) {
      const srtContent = generateSrtContent();
      const blob = new Blob([srtContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "affirmations.srt";
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

        if (event.shiftKey && event.key.toLowerCase() === "s") {
          newVoice =
            "am_eric(1)+am_fenrir(1)+am_liam(1)+am_michael(1)+af_jadzia(1)+af_nicole(1)+am_v0gurney(4)";
          shortcutName = "Spiritual Sattva";
          newSpeed = 0.9;
          newSilenceGap = 1;
          event.preventDefault();
        } else if (event.key.toLowerCase() === "i") {
          newVoice = "af_jessica(1)+af_v0nicole(8)+af_v0(1)";
          shortcutName = "Ivory Affirmation";
          newSpeed = 0.9;
          newSilenceGap = 5;
          event.preventDefault();
        } else if (event.shiftKey && event.key.toLowerCase() === "a") {
          newVoice = "af_nicole(5)+am_echo(1)+af_river(4)";
          shortcutName = "Astral Embrace";
          newSpeed = 0.8;
          newSilenceGap = 1;
          event.preventDefault();
        } else if (event.key.toLowerCase() === "e") {
          newVoice = "af_nicole(3)+am_echo(4)+am_eric(2)+am_v0gurney(1)";
          shortcutName = "Nightly Science";
          newSpeed = 0.83;
          newSilenceGap = 1;
          event.preventDefault();
        } else if (event.key.toLowerCase() === "g") {
          newVoice = "af_nicole(4)+am_liam(5)+am_v0gurney(1)";
          shortcutName = "Starlit Science";
          newSpeed = 0.83;
          newSilenceGap = 1;
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
          toast({
            title: "Voice Changed",
            description: `Switched to ${shortcutName}`,
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toast]);

  // Save API key to localStorage whenever it changes
  useEffect(() => {
    if (a4fApiKey) {
      localStorage.setItem("a4f-api-key", a4fApiKey);
    } else {
      localStorage.removeItem("a4f-api-key");
    }
  }, [a4fApiKey]);

  // Initialize audio element when audio is generated
  useEffect(() => {
    if (generatedAudio) {
      const audio = new Audio(generatedAudio);
      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });
      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audio.volume = volume;
      setAudioElement(audio);

      return () => {
        audio.pause();
        audio.removeEventListener("loadedmetadata", () => {});
        audio.removeEventListener("timeupdate", () => {});
        audio.removeEventListener("ended", () => {});
      };
    }
  }, [generatedAudio]);

  // Update volume when volume state changes
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume;
    }
  }, [volume, audioElement]);

  const togglePlayback = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
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

  return (
    <div className="min-h-screen bg-gradient-bg p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Affirmation Audio Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your affirmations into beautiful audio with Kokoro TTS.
            Create personalized meditation tracks with customizable silence
            gaps.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  Your Affirmations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="a4fApiKey"
                    className="flex items-center gap-2"
                  >
                    <Key className="w-4 h-4 text-primary" />
                    A4F API Key
                  </Label>
                  <Input
                    id="a4fApiKey"
                    type="password"
                    placeholder="Enter your A4F API key..."
                    value={a4fApiKey}
                    onChange={(e) => setA4fApiKey(e.target.value)}
                  />
                </div>
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
                  className="w-full bg-gradient-primary text-white hover:shadow-glow"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  {isGeneratingScript ? "Generating..." : "Generate Script"}
                </Button>

                {generatedAudio && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="text-sm font-medium mb-2">
                      Generated Audio
                    </h4>
                    <div className="space-y-3">
                      {/* Play/Pause and Time Display */}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={togglePlayback}
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                        >
                          {isPlaying ? (
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
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Section */}
          <div className="space-y-6">
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
                          <Download className="w-4 h-4 mr-2" />
                          Audio
                        </Button>

                        <Button
                          onClick={handleDownloadSrt}
                          variant="outline"
                          size="sm"
                          disabled={affirmationTimings.length === 0}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          .SRT
                        </Button>

                        <Button
                          onClick={generateDescription}
                          variant="outline"
                          size="sm"
                          className="col-span-2"
                          disabled={
                            isGeneratingDescription ||
                            !savedScriptTitle ||
                            affirmationTimings.length === 0
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {isGeneratingDescription
                            ? "Generating..."
                            : "Description"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
                <span className="font-mono">Ctrl + Shift + A</span>
                <span>Astral Embrace</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">Ctrl + E</span>
                <span>Nightly Science</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">Ctrl + G</span>
                <span>Starlit Science</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">Ctrl + Shift + S</span>
                <span>Spiritual Sattva</span>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Generate Script
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="scriptTitle">Script Title</Label>
              <Input
                id="scriptTitle"
                type="text"
                placeholder="e.g., 'Daily Affirmations for Success'"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scriptDate">Date (for context)</Label>
              <Input
                id="scriptDate"
                type="text"
                placeholder="e.g., 'July 2025'"
                value={scriptDate}
                onChange={(e) => setScriptDate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleScriptSubmit}
              disabled={isGeneratingScript}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-500"
            >
              {isGeneratingScript ? "Generating Script..." : "Generate Script"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffirmationGenerator;
