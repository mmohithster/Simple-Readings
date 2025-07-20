import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RotateCcw, Download } from "lucide-react";

interface EQBand {
  frequency: number;
  gain: number;
  label: string;
}

interface EQPreset {
  name: string;
  description: string;
  bands: number[]; // Array of gain values for each band
}

interface AudioEqualizerProps {
  audioUrl: string;
  onProcessedAudio: (
    processedAudioUrl: string,
    eqSettings: {
      bands: Array<{ frequency: number; gain: number; label: string }>;
      selectedPreset: string;
      pitchShift: number;
      usePronounced: boolean;
      reverbEnabled: boolean;
      reverbAmount: number;
    }
  ) => void;
  savedSettings?: {
    bands: Array<{ frequency: number; gain: number; label: string }>;
    selectedPreset: string;
    pitchShift: number;
    usePronounced: boolean;
    reverbEnabled: boolean;
    reverbAmount: number;
  } | null;
}

export const AudioEqualizer = ({
  audioUrl,
  onProcessedAudio,
  savedSettings,
}: AudioEqualizerProps) => {
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const convolver = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pitchShift, setPitchShift] = useState(savedSettings?.pitchShift ?? 0); // -12 to +12 semitones
  const [usePronounced, setUsePronounced] = useState(
    savedSettings?.usePronounced ?? true
  ); // Toggle between mild and pronounced presets
  const [selectedPreset, setSelectedPreset] = useState(
    savedSettings?.selectedPreset ?? "Flat"
  ); // Track selected preset
  const [reverbEnabled, setReverbEnabled] = useState(
    savedSettings?.reverbEnabled ?? false
  ); // Reverb toggle
  const [reverbAmount, setReverbAmount] = useState(
    savedSettings?.reverbAmount ?? 30
  ); // Reverb amount (0-100)

  // EQ bands configuration - Industry standard frequencies for voice processing
  const eqBands: EQBand[] = [
    { frequency: 80, gain: 0, label: "Bass" },
    { frequency: 200, gain: 0, label: "Low Mid" },
    { frequency: 500, gain: 0, label: "Mid" },
    { frequency: 1000, gain: 0, label: "Upper Mid" },
    { frequency: 2000, gain: 0, label: "Presence" },
    { frequency: 4000, gain: 0, label: "Clarity" },
    { frequency: 8000, gain: 0, label: "Brilliance" },
    { frequency: 12000, gain: 0, label: "Air" },
  ];

  const [bands, setBands] = useState<EQBand[]>(savedSettings?.bands || eqBands);

  // EQ presets - Mild values for subtle voice processing
  const mildPresets: EQPreset[] = [
    {
      name: "Flat",
      description: "No EQ applied",
      bands: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: "Bass Boost",
      description: "Enhanced low frequencies",
      bands: [3, 2, 1, 0, -1, -1, -1, 0],
    },
    {
      name: "Voice Clarity",
      description: "Enhanced speech intelligibility",
      bands: [-2, -1, 0, 1, 3, 2, 1, 0],
    },
    {
      name: "Podcast Voice",
      description: "Professional podcast sound",
      bands: [-3, -2, 0, 2, 4, 3, 1, 0],
    },
    {
      name: "Radio Voice",
      description: "Classic radio processing",
      bands: [-3, -2, 1, 2, 4, 3, 2, 1],
    },
    {
      name: "Warm Voice",
      description: "Rich and warm tone",
      bands: [2, 3, 1, 0, -1, -1, -2, -1],
    },
    {
      name: "Bright Voice",
      description: "Crisp and articulate",
      bands: [-1, 0, 1, 2, 3, 4, 3, 2],
    },
    {
      name: "Deep Voice",
      description: "Fuller, deeper sound",
      bands: [4, 3, 2, 1, -1, -2, -2, -1],
    },
    {
      name: "Presence Boost",
      description: "Enhanced vocal presence",
      bands: [0, 0, 1, 2, 4, 3, 1, 0],
    },
    {
      name: "Authoritative",
      description: "Strong and commanding",
      bands: [3, 2, 1, 1, 3, 2, 1, 0],
    },
  ];

  // EQ presets - More pronounced values for dramatic voice processing
  const pronouncedPresets: EQPreset[] = [
    {
      name: "Flat",
      description: "No EQ applied",
      bands: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: "Bass Boost",
      description: "Enhanced low frequencies",
      bands: [7, 5, 3, 1, -1, -2, -2, -1],
    },
    {
      name: "Voice Clarity",
      description: "Enhanced speech intelligibility",
      bands: [-4, -2, 0, 2, 6, 4, 2, 0],
    },
    {
      name: "Podcast Voice",
      description: "Professional podcast sound",
      bands: [-5, -3, 0, 3, 7, 5, 2, 0],
    },
    {
      name: "Radio Voice",
      description: "Classic radio processing",
      bands: [-6, -3, 2, 4, 8, 6, 3, 1],
    },
    {
      name: "Warm Voice",
      description: "Rich and warm tone",
      bands: [5, 6, 2, 0, -2, -3, -4, -2],
    },
    {
      name: "Bright Voice",
      description: "Crisp and articulate",
      bands: [-3, -1, 1, 3, 5, 7, 6, 4],
    },
    {
      name: "Deep Voice",
      description: "Fuller, deeper sound",
      bands: [8, 6, 3, 1, -2, -4, -4, -2],
    },
    {
      name: "Presence Boost",
      description: "Enhanced vocal presence",
      bands: [0, 0, 2, 4, 8, 6, 2, 0],
    },
    {
      name: "Authoritative",
      description: "Strong and commanding",
      bands: [6, 4, 1, 2, 7, 5, 2, 0],
    },
  ];

  // Get current presets based on toggle state
  const eqPresets = usePronounced ? pronouncedPresets : mildPresets;

  // Generate impulse response for reverb
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
        const sample = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
        // Maximum low-pass to eliminate hiss completely
        channelData[i] =
          i > 0 ? sample * 0.03 + channelData[i - 1] * 0.97 : sample;
      }
    }
    return impulse;
  };

  // Initialize Web Audio API
  useEffect(() => {
    // Early return if no valid audioUrl
    if (!audioUrl || audioUrl.trim() === "") {
      return;
    }

    const initializeAudio = async () => {
      try {
        audioContextRef.current = new AudioContext();

        // Load audio from URL
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to load audio: ${response.status} ${response.statusText}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          throw new Error("Audio file is empty");
        }

        const audioBuffer = await audioContextRef.current.decodeAudioData(
          arrayBuffer
        );
        audioBufferRef.current = audioBuffer;

        // Create filter nodes
        filtersRef.current = bands.map((band, index) => {
          const filter = audioContextRef.current!.createBiquadFilter();
          filter.type =
            index === 0
              ? "lowshelf"
              : index === bands.length - 1
              ? "highshelf"
              : "peaking";
          filter.frequency.setValueAtTime(
            band.frequency,
            audioContextRef.current!.currentTime
          );
          filter.Q.setValueAtTime(1, audioContextRef.current!.currentTime);
          filter.gain.setValueAtTime(
            band.gain,
            audioContextRef.current!.currentTime
          );
          return filter;
        });

        // Create reverb nodes
        convolver.current = audioContextRef.current.createConvolver();
        const impulseResponse = createImpulseResponse(
          audioContextRef.current,
          2.0, // 2 seconds duration
          2.0 // decay rate
        );
        convolver.current.buffer = impulseResponse;

        // Create gain nodes for reverb mixing
        reverbGainRef.current = audioContextRef.current.createGain();
        dryGainRef.current = audioContextRef.current.createGain();
        gainNodeRef.current = audioContextRef.current.createGain();

        // Set initial gains
        gainNodeRef.current.gain.setValueAtTime(
          0.8,
          audioContextRef.current!.currentTime
        );
        dryGainRef.current.gain.setValueAtTime(
          1.0,
          audioContextRef.current!.currentTime
        );
        reverbGainRef.current.gain.setValueAtTime(
          reverbEnabled ? reverbAmount / 100 : 0,
          audioContextRef.current!.currentTime
        );

        // Connect filters in series
        filtersRef.current.forEach((filter, index) => {
          if (index === 0) {
            // First filter connects to gain node
          } else {
            filtersRef.current[index - 1].connect(filter);
          }
        });

        // Connect audio chain: EQ -> dry/wet split -> reverb mixing -> output
        if (filtersRef.current.length > 0) {
          const lastFilter = filtersRef.current[filtersRef.current.length - 1];

          // Dry signal path
          lastFilter.connect(dryGainRef.current);
          dryGainRef.current.connect(gainNodeRef.current);

          // Wet signal path (reverb)
          lastFilter.connect(convolver.current);
          convolver.current.connect(reverbGainRef.current);
          reverbGainRef.current.connect(gainNodeRef.current);

          // Final output
          gainNodeRef.current.connect(audioContextRef.current.destination);
        }
      } catch (error) {
        console.error("Error initializing audio:", error);

        let errorMessage = "Failed to initialize audio processing.";
        if (error instanceof Error) {
          if (error.message.includes("blob is no longer available")) {
            errorMessage =
              "Audio is no longer available. Please regenerate the audio and try again.";
          } else if (error.message.includes("Invalid audio URL")) {
            errorMessage =
              "No audio file provided. Please generate audio first.";
          } else if (error.message.includes("Failed to load audio")) {
            errorMessage =
              "Could not load the audio file. Please try regenerating it.";
          } else if (error.message.includes("Audio file is empty")) {
            errorMessage =
              "The audio file appears to be corrupted. Please regenerate it.";
          } else {
            errorMessage = error.message;
          }
        }

        toast({
          title: "Audio Loading Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    initializeAudio();

    return () => {
      // Stop any playing audio
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }

      // Disconnect and clean up nodes
      if (filtersRef.current.length > 0) {
        filtersRef.current.forEach((filter) => filter.disconnect());
      }
      if (gainNodeRef.current) gainNodeRef.current.disconnect();
      if (convolver.current) convolver.current.disconnect();
      if (reverbGainRef.current) reverbGainRef.current.disconnect();
      if (dryGainRef.current) dryGainRef.current.disconnect();

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl, toast]);

  // Update filter gains when bands change
  useEffect(() => {
    if (filtersRef.current.length > 0) {
      filtersRef.current.forEach((filter, index) => {
        if (bands[index] && audioContextRef.current) {
          filter.gain.setValueAtTime(
            bands[index].gain,
            audioContextRef.current.currentTime
          );
        }
      });
    }
  }, [bands]);

  // Update reverb gain when reverb settings change
  useEffect(() => {
    if (reverbGainRef.current && audioContextRef.current) {
      const reverbLevel = reverbEnabled ? reverbAmount / 100 : 0;
      reverbGainRef.current.gain.setValueAtTime(
        reverbLevel,
        audioContextRef.current.currentTime
      );
    }
  }, [reverbEnabled, reverbAmount]);

  const handleBandChange = (index: number, value: number[]) => {
    const newBands = [...bands];
    newBands[index] = { ...newBands[index], gain: value[0] };
    setBands(newBands);
  };

  const applyPreset = (preset: EQPreset) => {
    const newBands = bands.map((band, index) => ({
      ...band,
      gain: preset.bands[index] || 0,
    }));
    setBands(newBands);
    setSelectedPreset(preset.name);

    toast({
      title: `${preset.name} Applied`,
      description: `${preset.description} (${
        usePronounced ? "Pronounced" : "Mild"
      } values)`,
      duration: 2000,
    });
  };

  const resetEQ = () => {
    const newBands = bands.map((band) => ({ ...band, gain: 0 }));
    setBands(newBands);
    setSelectedPreset("Flat");

    toast({
      title: "EQ Reset",
      description: "All bands reset to 0dB",
      duration: 2000,
    });
  };

  const resetPitch = () => {
    setPitchShift(0);
    toast({
      title: "Pitch Reset",
      description: "Pitch reset to 0 semitones",
      duration: 2000,
    });
  };

  const resetReverb = () => {
    setReverbEnabled(false);
    setReverbAmount(30);
    toast({
      title: "Reverb Reset",
      description: "Reverb disabled and amount reset to 30%",
      duration: 2000,
    });
  };

  const resetAll = () => {
    resetEQ();
    resetPitch();
    resetReverb();
    toast({
      title: "All Reset",
      description: "EQ, pitch, and reverb reset to defaults",
      duration: 2000,
    });
  };

  const togglePlayback = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    if (isPlaying) {
      // Stop playback
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playback
      sourceRef.current = audioContextRef.current.createBufferSource();
      sourceRef.current.buffer = audioBufferRef.current;

      // Apply pitch shift using playback rate
      const pitchRatio = Math.pow(2, pitchShift / 12);
      sourceRef.current.playbackRate.setValueAtTime(
        pitchRatio,
        audioContextRef.current.currentTime
      );

      // Connect source to first filter
      if (filtersRef.current.length > 0) {
        sourceRef.current.connect(filtersRef.current[0]);
      } else {
        // If no filters, connect directly to dry/wet split
        sourceRef.current.connect(dryGainRef.current!);
        sourceRef.current.connect(convolver.current!);
      }

      sourceRef.current.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };

      sourceRef.current.start();
      setIsPlaying(true);
    }
  };

  const processAndDownload = async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    setIsProcessing(true);

    try {
      // Calculate new buffer length based on pitch shift
      const pitchRatio = Math.pow(2, pitchShift / 12);
      const newLength = Math.floor(audioBufferRef.current.length / pitchRatio);

      // Create offline audio context for processing
      const offlineContext = new OfflineAudioContext(
        audioBufferRef.current.numberOfChannels,
        newLength,
        audioBufferRef.current.sampleRate
      );

      // Create source
      const offlineSource = offlineContext.createBufferSource();
      offlineSource.buffer = audioBufferRef.current;

      // Apply pitch shift using playback rate
      offlineSource.playbackRate.setValueAtTime(
        pitchRatio,
        offlineContext.currentTime
      );

      // Create filters for offline processing
      const offlineFilters = bands.map((band, index) => {
        const filter = offlineContext.createBiquadFilter();
        filter.type =
          index === 0
            ? "lowshelf"
            : index === bands.length - 1
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
      const offlineImpulseResponse = createImpulseResponse(
        offlineContext,
        2.0, // 2 seconds duration
        2.0 // decay rate
      );
      offlineConvolver.buffer = offlineImpulseResponse;

      // Create gain nodes for offline processing
      const offlineReverbGain = offlineContext.createGain();
      const offlineDryGain = offlineContext.createGain();
      const offlineGain = offlineContext.createGain();

      // Set gains
      offlineGain.gain.setValueAtTime(0.8, offlineContext.currentTime);
      offlineDryGain.gain.setValueAtTime(1.0, offlineContext.currentTime);
      const reverbLevel = reverbEnabled ? reverbAmount / 100 : 0;
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
          // Last filter connects to both dry and wet paths
          filter.connect(offlineDryGain);
          filter.connect(offlineConvolver);
        }
      });

      // Connect reverb path
      offlineConvolver.connect(offlineReverbGain);

      // Mix dry and wet signals
      offlineDryGain.connect(offlineGain);
      offlineReverbGain.connect(offlineGain);

      // Connect to destination
      offlineGain.connect(offlineContext.destination);

      // Start processing
      offlineSource.start();
      const processedBuffer = await offlineContext.startRendering();

      // Convert to WAV blob
      const wavBlob = audioBufferToWav(processedBuffer);
      const processedUrl = URL.createObjectURL(wavBlob);

      // Callback with processed audio and current settings
      onProcessedAudio(processedUrl, {
        bands,
        selectedPreset,
        pitchShift,
        usePronounced,
        reverbEnabled,
        reverbAmount,
      });

      toast({
        title: "Audio Processing Complete",
        description: `Applied EQ and pitch shift (${
          pitchShift > 0 ? "+" : ""
        }${pitchShift} semitones) to audio.`,
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Processing Error",
        description: "Failed to apply EQ to audio.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert AudioBuffer to WAV Blob
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

    // WAV header
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

    // Convert float samples to 16-bit PCM
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Pitch Control */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Pitch Control
            </Label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground w-8">-12</span>
                  <Slider
                    value={[pitchShift]}
                    onValueChange={(value) => setPitchShift(value[0])}
                    min={-12}
                    max={12}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">+12</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono w-16 text-center">
                  {pitchShift > 0 ? "+" : ""}
                  {pitchShift} st
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPitchShift(0)}
                  className="px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reverb Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Reverb</Label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Off</span>
                <Switch
                  checked={reverbEnabled}
                  onCheckedChange={setReverbEnabled}
                />
                <span className="text-xs text-muted-foreground">On</span>
              </div>
            </div>
            {reverbEnabled && (
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground w-8">
                        0%
                      </span>
                      <Slider
                        value={[reverbAmount]}
                        onValueChange={(value) => setReverbAmount(value[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12">
                        100%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono w-12 text-center">
                      {reverbAmount}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReverbAmount(30)}
                      className="px-2"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* EQ Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">EQ Presets</Label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Mild</span>
                <Switch
                  checked={usePronounced}
                  onCheckedChange={setUsePronounced}
                />
                <span className="text-xs text-muted-foreground">
                  Pronounced
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {eqPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant={
                    selectedPreset === preset.name ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="h-auto p-2 text-center"
                >
                  <div className="font-medium text-xs">{preset.name}</div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* EQ Bands */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">EQ Bands</Label>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={resetEQ}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  EQ
                </Button>
                <Button variant="ghost" size="sm" onClick={resetAll}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {bands.map((band, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs px-1 py-0.5">
                      {band.label}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {band.frequency >= 1000
                        ? `${band.frequency / 1000}kHz`
                        : `${band.frequency}Hz`}
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="text-xs font-mono w-12 text-center">
                      {band.gain > 0 ? "+" : ""}
                      {band.gain.toFixed(1)}dB
                    </div>
                    <div className="h-20 flex items-center justify-center relative">
                      {/* Background track line */}
                      <div className="absolute w-0.5 h-16 bg-gray-300 rounded-full"></div>
                      {/* Center line indicator */}
                      <div
                        className="absolute w-2 h-0.5 bg-gray-400 rounded-full"
                        style={{ top: "50%", transform: "translateY(-50%)" }}
                      ></div>
                      <Slider
                        value={[band.gain]}
                        onValueChange={(value) =>
                          handleBandChange(index, value)
                        }
                        min={-9}
                        max={9}
                        step={0.5}
                        orientation="vertical"
                        className="h-16 flex items-center justify-center"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                disabled={!audioBufferRef.current}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isPlaying ? "Pause" : "Preview"}
              </Button>
            </div>

            <Button
              onClick={processAndDownload}
              disabled={isProcessing || !audioBufferRef.current}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-1" />
              {isProcessing ? "Processing..." : "Apply Effects"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
