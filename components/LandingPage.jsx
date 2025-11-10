'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, MessageCircle, Image, Shield, Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl mb-6 neon-glow animate-pulse">
              <span className="text-4xl font-bold text-white">T</span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold gradient-text drop-shadow-2xl">
              Welcome to TWIST
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              A modern social media platform where connections matter and conversations thrive
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignUpButton mode="modal">
              <Button
                size="lg"
                className="h-14 px-8 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold text-lg shadow-xl neon-glow"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 glass border-white/20 hover:border-purple-500/50 text-white font-semibold text-lg hover:bg-white/10"
              >
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="glass card-glow border-white/10 hover:border-blue-500/50 transition-all">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 neon-glow">
                <Users className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Connect with People</CardTitle>
              <CardDescription className="text-gray-300">
                Build meaningful connections with people who share your interests
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass card-glow border-white/10 hover:border-purple-500/50 transition-all">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 neon-glow">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Share Your Story</CardTitle>
              <CardDescription className="text-gray-300">
                Express yourself with posts, stories, and direct messages
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass card-glow border-white/10 hover:border-pink-500/50 transition-all">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center mb-4 neon-glow">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Privacy First</CardTitle>
              <CardDescription className="text-gray-300">
                Your data is secure with enterprise-grade encryption and privacy controls
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Secondary Features */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card className="glass card-glow border-white/10">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                <div>
                  <Image className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-semibold text-white">Media Sharing</p>
                </div>
                <div>
                  <Zap className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-sm font-semibold text-white">Real-time Updates</p>
                </div>
                <div>
                  <Users className="w-8 h-8 mx-auto mb-2 text-pink-400" />
                  <p className="text-sm font-semibold text-white">Communities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-400">
          <p>© 2025 TWIST. Built with Next.js, Clerk, and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
