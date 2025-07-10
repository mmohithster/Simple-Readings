import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface VoiceSettings {
  model: string;
  voice: string;
  speed: number;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface AffirmationTiming {
  text: string;
  start: number;
  end: number;
}

export interface AffirmationWordTiming {
  text: string;
  wordTimings: WordTiming[];
}

export const useAudioProcessor = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [affirmationTimings, setAffirmationTimings] = useState<AffirmationTiming[]>([]);
  const [wordTimings, setWordTimings] = useState<AffirmationWordTiming[]>([]);
  const { toast } = useToast();

  const generateAudioClips = async (affirmationLines: string[], voiceSettings: VoiceSettings) => {
    const audioClips: Blob[] = [];
    const wordTimings: AffirmationWordTiming[] = [];
    
    for (let i = 0; i < affirmationLines.length; i++) {
      const affirmation = affirmationLines[i].trim();
      if (!affirmation) continue;
      
      try {
        setProgress(((i + 1) / affirmationLines.length) * 70);
        
        const response = await fetch('http://localhost:8880/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: affirmation,
            ...voiceSettings,
            return_word_timestamps: true
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate audio for: "${affirmation}"`);
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          
          if (result.audio && result.word_timestamps) {
            const audioData = atob(result.audio);
            const audioArray = new Uint8Array(audioData.length);
            for (let j = 0; j < audioData.length; j++) {
              audioArray[j] = audioData.charCodeAt(j);
            }
            const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
            audioClips.push(audioBlob);
            
            wordTimings.push({
              text: affirmation,
              wordTimings: result.word_timestamps
            });
          } else {
            throw new Error('Invalid response format');
          }
        } else {
          const audioBlob = await response.blob();
          audioClips.push(audioBlob);
          
          wordTimings.push({
            text: affirmation,
            wordTimings: []
          });
        }
        
      } catch (error) {
        console.error('Audio generation error:', error);
        toast({
          title: "Generation Error", 
          description: `Failed to generate audio for affirmation ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        throw error;
      }
    }
    
    return { audioClips, wordTimings };
  };

  const removeInternalPauses = (audioBuffer: AudioBuffer, maxPauseLength: number = 0.4): AudioBuffer => {
    const audioContext = new AudioContext();
    const inputData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const silenceThreshold = 0.01;
    const maxPauseSamples = maxPauseLength * sampleRate;
    
    const outputData: number[] = [];
    let currentSilenceLength = 0;
    
    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      const isSilent = Math.abs(sample) < silenceThreshold;
      
      if (isSilent) {
        currentSilenceLength++;
        if (currentSilenceLength <= maxPauseSamples) {
          outputData.push(sample);
        }
      } else {
        currentSilenceLength = 0;
        outputData.push(sample);
      }
    }
    
    const outputBuffer = audioContext.createBuffer(1, outputData.length, sampleRate);
    const outputChannel = outputBuffer.getChannelData(0);
    for (let i = 0; i < outputData.length; i++) {
      outputChannel[i] = outputData[i];
    }
    
    return outputBuffer;
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = buffer.getChannelData(0);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const combineAudioClips = async (audioClips: Blob[], affirmationLines: string[], silenceGap: number): Promise<Blob> => {
    const audioContext = new AudioContext();
    const audioBuffers: AudioBuffer[] = [];
    const timings: AffirmationTiming[] = [];
    
    for (const clip of audioClips) {
      const arrayBuffer = await clip.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const processedBuffer = removeInternalPauses(audioBuffer);
      audioBuffers.push(processedBuffer);
    }
    
    const totalDuration = audioBuffers.reduce((sum, buffer) => sum + buffer.duration, 0) + 
                         (silenceGap * (audioBuffers.length - 1));
    
    const sampleRate = audioBuffers[0].sampleRate;
    const outputBuffer = audioContext.createBuffer(1, totalDuration * sampleRate, sampleRate);
    const outputData = outputBuffer.getChannelData(0);
    
    let currentTime = 0;
    let currentOffset = 0;
    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i];
      const inputData = buffer.getChannelData(0);
      const startTime = currentTime;
      const endTime = currentTime + buffer.duration;
      
      timings.push({
        text: affirmationLines[i].trim(),
        start: startTime,
        end: endTime
      });
      
      for (let j = 0; j < inputData.length; j++) {
        outputData[currentOffset + j] = inputData[j];
      }
      
      currentOffset += inputData.length;
      currentTime = endTime;
      
      if (i < audioBuffers.length - 1) {
        const silenceSamples = silenceGap * sampleRate;
        currentOffset += silenceSamples;
        currentTime += silenceGap;
      }
    }
    
    setAffirmationTimings(timings);
    return audioBufferToWav(outputBuffer);
  };

  const processAudio = async (affirmations: string, voiceSettings: VoiceSettings, silenceGap: number) => {
    if (!affirmations.trim()) {
      toast({
        title: "No Affirmations",
        description: "Please enter some affirmations to generate audio.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedAudio(null);

    try {
      const lines = affirmations.split('\n').filter(line => line.trim());
      
      toast({
        title: "Generation Started",
        description: `Processing ${lines.length} affirmations...`
      });

      const { audioClips, wordTimings: generatedWordTimings } = await generateAudioClips(lines, voiceSettings);
      setWordTimings(generatedWordTimings);
      
      setProgress(80);
      const combinedAudio = await combineAudioClips(audioClips, lines, silenceGap);
      
      setProgress(100);
      const audioUrl = URL.createObjectURL(combinedAudio);
      setGeneratedAudio(audioUrl);
      
      toast({
        title: "Generation Complete!",
        description: "Your affirmation audio is ready for download."
      });
      
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Please check if Kokoro TTS is running on localhost:8880. You can also visit localhost:8880/web for debugging.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return {
    isGenerating,
    progress,
    generatedAudio,
    affirmationTimings,
    wordTimings,
    processAudio
  };
};