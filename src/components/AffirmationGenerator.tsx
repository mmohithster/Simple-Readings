import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Download, Play, Pause, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceSettings {
  model: string;
  voice: string;
  speed: number;
}

const AffirmationGenerator = () => {
  const [affirmations, setAffirmations] = useState('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    model: 'kokoro',
    voice: 'af_jessica(1)+af_v0nicole(8)+af_v0(1)',
    speed: 0.9
  });
  const [silenceGap, setSilenceGap] = useState(2.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const defaultAffirmations = `I am fully ready for the radiant possibilities of July 2025.
I am wide open to the miracles this July is weaving into my reality.
I am a powerful magnet for blessings, and July 2025 overflows with them.
I welcome this luminous month with an expansive heart and unlimited faith.
I am perfectly aligned with the frequency of magic and divine surprises.
This month, I choose to recognize miracles in every moment.
This month, I choose to expect extraordinary beauty.
July 2025 is my chapter of magnificent breakthrough and transformation.
I am flowing into a season of grace and effortless manifestation.
My soul is open to the breathtaking wonders July holds for me.
I am prepared to receive the abundant gifts July 2025 is delivering to me.
I invite miracles into every corner of my existence this July.
I am perfectly tuned to the signs and synchronicities leading me to my destiny.
July 2025 is my month for quantum leaps and glorious new chapters.
I dissolve all resistance and allow miracles to cascade to me naturally.
My mind is luminous, my heart is expansive, and my spirit dances with July's gifts.
I embrace the unfolding of divine perfection in my life this month.
I am a living conduit for miraculous energy and positive transformation.
Every sunrise in July 2025 brings me closer to my most sacred dreams.
I am completely worthy of all the magnificence flowing toward me.`;

  const generateAudioClips = async (affirmationLines: string[]) => {
    const audioClips: Blob[] = [];
    
    for (let i = 0; i < affirmationLines.length; i++) {
      const affirmation = affirmationLines[i].trim();
      if (!affirmation) continue;
      
      try {
        setProgress(((i + 1) / affirmationLines.length) * 70); // 70% for individual clips
        
        const response = await fetch('http://localhost:8880/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: affirmation,
            ...voiceSettings
          })
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
          variant: "destructive"
        });
        throw error;
      }
    }
    
    return audioClips;
  };

  const createSilenceBlob = (durationSeconds: number): Blob => {
    const sampleRate = 44100;
    const numSamples = sampleRate * durationSeconds;
    const audioBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(audioBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Silence (zeros)
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(44 + i * 2, 0, true);
    }
    
    return new Blob([audioBuffer], { type: 'audio/wav' });
  };

  const combineAudioClips = async (audioClips: Blob[]): Promise<Blob> => {
    const silenceBlob = createSilenceBlob(silenceGap);
    const allBlobs: Blob[] = [];
    
    for (let i = 0; i < audioClips.length; i++) {
      allBlobs.push(audioClips[i]);
      if (i < audioClips.length - 1) {
        allBlobs.push(silenceBlob);
      }
    }
    
    // For now, we'll create a simple concatenation
    // In a real implementation, you'd want proper audio processing
    return new Blob(allBlobs, { type: 'audio/wav' });
  };

  const handleGenerate = async () => {
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

      const audioClips = await generateAudioClips(lines);
      
      setProgress(80);
      const combinedAudio = await combineAudioClips(audioClips);
      
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
        description: "Please check if Kokoro TTS is running on localhost:8880",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (generatedAudio) {
      const a = document.createElement('a');
      a.href = generatedAudio;
      a.download = 'affirmations.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const togglePlayback = () => {
    const audio = document.getElementById('audio-preview') as HTMLAudioElement;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
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
            Create personalized meditation tracks with customizable silence gaps.
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
                <Textarea
                  placeholder="Enter your affirmations, one per line..."
                  value={affirmations}
                  onChange={(e) => setAffirmations(e.target.value)}
                  className="min-h-[300px] resize-none"
                />
                <Button
                  variant="outline"
                  onClick={() => setAffirmations(defaultAffirmations)}
                  className="w-full"
                >
                  Use Sample Affirmations
                </Button>
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
                  <Label htmlFor="speed">Speech Speed</Label>
                  <Input
                    id="speed"
                    type="number"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.speed}
                    onChange={(e) => setVoiceSettings(prev => ({
                      ...prev,
                      speed: parseFloat(e.target.value)
                    }))}
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
                  {isGenerating ? 'Generating...' : 'Generate Audio'}
                </Button>
                
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {progress < 70 ? 'Processing affirmations...' : 'Combining audio clips...'}
                    </p>
                  </div>
                )}
                
                {generatedAudio && (
                  <div className="space-y-3 pt-4 border-t">
                    <audio
                      id="audio-preview"
                      src={generatedAudio}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={togglePlayback}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause' : 'Preview'}
                      </Button>
                      
                      <Button
                        onClick={handleDownload}
                        className="flex-1 bg-gradient-secondary"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffirmationGenerator;