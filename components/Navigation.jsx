'use client';

import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Home, User, Bell, Search, Users, UserPlus, Plus, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export function Navigation({ activeTab, onTabChange, friendRequestsCount = 0, notificationsCount = 0, unreadMessagesCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);

  const NavItems = () => (
    <>
      <Button
        variant={activeTab === 'home' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('home');
          setIsOpen(false);
        }}
        className={`justify-start transition-all ${activeTab === 'home' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <Home className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Home</span>
      </Button>

      <Button
        variant={activeTab === 'create' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('create');
          setIsOpen(false);
        }}
        className={`justify-start transition-all ${activeTab === 'create' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <Plus className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Create Post</span>
      </Button>
      
      <Button
        variant={activeTab === 'search' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('search');
          setIsOpen(false);
        }}
        className={`justify-start transition-all ${activeTab === 'search' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <Search className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Search Users</span>
      </Button>

      <Button
        variant={activeTab === 'messages' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('messages');
          setIsOpen(false);
        }}
        className={`justify-start relative transition-all ${activeTab === 'messages' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <MessageCircle className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Messages</span>
        {unreadMessagesCount > 0 && (
          <Badge 
            variant="destructive" 
            className="ml-2 px-1.5 py-0.5 text-xs h-5 min-w-[20px]"
          >
            {unreadMessagesCount}
          </Badge>
        )}
      </Button>
      
      <Button
        variant={activeTab === 'friends' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('friends');
          setIsOpen(false);
        }}
        className="justify-start"
      >
        <Users className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Friends</span>
      </Button>
      
      <Button
        variant={activeTab === 'requests' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('requests');
          setIsOpen(false);
        }}
        className="justify-start relative"
      >
        <UserPlus className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Requests</span>
        {friendRequestsCount > 0 && (
          <Badge 
            variant="destructive" 
            className="ml-2 px-1.5 py-0.5 text-xs h-5 min-w-[20px]"
          >
            {friendRequestsCount}
          </Badge>
        )}
      </Button>
      
      <Button
        variant={activeTab === 'profile' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('profile');
          setIsOpen(false);
        }}
        className="justify-start"
      >
        <User className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Profile</span>
      </Button>
      
      <Button
        variant={activeTab === 'notifications' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          onTabChange('notifications');
          setIsOpen(false);
        }}
        className="justify-start relative"
      >
        <Bell className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Notifications</span>
        {notificationsCount > 0 && (
          <Badge 
            variant="destructive" 
            className="ml-2 px-1.5 py-0.5 text-xs h-5 min-w-[20px]"
          >
            {notificationsCount}
          </Badge>
        )}
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b glass backdrop-blur-2xl shadow-lg border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg neon-glow">
            <span className="text-xl font-bold text-black">T</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent hidden sm:inline tracking-wider">
            TWIST
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          <NavItems />
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="relative">
                <Users className="w-5 h-5" />
                {(friendRequestsCount > 0 || notificationsCount > 0 || unreadMessagesCount > 0) && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 px-1 py-0 text-xs h-4 min-w-[16px]"
                  >
                    {friendRequestsCount + notificationsCount + unreadMessagesCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px]">
              <div className="flex flex-col space-y-2 mt-8">
                <NavItems />
              </div>
            </SheetContent>
          </Sheet>

          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
