import { AffirmationTiming, AffirmationWordTiming } from '@/hooks/useAudioProcessor';

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

export const generateSrtContent = (affirmationTimings: AffirmationTiming[]): string => {
  return affirmationTimings.map((timing, index) => {
    return `${index + 1}\n${formatTime(timing.start)} --> ${formatTime(timing.end)}\n${timing.text}\n`;
  }).join('\n');
};

export const generateWordLevelSrtContent = (
  wordTimings: AffirmationWordTiming[],
  affirmationTimings: AffirmationTiming[]
): string => {
  let srtEntries: string[] = [];
  let entryIndex = 1;

  if (wordTimings.length > 0 && wordTimings.some(wt => wt.wordTimings.length > 0)) {
    wordTimings.forEach((affirmationTiming, affirmationIndex) => {
      if (affirmationTiming.wordTimings.length > 0) {
        const affirmationGlobalTiming = affirmationTimings[affirmationIndex];
        const globalStartOffset = affirmationGlobalTiming ? affirmationGlobalTiming.start : 0;
        
        for (let i = 0; i < affirmationTiming.wordTimings.length; i += 5) {
          const chunk = affirmationTiming.wordTimings.slice(i, i + 5);
          const chunkStart = globalStartOffset + chunk[0].start;
          const chunkEnd = globalStartOffset + chunk[chunk.length - 1].end;
          const chunkText = chunk.map(w => w.word).join(' ');

          srtEntries.push(
            `${entryIndex}\n${formatTime(chunkStart)} --> ${formatTime(chunkEnd)}\n${chunkText}\n`
          );
          entryIndex++;
        }
      } else {
        const affirmationTiming_sentence = affirmationTimings[affirmationIndex];
        if (affirmationTiming_sentence) {
          const words = affirmationTiming_sentence.text.split(' ').filter(word => word.trim());
          const totalDuration = affirmationTiming_sentence.end - affirmationTiming_sentence.start;
          const timePerWord = totalDuration / words.length;

          for (let i = 0; i < words.length; i += 5) {
            const chunk = words.slice(i, i + 5);
            const chunkStart = affirmationTiming_sentence.start + (i * timePerWord);
            const chunkEnd = affirmationTiming_sentence.start + ((i + chunk.length) * timePerWord);

            srtEntries.push(
              `${entryIndex}\n${formatTime(chunkStart)} --> ${formatTime(chunkEnd)}\n${chunk.join(' ')}\n`
            );
            entryIndex++;
          }
        }
      }
    });
  } else {
    affirmationTimings.forEach((timing) => {
      const words = timing.text.split(' ').filter(word => word.trim());
      const totalDuration = timing.end - timing.start;
      const timePerWord = totalDuration / words.length;

      for (let i = 0; i < words.length; i += 5) {
        const chunk = words.slice(i, i + 5);
        const chunkStart = timing.start + (i * timePerWord);
        const chunkEnd = timing.start + ((i + chunk.length) * timePerWord);

        srtEntries.push(
          `${entryIndex}\n${formatTime(chunkStart)} --> ${formatTime(chunkEnd)}\n${chunk.join(' ')}\n`
        );
        entryIndex++;
      }
    });
  }

  return srtEntries.join('\n');
};

export const downloadFile = (content: string, filename: string, type: string = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
};

export const downloadAudio = (audioUrl: string, filename: string = 'affirmations.wav') => {
  const a = document.createElement('a');
  a.href = audioUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};