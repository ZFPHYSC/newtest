import { useEffect } from 'react';

interface ProgressBubbleProps {
  currentProgress: number;
  total: number;
  onComplete: () => void;
  fileName?: string;
}

const ProgressBubble = ({ currentProgress, total, onComplete, fileName }: ProgressBubbleProps) => {
  useEffect(() => {
    if (currentProgress >= total) {
      const timer = setTimeout(onComplete, 300);
      return () => clearTimeout(timer);
    }
  }, [currentProgress, total, onComplete]);

  const simulatedMB単位 = 2.3;
  const savedMB = (currentProgress / total) * (total * simulatedMB単位 / 100);

  return (
    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-md shadow-sm border border-separator max-w-[80%] animate-bubble-enter">
      <div className="font-rubik text-sm">
        {fileName ? `Uploading ${fileName}: ` : 'Uploading: '}
        {currentProgress}% / {total}%
      </div>
    </div>
  );
};

export default ProgressBubble;
