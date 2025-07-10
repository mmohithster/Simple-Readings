import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Play, Pause } from 'lucide-react';
import { AffirmationTiming, AffirmationWordTiming } from '@/hooks/useAudioProcessor';
import { generateSrtContent, generateWordLevelSrtContent, downloadFile, downloadAudio } from '@/utils/srtGenerator';

interface AudioControlsProps {
  isGenerating: boolean;
  progress: number;
  generatedAudio: string | null;
  affirmationTimings: AffirmationTiming[];
  wordTimings: AffirmationWordTiming[];
  onGenerate: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isGenerating,
  progress,
  generatedAudio,
  affirmationTimings,
  wordTimings,
  onGenerate
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

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

  const handleDownloadSrt = () => {
    if (affirmationTimings.length > 0) {
      const srtContent = generateSrtContent(affirmationTimings);
      downloadFile(srtContent, 'affirmations.srt');
    }
  };

  const handleDownloadWordSrt = () => {
    if (affirmationTimings.length > 0) {
      const srtContent = generateWordLevelSrtContent(wordTimings, affirmationTimings);
      downloadFile(srtContent, 'affirmations-words.srt');
    }
  };

  const handleDownloadAudio = () => {
    if (generatedAudio) {
      downloadAudio(generatedAudio);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={onGenerate}
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
          
          <div className="space-y-2">
            <Button
              onClick={togglePlayback}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? 'Pause' : 'Preview'}
            </Button>
            
            <div className="space-y-2">
              <Button
                onClick={handleDownloadAudio}
                className="w-full bg-gradient-primary hover:shadow-glow"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Audio
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadSrt}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={affirmationTimings.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  .SRT
                </Button>
                
                <Button
                  onClick={handleDownloadWordSrt}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={affirmationTimings.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Word SRT
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};