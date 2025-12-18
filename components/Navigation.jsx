'use client';

import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Home, User, Bell, Search, Users, UserPlus, Plus, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TwistLogo } from '@/components/TwistLogo';
import { LimelightNav } from '@/components/limelight-nav';

export function Navigation({ activeTab, onTabChange, friendRequestsCount = 0, notificationsCount = 0, unreadMessagesCount = 0 }) {
  
  // Map tab names to indices for the mobile nav
  const tabToIndex = {
    'home': 0,
    'create': 1,
    'messages': 2,
    'friends': 3,
    'notifications': 4,
    'profile': 5,
    'search': 0,
    'requests': 3,
  };

  const indexToTab = ['home', 'create', 'messages', 'friends', 'notifications', 'profile'];

  // Mobile nav items with icons
  const mobileNavItems = [
    { 
      id: 'home', 
      icon: <Home />, 
      label: 'Home',
      onClick: () => onTabChange('home')
    },
    { 
      id: 'create', 
      icon: <Plus />, 
      label: 'Create',
      onClick: () => onTabChange('create')
    },
    { 
      id: 'messages', 
      icon: (
        <div className="relative">
          <MessageCircle />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          )}
        </div>
      ), 
      label: 'Messages',
      onClick: () => onTabChange('messages')
    },
    { 
      id: 'friends', 
      icon: (
        <div className="relative">
          <Users />
          {friendRequestsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
            </span>
          )}
        </div>
      ), 
      label: 'Friends',
      onClick: () => onTabChange('friends')
    },
    { 
      id: 'notifications', 
      icon: (
        <div className="relative">
          <Bell />
          {notificationsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {notificationsCount > 9 ? '9+' : notificationsCount}
            </span>
          )}
        </div>
      ), 
      label: 'Notifications',
      onClick: () => onTabChange('notifications')
    },
    { 
      id: 'profile', 
      icon: <User />, 
      label: 'Profile',
      onClick: () => onTabChange('profile')
    },
  ];

  const NavItems = () => (
    <>
      <Button
        variant={activeTab === 'home' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('home')}
        className={`justify-start transition-all ${activeTab === 'home' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <Home className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Home</span>
      </Button>

      <Button
        variant={activeTab === 'create' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('create')}
        className={`justify-start transition-all ${activeTab === 'create' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <Plus className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Create Post</span>
      </Button>
      
      <Button
        variant={activeTab === 'search' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('search')}
        className={`justify-start transition-all ${activeTab === 'search' ? 'glass-hover neon-glow' : 'hover:glass'}`}
      >
        <Search className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Search Users</span>
      </Button>

      <Button
        variant={activeTab === 'messages' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('messages')}
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
        onClick={() => onTabChange('friends')}
        className="justify-start"
      >
        <Users className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Friends</span>
      </Button>
      
      <Button
        variant={activeTab === 'requests' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('requests')}
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
        onClick={() => onTabChange('profile')}
        className="justify-start"
      >
        <User className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Profile</span>
      </Button>
      
      <Button
        variant={activeTab === 'notifications' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('notifications')}
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
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-[rgba(26,26,26,0.6)]">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          {/* Logo - Centered on mobile */}
          <div className="flex items-center space-x-2 md:flex-none flex-1 justify-center md:justify-start">
            <TwistLogo className="w-8 h-8 md:w-10 md:h-10" />
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent tracking-wider">
              TWIST
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <NavItems />
          </div>

          {/* Right Section - User Button */}
          <div className="flex items-center absolute right-4 md:relative md:right-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center">
        <LimelightNav
          items={mobileNavItems}
          defaultActiveIndex={tabToIndex[activeTab] || 0}
          onTabChange={(index) => onTabChange(indexToTab[index])}
          className="w-full rounded-none bg-black/40 backdrop-blur-md border-t border-x-0 border-b-0 border-white/10"
          limelightClassName="bg-yellow-500 shadow-[0_50px_15px_rgba(234,179,8,0.4)]"
          iconClassName="text-yellow-400"
        />
      </div>
    </>
  );
}
