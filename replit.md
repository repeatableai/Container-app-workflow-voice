# Overview

This is a full-stack web application called ContainerHub that provides a centralized platform for managing digital containers (Apps, AI Voices, and Automation Workflows). The application features role-based access control, allowing organizations to securely organize and manage their digital assets with different permission levels for different user types.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming support (light/dark modes)
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation using @hookform/resolvers

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Development**: Hot module replacement in development with Vite middleware integration
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **Error Handling**: Centralized error middleware with structured error responses

## Authentication & Authorization
- **Strategy**: OpenID Connect (OIDC) integration with Replit's authentication service
- **Session Storage**: Server-side sessions stored in PostgreSQL with configurable TTL
- **Role-Based Access**: User roles (admin/viewer) with granular permissions for different container types
- **Security**: HTTP-only cookies, CSRF protection, and secure session configuration

## Database Design
- **ORM**: Drizzle ORM with PostgreSQL as the database
- **Schema Organization**: Shared schema definitions between client and server in `/shared/schema.ts`
- **Key Tables**:
  - Users: Profile information and roles
  - Containers: Main entities with type (app/voice/workflow), industry, department, visibility levels
  - UserPermissions: Granular access control for different container types
  - Sessions: Server-side session storage

## API Structure
- **Pattern**: RESTful API design with consistent response formats
- **Endpoints**: 
  - Authentication routes (/api/auth/*)
  - Container CRUD operations (/api/containers)
  - Admin user management (/api/admin/*)
  - Filter data endpoints (/api/filters/*)
- **Validation**: Request validation using Zod schemas shared between client and server
- **Error Handling**: Structured error responses with appropriate HTTP status codes

## File Organization
- **Monorepo Structure**: Client, server, and shared code in separate directories
- **Client**: React application in `/client` with component-based architecture
- **Server**: Express API in `/server` with modular route organization  
- **Shared**: Common TypeScript definitions and schemas in `/shared`
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)

# External Dependencies

## Database & ORM
- **PostgreSQL**: Primary database with Neon serverless PostgreSQL adapter
- **Drizzle ORM**: Type-safe database operations with automatic migration support
- **Connection Pooling**: Neon serverless connection pooling for optimal performance

## Authentication
- **Replit OIDC**: Integration with Replit's OpenID Connect authentication service
- **Passport.js**: Authentication middleware with OpenID Connect strategy
- **Session Store**: PostgreSQL-backed session storage with automatic cleanup

## UI & Styling
- **Radix UI**: Headless UI components for accessibility and keyboard navigation
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting utilities

## Development Tools
- **Vite**: Fast build tool with HMR and optimized production builds
- **TypeScript**: Static typing across the entire application stack
- **ESBuild**: Fast JavaScript bundler for server-side code
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility

## Server Infrastructure
- **Express.js**: Web application framework with middleware support
- **CORS Handling**: Configured for secure cross-origin requests
- **Request Logging**: Custom middleware for API request/response logging
- **Environment Variables**: Configuration management for different deployment environments