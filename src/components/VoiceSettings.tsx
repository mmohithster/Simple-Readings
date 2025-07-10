import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceSettings as VoiceSettingsType } from '@/hooks/useAudioProcessor';

interface VoiceSettingsProps {
  voiceSettings: VoiceSettingsType;
  silenceGap: number;
  onVoiceSettingsChange: (settings: VoiceSettingsType) => void;
  onSilenceGapChange: (gap: number) => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  voiceSettings,
  silenceGap,
  onVoiceSettingsChange,
  onSilenceGapChange
}) => {
  return (
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
            onChange={(e) => onVoiceSettingsChange({
              ...voiceSettings,
              voice: e.target.value
            })}
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
            onChange={(e) => onVoiceSettingsChange({
              ...voiceSettings,
              speed: parseFloat(e.target.value)
            })}
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
            onChange={(e) => onSilenceGapChange(parseFloat(e.target.value))}
          />
        </div>
      </CardContent>
    </Card>
  );
};