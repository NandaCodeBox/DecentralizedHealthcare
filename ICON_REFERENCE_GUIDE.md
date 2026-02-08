# Healthcare OS - Icon Reference Guide

## Quick Icon Reference for Developers

### Primary User Actions
```
Report Symptoms      → 📝 DocumentTextIcon
Emergency Alert      → 🚨 BellAlertIcon  
My Episodes          → 📋 ClipboardDocumentListIcon
Find Providers       → 🏥 MapPinIcon
My Profile           → 👤 UserIcon
Settings             → ⚙️ Cog6ToothIcon
Help & Support       → ❓ QuestionMarkCircleIcon
```

### Feature Icons (24 Features)
```
1.  Voice Input           → 🎤
2.  Secure & Private      → 🔒
3.  Real-time Matching    → ⚡
4.  Care History          → 📋
5.  Smart Escalation      → 🚨
6.  Global Access         → 🌍
7.  Mobile First          → 📱
8.  Chat Support          → 💬
9.  Analytics             → 📊
10. Smart Alerts          → 🔔
11. Hospital Network      → 🏥
12. Easy Payments         → 💳
13. Health Education      → 🎓
14. Family Profiles       → 👥
15. Appointment Booking   → 📅
16. Verified Ratings      → 🏆
17. Follow-up Care        → 🔄
18. Night Mode            → 🌙
19. Biometric Login       → 🔐
20. 24/7 Support          → 📞
21. Personalized Care     → 🎯
22. Fast Performance      → 🚀
23. Multi-language        → 🌐
24. Premium Features      → ✨
```

### Status Indicators
```
Active       → 🕐 (Blue)
Completed    → ✅ (Green)
Escalated    → ⚠️ (Orange)
Emergency    → 🚨 (Red)
```

### Urgency Levels
```
Emergency    → 🚨 (Red)
Urgent       → ⚠️ (Orange)
Routine      → 📋 (Blue)
Self-care    → 💊 (Green)
```

### Navigation
```
Home         → 🏠
Back         → ←
Next         → →
Menu         → ☰
Search       → 🔍
Filter       → ⚙️
Download     → ⬇️
Share        → 📤
Edit         → ✏️
Delete       → 🗑️
Close        → ✕
Refresh      → 🔄
```

### Health-Related
```
Heart/Health     → ❤️
Medicine         → 💊
Thermometer      → 🌡️
Stethoscope      → 🩺
Ambulance        → 🚑
Doctor           → 👨‍⚕️
Nurse            → 👩‍⚕️
Hospital         → 🏥
Prescription     → 📋
Lab Report       → 📊
```

### Communication
```
Phone Call       → 📞
Message/Chat     → 💬
Email            → 📧
Video Call       → 📹
Notification     → 🔔
Mute             → 🔕
```

### Location & Time
```
Location         → 📍
Distance         → 🗺️
Clock/Time       → ⏰
Calendar/Date    → 📅
Time Zone        → 🌍
```

### Security & Privacy
```
Lock             → 🔒
Unlock           → 🔓
Key              → 🔑
Shield           → 🛡️
Eye (visible)    → 👁️
Eye (hidden)     → 👁️‍🗨️
```

### Connectivity
```
Online           → 🟢
Offline          → ⚫
WiFi             → 📡
Signal           → 📶
Battery          → 🔋
```

### Actions
```
Add              → ➕
Remove           → ➖
Save             → 💾
Cancel           → ❌
Confirm          → ✅
Loading          → ⏳
Success          → ✨
Error            → ⚠️
```

### Ratings & Feedback
```
Star (Full)      → ⭐
Star (Empty)     → ☆
Thumbs Up        → 👍
Thumbs Down      → 👎
Heart (Filled)   → ❤️
Heart (Empty)    → 🤍
```

---

## Icon Size Guidelines

### Mobile
- Navigation: 24px (h-6 w-6)
- Buttons: 20px (h-5 w-5)
- Cards: 32px (h-8 w-8)

### Desktop
- Navigation: 24px (h-6 w-6)
- Buttons: 20px (h-5 w-5)
- Cards: 32px (h-8 w-8)
- Hero: 40px (h-10 w-10)
- Large: 48px (h-12 w-12)

---

## Color Mapping

### Primary Colors
- Blue (#3B82F6) - Main actions, primary features
- Red (#EF4444) - Emergency, urgent
- Green (#10B981) - Success, completed
- Orange (#F59E0B) - Warning, escalated
- Purple (#8B5CF6) - Secondary actions
- Gray (#6B7280) - Neutral, disabled

### Usage
```typescript
// Blue for primary
<DocumentTextIcon className="h-6 w-6 text-blue-600" />

// Red for emergency
<BellAlertIcon className="h-6 w-6 text-red-600" />

// Green for success
<CheckCircleIcon className="h-6 w-6 text-green-600" />

// Orange for warning
<ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
```

---

## Heroicons Import Reference

```typescript
// Primary Actions
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/outline';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Status & Indicators
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ClockIcon } from '@heroicons/react/24/outline';

// Features
import { SparklesIcon } from '@heroicons/react/24/outline';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { WifiIcon } from '@heroicons/react/24/outline';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

// Navigation
import { HomeIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ShareIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Communication
import { PhoneIcon } from '@heroicons/react/24/outline';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

// Health
import { HeartIcon } from '@heroicons/react/24/outline';
import { ChartBarIcon } from '@heroicons/react/24/outline';
```

---

## Component Usage Examples

### Feature Card with Icon
```typescript
<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
  <DocumentTextIcon className="h-8 w-8 text-blue-600 mb-2" />
  <h3 className="font-semibold text-gray-900">Report Symptoms</h3>
  <p className="text-sm text-gray-600">Describe your health concern</p>
</div>
```

### Status Badge with Icon
```typescript
<div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
  <CheckCircleIcon className="h-4 w-4 text-green-600" />
  <span className="text-sm text-green-700">Completed</span>
</div>
```

### Button with Icon
```typescript
<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
  <DocumentTextIcon className="h-5 w-5" />
  Report Symptoms
</button>
```

### Navigation Item with Icon
```typescript
<Link href="/symptom-intake" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
  <DocumentTextIcon className="h-6 w-6 text-gray-600" />
  <span>Report Symptoms</span>
</Link>
```

---

## Accessibility Best Practices

### Always Include Alt Text
```typescript
<DocumentTextIcon 
  className="h-6 w-6" 
  aria-label="Report symptoms"
/>
```

### Use Semantic HTML
```typescript
<button aria-label="Close dialog">
  <XMarkIcon className="h-6 w-6" />
</button>
```

### Pair with Text Labels
```typescript
<div className="flex items-center gap-2">
  <CheckCircleIcon className="h-5 w-5 text-green-600" />
  <span>Successfully completed</span>
</div>
```

### Ensure Color Contrast
```typescript
// Good contrast
<DocumentTextIcon className="h-6 w-6 text-blue-600" />

// Avoid low contrast
<DocumentTextIcon className="h-6 w-6 text-gray-300" />
```

---

## Testing Checklist

- [ ] Icons render correctly on mobile
- [ ] Icons render correctly on desktop
- [ ] Icons have proper color contrast
- [ ] Icons have alt text for screen readers
- [ ] Icons are paired with text labels
- [ ] Icons are consistent across the app
- [ ] Icons scale properly on different devices
- [ ] Icons are accessible with keyboard navigation

---

## Future Enhancements

Consider adding custom SVG icons for:
- Healthcare-specific symbols
- Branded icons
- Animated icons for loading states
- Icon variations (filled, outline, solid)

