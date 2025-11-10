-- Post Likes Schema
-- Run this SQL in your Supabase SQL Editor

-- Create post_likes table
create table if not exists public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure a user can only like a post once
  unique(post_id, user_id)
);

-- Create indexes for performance
create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists post_likes_user_id_idx on public.post_likes(user_id);
create index if not exists post_likes_created_at_idx on public.post_likes(created_at desc);

-- Enable Row Level Security
alter table public.post_likes enable row level security;

-- RLS Policies
-- Users can view all likes
create policy "Users can view all likes"
  on public.post_likes for select
  using (true);

-- Users can like posts
create policy "Users can like posts"
  on public.post_likes for insert
  with check (
    user_id in (
      select id from public.profiles
      where clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

-- Users can unlike their own likes
create policy "Users can unlike their own likes"
  on public.post_likes for delete
  using (
    user_id in (
      select id from public.profiles
      where clerk_user_id = (auth.jwt() ->> 'sub')::text
    )
  );

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on public.post_likes to anon, authenticated;
