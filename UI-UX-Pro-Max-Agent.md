# UI/UX Pro Max Agent Guide

> **Barangay PGT Project Design Intelligence Framework**  
> Based on UI/UX Pro Max v2.0 methodology for professional UI/UX design

## 🎯 Project Context
- **Product Type**: Government/Barangay Digital Platform
- **Target Users**: Residents, Barangay Officials, Admin Staff
- **Platform**: Next.js + React + Tailwind CSS
- **Primary Goals**: Community engagement, service delivery, information dissemination

## 🎨 Design System for Barangay PGT

### Core Design Principles
1. **Accessibility First**: WCAG 2.1 AA compliance for all government services
2. **Trust & Authority**: Professional, clean design that builds confidence
3. **Community Focus**: Warm, inclusive, and approachable interface
4. **Mobile-First**: Responsive design optimized for smartphones
5. **Clear Information Hierarchy**: Easy navigation for all age groups

### Recommended UI Styles
1. **Clean Minimalism** (Primary): Professional government aesthetic
2. **Material Design** (Secondary): Familiar patterns for users
3. **Dark Mode Support**: Accessibility and user preference

### Color Palette - Government/Community Theme
```css
:root {
  /* Primary - Trust & Authority */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6; /* Blue - Trust, stability */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  /* Secondary - Community & Growth */
  --secondary-50: #f0fdf4;
  --secondary-100: #dcfce7;
  --secondary-500: #22c55e; /* Green - Community, growth */
  --secondary-600: #16a34a;
  
  /* Neutral - Professional */
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-500: #64748b;
  --gray-900: #0f172a;
  
  /* Status Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Typography System
```css
/* Font Imports */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Public+Sans:wght@400;500;600;700&display=swap');

/* Typography Scale */
:root {
  --font-primary: 'Inter', sans-serif; /* Modern, readable */
  --font-secondary: 'Public Sans', sans-serif; /* Government-friendly */
  
  --text-xs: 0.75rem;    /* 12px - Labels, captions */
  --text-sm: 0.875rem;   /* 14px - Body text */
  --text-base: 1rem;     /* 16px - Default */
  --text-lg: 1.125rem;   /* 18px - Subheadings */
  --text-xl: 1.25rem;    /* 20px - Section titles */
  --text-2xl: 1.5rem;    /* 24px - Page titles */
  --text-3xl: 1.875rem;  /* 30px - Hero titles */
}
```

## 🏗️ Component Design Guidelines

### 🎨 shadcn/ui Integration
**All components should use shadcn/ui as the foundation** with custom theming for Barangay PGT.

#### Installing Required shadcn/ui Components
```bash
npx shadcn-ui@latest add button card input label textarea select checkbox radio-group switch badge alert avatar dialog sheet navigation-menu dropdown-menu
```

#### Custom shadcn/ui Theme Configuration
```json
// tailwind.config.js - Custom colors for shadcn
{
  "cssVariables": {
    "colors": {
      "border": "hsl(var(--border))",
      "input": "hsl(var(--input))",
      "ring": "hsl(var(--ring))",
      "background": "hsl(var(--background))",
      "foreground": "hsl(var(--foreground))",
      "primary": {
        "DEFAULT": "hsl(var(--primary))",
        "foreground": "hsl(var(--primary-foreground))"
      },
      "secondary": {
        "DEFAULT": "hsl(var(--secondary))",
        "foreground": "hsl(var(--secondary-foreground))"
      },
      "destructive": {
        "DEFAULT": "hsl(var(--destructive))",
        "foreground": "hsl(var(--destructive-foreground))"
      },
      "muted": {
        "DEFAULT": "hsl(var(--muted))",
        "foreground": "hsl(var(--muted-foreground))"
      },
      "accent": {
        "DEFAULT": "hsl(var(--accent))",
        "foreground": "hsl(var(--accent-foreground))"
      },
      "popover": {
        "DEFAULT": "hsl(var(--popover))",
        "foreground": "hsl(var(--popover-foreground))"
      },
      "card": {
        "DEFAULT": "hsl(var(--card))",
        "foreground": "hsl(var(--card-foreground))"
      }
    }
  }
}
```

#### Custom CSS Variables (globals.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%; /* Blue 500 - Trust */
  --primary-foreground: 210 40% 98%;
  --secondary: 142.1 76.2% 36.3%; /* Green 500 - Community */
  --secondary-foreground: 355.7 100% 97.3%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 142.1 70.6% 45.3%;
  --secondary-foreground: 144.9 80.4% 10%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 94.1%;
}
```

