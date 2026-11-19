import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/40 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold mb-2">403 - Unauthorized</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        You do not have permission to access this page. Please log in with an authorized account or return to safety.
      </p>
      <div className="flex gap-4">
        <Link to="/login">
          <Button variant="outline">Go to Login</Button>
        </Link>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
