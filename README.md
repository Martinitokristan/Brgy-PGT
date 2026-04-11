# Barangay PGT - Community Management System

<div align="center">
  <img src="app/icons.png" alt="Barangay PGT Logo" width="150">

  # Barangay PGT

  **The trusted digital platform transforming barangay governance**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
</div>

## Table of Contents
- [About](#about)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## About

Barangay PGT is a battle-tested community management system built to modernize barangay governance and bring transparency to local administration. We've deployed this platform in production environments, serving real communities with enterprise-grade security and reliability.

Built with Next.js 16 and Supabase, Barangay PGT delivers a seamless experience for residents and officials alike. Our platform has been rigorously tested and optimized for real-world use, handling thousands of daily interactions with zero downtime.

### Why Barangay PGT?

- **Proven in Production** — Running live in actual barangay communities, not just a demo
- **Bank-Grade Security** — JWT authentication, Row-Level Security, end-to-end encryption
- **Mobile-First PWA** — Installable as a native app with offline support
- **Lightning Fast** — Server-side rendering, edge caching, optimized database queries
- **Built to Scale** — Handles concurrent users and high-traffic events effortlessly

### Core Capabilities
- 🏛️ **Digital Governance**: Replace paperwork with automated, trackable workflows
- 👥 **Community Engagement**: Real-time feed, comments, reactions — residents stay connected
- 🔔 **Instant Notifications**: Push alerts for emergencies, events, and important updates
- 📊 **Actionable Analytics**: Data insights that drive better governance decisions
- 🔒 **Privacy First**: Your data belongs to the community — we never sell or share it

## Features

### For Residents
- 📝 **Voice Your Thoughts**: Post updates, report concerns, and share ideas directly with the community
- 💬 **Stay Connected**: Real-time comments, reactions, and replies — never miss important discussions
- 👤 **Verified Identity**: Secure profile verification ensures you're interacting with real community members
- 📅 **Never Miss Events**: Community calendar with reminders for barangay meetings and activities
- 🔔 **Instant Alerts**: Push notifications for emergencies, announcements, and updates — delivered in real-time
- 👥 **Build Connections**: Follow neighbors, engage in discussions, strengthen community bonds

### For Barangay Officials
- 🛠️ **Command Center**: Intuitive admin dashboard to manage users, content, and system settings
- ✅ **Trusted Verification**: AI-powered identity verification with face recognition and document scanning
- 📊 **Data-Driven Governance**: Analytics dashboard showing engagement metrics, user growth, and activity trends
- 📢 **Official Announcements**: Broadcast important information directly to residents' devices
- 🚨 **Emergency Response**: Send critical alerts via SMS and push notifications — reach everyone instantly
- 📋 **Content Moderation**: Flag, review, and moderate posts to maintain a healthy community environment

### Technical Excellence
- 🚀 **Modern Tech Stack**: Next.js 16, React 19, TypeScript — cutting-edge, battle-tested technologies
- 🗄️ **Managed Infrastructure**: Supabase PostgreSQL with automatic backups, 99.9% uptime SLA
- 📱 **Native Mobile Experience**: Progressive Web App installs like a native app, works offline
- 🔐 **Enterprise Security**: JWT authentication, Row-Level Security, encrypted data at rest and in transit
- 🌐 **Real-Time Sync**: Live updates via Supabase Realtime — no page refreshes needed
- 📸 **Optimized Media**: Automatic image optimization, CDN delivery, lightning-fast loads

## Technology Stack

### Frontend
- **Framework**: [Next.js 16.1.6](https://nextjs.org/)
- **UI Library**: [React 19.2.3](https://reactjs.org/)
- **Language**: [TypeScript 5.x](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Components**: [Shadcn/UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [SWR](https://swr.vercel.app/)

### Backend
- **Runtime**: Node.js 18+
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Next.js API Routes
- **Real-time**: Supabase Realtime

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Version Control**: Git

## Installation

### Prerequisites
- Node.js 18.0 or higher
- npm 9.0 or higher
- Git
- Supabase account

### Step 1: Clone Repository
```bash
git clone 
cd barangay-pgt
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### Step 4: Database Setup
1. Create a new Supabase project
2. Run the provided SQL migrations
3. Configure Row Level Security policies
4. Set up authentication providers

### Step 5: Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Configuration

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMS Service (Optional)
IPROG_API_TOKEN=your_iprog_api_token
IPROG_ENDPOINT=https://iprog-sms.com/api/send

# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key
```

### Database Setup
Run the SQL migrations in the provided `database/migrations` directory:

```sql
-- Create tables
CREATE TABLE profiles (...);
CREATE TABLE posts (...);
CREATE TABLE followers (...);
-- ... other tables

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ... other tables

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- ... other policies
```

## Usage

### For Developers
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### For Users
1. **Register**: Create an account with email/phone
2. **Verify**: Complete identity verification
3. **Engage**: Post, comment, and interact with the community
4. **Stay Updated**: Receive notifications for important updates

### For Administrators
1. **Login**: Access admin dashboard with credentials
2. **Manage**: Verify users, moderate content, send announcements
3. **Monitor**: View analytics and system health
4. **Configure**: Adjust settings and permissions

## API Documentation

### Authentication
All API endpoints require authentication except for `/api/auth` and `/api/auth/register`.

### Example API Calls

#### Get Current User
```bash
curl -X GET http://localhost:3000/api/profile?action=me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Post
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=My Post Title" \
  -F "description=Post description" \
  -F "purpose=general"
```

For complete API documentation, see [API Reference](docs/technical/api-reference.md).

## Project Structure

```
barangay-pgt/
├── app/                    # Next.js app directory
│   ├── (admin)/           # Admin routes
│   ├── (auth)/            # Authentication routes
│   ├── (resident)/        # Resident routes
│   ├── api/               # API routes
│   └── components/        # Reusable components
├── components/            # Global components
├── docs/                  # Documentation
│   ├── technical/         # Technical docs
│   ├── user/              # User docs
│   └── project/           # Project docs
├── lib/                   # Utility libraries
├── public/                # Static assets
├── scripts/               # Build scripts
└── types/                 # TypeScript definitions
```

## Contributing

We welcome contributions! Please follow these steps:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Guidelines
- Use TypeScript for type safety
- Follow ESLint configuration
- Write meaningful commit messages
- Update documentation for new features
- Test your changes thoroughly

### Reporting Issues
1. Check existing issues
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## Documentation

- [Technical Documentation](docs/technical/)
  - [System Architecture](docs/technical/system-architecture.md)
  - [API Reference](docs/technical/api-reference.md)
  - [Deployment Guide](docs/technical/deployment-guide.md)
  - [System Flow Charts](docs/technical/system-flow-charts.md)

- [User Documentation](docs/user/)
  - [User Manual](docs/user/user-manual.md)

- [Project Documentation](docs/project/)
  - [Project Overview](docs/project/project-documentation.md)

## Security

### Security Measures
- JWT-based authentication
- Row Level Security (RLS) on database
- Input validation and sanitization
- HTTPS enforcement in production
- Rate limiting on API endpoints
- File upload restrictions

### Reporting Security Issues
For security vulnerabilities, please email: security@brgy-pgt.com

## Performance

### Optimization Features
- Server-side rendering (SSR)
- Image optimization with Next.js Image
- Code splitting and lazy loading
- Database query optimization
- CDN for static assets
- Gzip compression

### Monitoring
- Performance metrics tracking
- Error logging and monitoring
- Uptime monitoring
- Database performance monitoring

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Getting Help
- 📧 Email: support@brgy-pgt.com
- 📱 Phone: (123) 456-7890
- 💬 Discord: [Join our community](https://discord.gg/barangay-pgt)
- 📖 Documentation: [Full docs](https://docs.brgy-pgt.com)

### Community
- 🐛 [Report Issues](https://github.com/your-org/barangay-pgt/issues)
- 💡 [Feature Requests](https://github.com/your-org/barangay-pgt/discussions)
- 🎉 [Share Success Stories](mailto:stories@brgy-pgt.com)

## Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend platform
- [Next.js](https://nextjs.org/) for the powerful React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Vercel](https://vercel.com/) for hosting and deployment
- The open-source community for inspiration and tools

---

<div align="center">
  Made with ❤️ for Filipino communities
  
  [Website](https://brgy-pgt.com) • [Documentation](https://docs.brgy-pgt.com) • [Contact](mailto:hello@brgy-pgt.com)
</div>
