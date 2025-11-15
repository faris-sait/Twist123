import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    userId: 'test-user-id',
  }),
  useUser: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: 'https://example.com/avatar.jpg',
    },
    isLoaded: true,
  }),
  SignInButton: ({ children }) => <div>{children}</div>,
  SignUpButton: ({ children }) => <div>{children}</div>,
  UserButton: () => <div>UserButton</div>,
  ClerkProvider: ({ children }) => <div>{children}</div>,
}))

// Mock fetch globally
global.fetch = jest.fn()
