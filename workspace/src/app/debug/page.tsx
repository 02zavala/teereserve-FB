import { GoogleAuthDebug } from '@/components/debug/GoogleAuthDebug';

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Debug Google Authentication</h1>
      <GoogleAuthDebug />
    </div>
  );
}