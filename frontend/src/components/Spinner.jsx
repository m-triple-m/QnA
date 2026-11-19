import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Spinner({ className, size = 32 }) {
  return (
    <div className="flex items-center justify-center h-full w-full p-4">
      <Loader2
        style={{ width: size, height: size }}
        className={cn('animate-spin text-primary', className)}
      />
    </div>
  );
}