### 1. Navigation Components (shadcn/ui Based)
- **Top Navigation**: Use `NavigationMenu` from shadcn/ui
- **Bottom Navigation**: Custom mobile nav with shadcn/ui `Button` components
- **Breadcrumb**: Custom component using shadcn/ui styling patterns
- **Search Bar**: Use shadcn/ui `Input` with custom styling

### 2. Card Components (shadcn/ui)
```jsx
// Using shadcn/ui Card component
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="text-lg">Card Title</CardTitle>
        <CardDescription>Description text</CardDescription>
      </div>
      <div className="ml-4">
        {/* Icon or action */}
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    {/* Card footer actions */}
  </CardFooter>
</Card>
```

### 3. Form Components (shadcn/ui Based)
```jsx
// Using shadcn/ui form components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Form Pattern
<div className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="field-name">Field Label</Label>
    <Input id="field-name" placeholder="Enter value" />
    <p className="text-sm text-muted-foreground">Helper text</p>
  </div>
  
  <div className="space-y-2">
    <Label>Message</Label>
    <Textarea placeholder="Type your message here" />
  </div>
  
  <div className="space-y-2">
    <Label>Select Option</Label>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Choose an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <Button type="submit" className="w-full">Submit</Button>
</div>
```

### 4. Status & Feedback (shadcn/ui Based)
```jsx
// Using shadcn/ui Alert component
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// Success Alert
<Alert className="border-green-200 bg-green-50">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-800">Success</AlertTitle>
  <AlertDescription className="text-green-700">
    Your action was completed successfully.
  </AlertDescription>
</Alert>

// Error Alert
<Alert className="border-red-200 bg-red-50">
  <AlertCircle className="h-4 w-4 text-red-600" />
  <AlertTitle className="text-red-800">Error</AlertTitle>
  <AlertDescription className="text-red-700">
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>

// Status Badge
<Badge variant="secondary" className="bg-green-100 text-green-800">
  <CheckCircle className="w-3 h-3 mr-1" />
  Active
</Badge>
```

## 📱 Mobile-First Design Rules

### Breakpoint System
```css
/* Mobile First Approach */
.component {
  /* Base styles for mobile (320px+) */
  padding: 1rem;
}

@media (min-width: 640px) { /* sm */
  .component { padding: 1.5rem; }
}

@media (min-width: 768px) { /* md */
  .component { padding: 2rem; }
}

@media (min-width: 1024px) { /* lg */
  .component { padding: 2.5rem; }
}
```

### Touch-Friendly Interactions
- **Minimum Tap Target**: 44px × 44px
- **Spacing**: 8px minimum between interactive elements
- **Gesture Support**: Swipe, pull-to-refresh where appropriate

## 🎯 User Experience Guidelines

### 1. Information Architecture
```
Home/
├── Feed (Community Updates)
├── Services (Barangay Services)
├── Events (Community Events)
├── Alerts (Notifications)
├── Profile (User Account)
└── Admin (Barangay Officials)
```

### 2. User Flows
- **Resident Onboarding**: Simple 3-step process
- **Service Request**: Clear progress, minimal steps
- **Event Registration**: One-tap registration
- **Emergency Reporting**: Quick access, clear categories

### 3. Content Guidelines
- **Language**: Bilingual (English/Tagalog) support
- **Readability**: Simple language, short sentences
- **Visuals**: Real community photos, diverse representation
- **Updates**: Timestamps, clear status indicators

## 🚫 Anti-Patterns to Avoid

### Government Platform Anti-Patterns
1. **❌ Overly Complex Navigation**: Keep it simple, max 5 main sections
2. **❌ Jargon & Acronyms**: Use plain language residents understand
3. **❌ Inconsistent Styling**: Maintain uniform design system
4. **❌ Poor Mobile Experience**: Test extensively on phones
5. **❌ Hidden Information**: Make important info visible without clicking
6. **❌ Slow Loading**: Optimize images, use lazy loading
7. **❌ No Accessibility**: Ensure screen reader compatibility

### Color Anti-Patterns
- **Avoid**: Bright reds ( alarming), neon colors (unprofessional)
- **Avoid**: Dark text on dark backgrounds (accessibility issue)
- **Avoid**: Too many colors (confusing, unprofessional)

## ✅ Pre-Delivery Checklist

### Design Validation
- [ ] Color contrast meets WCAG AA standards (4.5:1 minimum)
- [ ] All interactive elements have 44px+ touch targets
- [ ] Typography is readable at all sizes
- [ ] Loading states are implemented for async operations
- [ ] Error states provide helpful guidance
- [ ] Empty states guide users to next actions

