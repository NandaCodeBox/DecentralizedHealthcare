# Healthcare OS - Progressive Web App

A Progressive Web App (PWA) for the AI-enabled decentralized care orchestration system, designed specifically for India's healthcare network.

## Features

- **Progressive Web App**: Installable, offline-capable, and responsive
- **Multilingual Support**: Hindi and English with easy extensibility
- **Offline Functionality**: Works without internet connection and syncs when online
- **Responsive Design**: Optimized for mobile and desktop devices
- **Symptom Intake**: Comprehensive form for reporting symptoms
- **Care Episode Tracking**: Monitor your healthcare journey
- **Provider Discovery**: Find appropriate healthcare providers
- **Low Bandwidth Optimization**: Designed for poor connectivity scenarios

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **PWA**: next-pwa with Workbox
- **Internationalization**: react-i18next
- **Forms**: react-hook-form
- **HTTP Client**: Axios
- **Icons**: Heroicons
- **UI Components**: Headless UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Update the environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## PWA Features

### Service Worker
The app includes a service worker that:
- Caches static assets for offline use
- Implements network-first strategy for API calls
- Provides fallback pages when offline

### Offline Functionality
- Symptom intake forms are saved locally when offline
- Data automatically syncs when connection is restored
- Cached data is available for viewing offline
- Visual indicators show online/offline status

### Installation
Users can install the app on their devices:
- **Mobile**: "Add to Home Screen" prompt
- **Desktop**: Install button in browser address bar

## Internationalization

The app supports multiple languages:
- **English** (default)
- **Hindi** (हिन्दी)

### Adding New Languages

1. Create a new translation file in `src/i18n/locales/[language-code].json`
2. Add the language to the `languages` array in `src/components/Layout/LanguageSelector.tsx`
3. Update the i18n configuration in `src/i18n/index.ts`

## API Integration

The app integrates with the backend Lambda functions through:
- **Symptom Intake**: POST `/api/symptom-intake`
- **Episodes**: GET `/api/episodes`
- **Providers**: POST `/api/providers/search`
- **Profile**: GET/PUT `/api/profile`

## Offline Storage

The app uses localStorage for:
- Offline data queue
- User preferences
- Cached API responses
- Language settings

## Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Preloaded Google Fonts
- **Bundle Analysis**: Built-in bundle analyzer
- **Caching**: Aggressive caching strategies for static assets

## Accessibility

- **WCAG 2.1 AA Compliance**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper heading structure and labels
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user's motion preferences

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **PWA Features**: Supported in all modern browsers

## Security

- **Content Security Policy**: Configured for production
- **HTTPS Only**: Required for PWA features
- **Data Validation**: Client-side and server-side validation
- **Secure Storage**: Sensitive data encrypted in localStorage

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### AWS Amplify
1. Connect your repository to AWS Amplify
2. Set build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Configure environment variables

### Docker
```bash
docker build -t healthcare-pwa .
docker run -p 3000:3000 healthcare-pwa
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.