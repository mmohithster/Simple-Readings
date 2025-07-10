import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { VOICE_PRESETS } from '@/constants/affirmations';
import { VoiceSettings } from '@/hooks/useAudioProcessor';

interface UseVoiceShortcutsProps {
  onVoiceChange: (settings: VoiceSettings) => void;
  onSilenceGapChange: (gap: number) => void;
  onShowShortcuts: () => void;
}

export const useVoiceShortcuts = ({ 
  onVoiceChange, 
  onSilenceGapChange, 
  onShowShortcuts 
}: UseVoiceShortcutsProps) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.altKey && !event.metaKey) {
        let selectedPreset: typeof VOICE_PRESETS[keyof typeof VOICE_PRESETS] | null = null;
        
        if (event.shiftKey && event.key.toLowerCase() === 's') {
          selectedPreset = VOICE_PRESETS['spiritual-sattva'];
          event.preventDefault();
        } else if (event.key.toLowerCase() === 'i') {
          selectedPreset = VOICE_PRESETS['ivory-affirmation'];
          event.preventDefault();
        } else if (event.key.toLowerCase() === 'a') {
          selectedPreset = VOICE_PRESETS['astral-embrace'];
          event.preventDefault();
        } else if (event.key.toLowerCase() === 'e') {
          selectedPreset = VOICE_PRESETS['nightly-science'];
          event.preventDefault();
        } else if (event.key.toLowerCase() === 'g') {
          selectedPreset = VOICE_PRESETS['starlit-science'];
          event.preventDefault();
        } else if (event.key.toLowerCase() === 'm') {
          onShowShortcuts();
          event.preventDefault();
        }
        
        if (selectedPreset) {
          onVoiceChange({
            model: 'kokoro',
            voice: selectedPreset.voice,
            speed: selectedPreset.speed
          });
          onSilenceGapChange(selectedPreset.silenceGap);
          toast({
            title: "Voice Changed",
            description: `Switched to ${selectedPreset.name}`,
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onVoiceChange, onSilenceGapChange, onShowShortcuts, toast]);
};