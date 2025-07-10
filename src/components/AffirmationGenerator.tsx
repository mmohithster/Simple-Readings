import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAudioProcessor, VoiceSettings } from '@/hooks/useAudioProcessor';
import { useVoiceShortcuts } from '@/hooks/useVoiceShortcuts';
import { DEFAULT_AFFIRMATIONS } from '@/constants/affirmations';
import { AffirmationInput } from '@/components/AffirmationInput';
import { VoiceSettings as VoiceSettingsComponent } from '@/components/VoiceSettings';
import { AudioControls } from '@/components/AudioControls';
import { VoiceShortcuts } from '@/components/VoiceShortcuts';

const AffirmationGenerator = () => {
  const [affirmations, setAffirmations] = useState('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    model: 'kokoro',
    voice: 'af_bella(3)+af_v0nicole(6)+af_kore(1)',
    speed: 0.9
  });
  const [silenceGap, setSilenceGap] = useState(2.5);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { 
    isGenerating, 
    progress, 
    generatedAudio, 
    affirmationTimings, 
    wordTimings, 
    processAudio 
  } = useAudioProcessor();

  useVoiceShortcuts({
    onVoiceChange: setVoiceSettings,
    onSilenceGapChange: setSilenceGap,
    onShowShortcuts: () => setShowShortcuts(true)
  });

  const handleGenerate = () => {
    processAudio(affirmations, voiceSettings, silenceGap);
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
            <AffirmationInput
              affirmations={affirmations}
              onAffirmationsChange={setAffirmations}
              onUseDefault={() => setAffirmations(DEFAULT_AFFIRMATIONS)}
            />
          </div>

          {/* Settings Section */}
          <div className="space-y-6">
            <VoiceSettingsComponent
              voiceSettings={voiceSettings}
              silenceGap={silenceGap}
              onVoiceSettingsChange={setVoiceSettings}
              onSilenceGapChange={setSilenceGap}
            />

            {/* Generate Section */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="pt-6">
                <AudioControls
                  isGenerating={isGenerating}
                  progress={progress}
                  generatedAudio={generatedAudio}
                  affirmationTimings={affirmationTimings}
                  wordTimings={wordTimings}
                  onGenerate={handleGenerate}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <VoiceShortcuts open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
};

export default AffirmationGenerator;
