# AKO LMS Web Application

Modern React/Next.js web application for the AKO Learning Management System.

## Features

- **Modern Stack**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui components with Radix UI primitives
- **Authentication**: JWT-based auth with role-based access control
- **Internationalization**: English/Arabic support with RTL layout
- **Dark Mode**: System-aware theme switching
- **Responsive Design**: Mobile-first responsive layout
- **Performance**: Optimized for fast loading and smooth interactions
- **Accessibility**: WCAG 2.1 AA compliant

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand + React Query
- **Authentication**: JWT tokens with secure cookie storage
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
src/
├── app/                # Next.js App Router pages
│   ├── (auth)/        # Authentication routes
│   ├── dashboard/     # Main app dashboard
│   ├── courses/       # Course management
│   └── admin/         # Admin panel
├── components/        # Reusable components
│   ├── ui/           # Base UI components
│   ├── forms/        # Form components
│   └── layout/       # Layout components
├── lib/              # Utility functions
├── hooks/            # Custom React hooks
├── store/            # State management
├── types/            # TypeScript type definitions
└── styles/           # Global styles
```

## Key Features

### Role-Based Access
- **Student**: View courses, watch videos, take quizzes
- **Parent**: Monitor children's progress, receive reports
- **Assistant**: Manage enrollments, handle administrative tasks
- **Instructor**: Create courses, manage content, view analytics
- **Admin**: Full system control, user management, reports

### Secure Video Player
- DRM-protected video streaming
- Dynamic watermarking
- Anti-cheat measures for exams
- Playback analytics and tracking

### Course Management
- Course creation and authoring
- Drip content scheduling
- Quiz and assessment tools
- Progress tracking and analytics

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- RTL language support
- Dark/light theme support

## Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_WEB_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_FEATURE_MFA=true
NEXT_PUBLIC_FEATURE_DRM=true
NEXT_PUBLIC_FEATURE_ANALYTICS=true

# Media Configuration
NEXT_PUBLIC_CDN_BASE_URL=http://localhost:9000

# Internationalization
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,ar
NEXT_PUBLIC_DEFAULT_TIMEZONE=Africa/Cairo
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript check
- `npm run analyze` - Analyze bundle size

## Development Guidelines

### Component Structure
```tsx
// components/ui/button.tsx
import { cn } from '@/lib/utils'

interface ButtonProps {
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({ 
  variant = 'default', 
  size = 'md', 
  children,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        variant === 'default' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-12 px-6 text-lg'
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

### State Management
```tsx
// store/auth.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
```

### API Integration
```tsx
// hooks/use-courses.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api.courses.list(),
  })
}
```

## Deployment

### Build and Deploy
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

## Performance Optimization

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Bundle Analysis**: Built-in bundle analyzer
- **Caching**: React Query for API caching
- **Lazy Loading**: Dynamic imports for heavy components

## Accessibility

- **Semantic HTML**: Proper HTML semantics
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and descriptions
- **Color Contrast**: WCAG AA compliant colors
- **Focus Management**: Proper focus handling

## Internationalization

- **Language Support**: English and Arabic
- **RTL Layout**: Right-to-left layout for Arabic
- **Date/Time**: Localized formatting
- **Number Formatting**: Currency and number localization

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - AKO Courses
