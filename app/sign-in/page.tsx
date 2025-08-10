'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";
import { Role } from '@prisma/client';

import { Button } from '@/components/ui/button';

type UserWithRole = {
  id: string;
  email: string;
  name?: string;
  role?: Role;
};
export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log('Auth status:', status);
    console.log('Session:', session);
    
    if (status === 'authenticated') {
      const role = (session?.user as UserWithRole)?.role;
      console.log('User role:', role);

      if (!role) {
        console.log('Redirecting to choose-role');
        setIsRedirecting(true);
        router.replace('/choose-role');
        // Fallback redirect
        setTimeout(() => {
          window.location.href = '/choose-role';
        }, 1000);
      } else if (role === 'STUDENT') {
        console.log('Redirecting to student dashboard');
        setIsRedirecting(true);
        router.replace('/student/dashboard');
        // Fallback redirect
        setTimeout(() => {
          window.location.href = '/student/dashboard';
        }, 1000);
      } else {
        console.log('Redirecting to teacher dashboard');
        setIsRedirecting(true);
        router.replace('/teacher/dashboard');
        // Fallback redirect
        setTimeout(() => {
          window.location.href = '/teacher/dashboard';
        }, 1000);
      }
    }
  }, [session, status, router]);

  if (status === 'loading' || isRedirecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold animate-pulse">
          {isRedirecting ? 'Redirecting...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center  px-4">
      <div className="  rounded-3xl p-10 max-w-md w-full">
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