### Mobile Testing
- [ ] Layout works on 320px width devices
- [ ] Touch gestures work smoothly
- [ ] No horizontal scrolling on mobile
- [ ] Form inputs are keyboard-friendly
- [ ] Images optimize for mobile bandwidth

### Accessibility
- [ ] Semantic HTML5 elements used correctly
- [ ] ARIA labels for custom components
- [ ] Keyboard navigation works for all features
- [ ] Screen reader compatibility tested
- [ ] Focus indicators are visible

## 🎨 Specific Component Patterns for Barangay PGT (shadcn/ui Based)

### 1. Service Card
```jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"

<Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary">
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="text-base">Service Name</CardTitle>
        <CardDescription className="text-sm">Brief description</CardDescription>
      </div>
      <Badge variant="secondary" className="ml-2">
        <ServiceIcon className="w-3 h-3 mr-1" />
        Service
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="pt-0">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Additional details</p>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </CardContent>
</Card>
```

### 2. Alert Banner (shadcn/ui Alert)
```jsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

<Alert className="border-l-4 border-l-primary bg-primary/5">
  <Info className="h-4 w-4" />
  <AlertTitle className="text-primary">Important Notice</AlertTitle>
  <AlertDescription>
    Alert message content for barangay announcements and updates.
  </AlertDescription>
</Alert>

// Success variant
<Alert className="border-l-4 border-l-green-600 bg-green-50">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-800">Success</AlertTitle>
  <AlertDescription className="text-green-700">
    Action completed successfully.
  </AlertDescription>
</Alert>
```

### 3. Status Badge (shadcn/ui Badge)
```jsx
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle } from "lucide-react"

// Active Status
<Badge className="bg-green-100 text-green-800 hover:bg-green-200">
  <CheckCircle className="w-3 h-3 mr-1" />
  Active
</Badge>

// Pending Status
<Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
  <Clock className="w-3 h-3 mr-1" />
  Pending
</Badge>

// Urgent Status
<Badge variant="destructive">
  <AlertTriangle className="w-3 h-3 mr-1" />
  Urgent
</Badge>
```

### 4. Button Patterns (shadcn/ui Button)
```jsx
import { Button } from "@/components/ui/button"
import { Plus, Download, Share } from "lucide-react"

// Primary Action
<Button className="bg-primary hover:bg-primary/90">
  <Plus className="w-4 h-4 mr-2" />
  Add New
</Button>

// Secondary Action
<Button variant="outline">
  <Download className="w-4 h-4 mr-2" />
  Download
</Button>

// Ghost/Link Action
<Button variant="ghost" size="sm">
  <Share className="w-4 h-4 mr-2" />
  Share
</Button>
```

### 5. Navigation Pattern (Mobile-First)
```jsx
import { Button } from "@/components/ui/button"
import { Home, Calendar, Bell, User, Menu } from "lucide-react"

// Bottom Navigation (Mobile)
<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border md:hidden">
  <div className="grid grid-cols-4 gap-1 p-2">
    <Button variant="ghost" size="sm" className="flex flex-col h-16">
      <Home className="w-5 h-5" />
      <span className="text-xs mt-1">Home</span>
    </Button>
    <Button variant="ghost" size="sm" className="flex flex-col h-16">
      <Calendar className="w-5 h-5" />
      <span className="text-xs mt-1">Events</span>
    </Button>
    <Button variant="ghost" size="sm" className="flex flex-col h-16">
      <Bell className="w-5 h-5" />
      <span className="text-xs mt-1">Alerts</span>
    </Button>
    <Button variant="ghost" size="sm" className="flex flex-col h-16">
      <User className="w-5 h-5" />
      <span className="text-xs mt-1">Profile</span>
    </Button>
  </div>
</div>
```

## 🔄 Design System Maintenance

### Regular Reviews
- **Monthly**: User feedback analysis and design tweaks
- **Quarterly**: Component library updates and optimizations
- **Annually**: Complete design system audit and refresh

### Documentation Updates
- Keep this guide updated with any design decisions
- Document new components and patterns
- Maintain accessibility audit results
- Track user feedback and implemented changes

---

## 🚀 Implementation Notes

This UI/UX Pro Max Agent Guide should be referenced for all new features, components, and design decisions in the Barangay PGT project. Always prioritize user needs, accessibility, and maintainability.

**Key Philosophy**: "Design for the community, with the community" - Every design decision should serve the residents of Barangay Pagatpatan.
