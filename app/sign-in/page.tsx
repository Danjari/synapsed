// app/signin/page.tsx
'use client';

import AuthButton from '@/components/AuthButtons';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6 text-center border p-8 rounded-lg shadow-lg bg-card">
        <h1 className="text-3xl font-bold">Sign in to Synapsed</h1>
        <p className="text-muted-foreground text-sm">Choose a method to access your dashboard</p>
        <AuthButton />
      </div>
    </div>
  );
}