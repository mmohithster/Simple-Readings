import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { VOICE_PRESETS } from '@/constants/affirmations';

interface VoiceShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceShortcuts: React.FC<VoiceShortcutsProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Voice Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2 text-sm">
            {Object.values(VOICE_PRESETS).map((preset) => (
              <div key={preset.name} className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="font-mono">{preset.shortcut}</span>
                <span>{preset.name}</span>
              </div>
            ))}
            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
              <span className="font-mono">Ctrl + M</span>
              <span>Show this dialog</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};