'use client';

import { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";


import { Button } from '@/components/ui/button';
export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const role = session?.user?.role;

      if (!role) {
        router.push('/choose-role');
      } else if (role === 'STUDENT') {
        router.push('/student/dashboard');
      } else {
        router.push('/teacher/dashboard');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-indigo-100 px-4">
      <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-md w-full">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">Welcome Back</h2>
        <p className="text-center text-gray-500 mb-6">Sign in to your SynapsEd account</p>

        <Button
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center  space-x-2 py-3"
          variant={'outline'}
        >
          <FcGoogle className="w-5 h-5" />
          <span>Sign in with Google</span>
        </Button>
      </div>
    </div>
  );
}