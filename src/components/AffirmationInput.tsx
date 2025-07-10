import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Volume2 } from 'lucide-react';

interface AffirmationInputProps {
  affirmations: string;
  onAffirmationsChange: (affirmations: string) => void;
  onUseDefault: () => void;
}

export const AffirmationInput: React.FC<AffirmationInputProps> = ({
  affirmations,
  onAffirmationsChange,
  onUseDefault
}) => {
  return (
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
          onChange={(e) => onAffirmationsChange(e.target.value)}
          className="min-h-[300px] resize-none"
        />
        <Button
          variant="outline"
          onClick={onUseDefault}
          className="w-full"
        >
          Use Sample Affirmations
        </Button>
      </CardContent>
    </Card>
  );
};