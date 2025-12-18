'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, MessageCircle, Heart, Share2 } from 'lucide-react';
import RadialOrbitalTimeline from '@/components/ui/radial-orbital-timeline';
import { TwistLogo } from '@/components/TwistLogo';

const timelineData = [
  {
    id: 1,
    title: "Sign Up",
    date: "Step 1",
    content: "Create your account and set up your profile in seconds.",
    category: "Getting Started",
    icon: UserPlus,
    relatedIds: [2],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "Connect",
    date: "Step 2",
    content: "Find and connect with friends, family, and like-minded people.",
    category: "Social",
    icon: Users,
    relatedIds: [1, 3],
    status: "completed",
    energy: 90,
  },
  {
    id: 3,
    title: "Share",
    date: "Step 3",
    content: "Post updates, photos, and stories with your network.",
    category: "Content",
    icon: Share2,
    relatedIds: [2, 4],
    status: "in-progress",
    energy: 80,
  },
  {
    id: 4,
    title: "Engage",
    date: "Step 4",
    content: "Like, comment, and interact with posts from your connections.",
    category: "Interaction",
    icon: Heart,
    relatedIds: [3, 5],
    status: "in-progress",
    energy: 70,
  },
  {
    id: 5,
    title: "Message",
    date: "Step 5",
    content: "Start private conversations with secure, encrypted messaging.",
    category: "Communication",
    icon: MessageCircle,
    relatedIds: [4],
    status: "pending",
    energy: 60,
  },
];

export function LandingPage() {
  return (
    <div className="h-screen w-full relative overflow-hidden flex items-center">
      {/* Left Side - Branding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 z-50">
        <div className="max-w-lg text-center md:text-left">
          <div className="flex items-center gap-3 md:gap-4 mb-4 justify-center md:justify-start">
            <TwistLogo className="w-16 h-16 md:w-20 md:h-20" />
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
              Twist
            </h1>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground/90 mb-8 leading-relaxed">
            A modern social media platform where connections matter and conversations thrive
          </p>
          
          {/* Auth Buttons */}
          <div className="flex gap-4 justify-center md:justify-start">
            <SignUpButton mode="modal">
              <Button
                size="lg"
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xl neon-glow"
              >
                Get Started Free
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 glass border-yellow-500/30 hover:border-yellow-500/50 font-semibold hover:bg-yellow-500/10"
              >
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>
      </div>

      {/* Right Side - Radial Orbital Timeline (Desktop only) */}
      <div className="hidden md:flex flex-1 items-center justify-center h-full">
        <RadialOrbitalTimeline timelineData={timelineData} />
      </div>
    </div>
  );
}
