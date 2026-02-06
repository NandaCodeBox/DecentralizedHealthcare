import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface NavigationProps {
  onItemClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onItemClick }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const navigationItems = [
    {
      name: t('navigation.home'),
      href: '/',
      icon: HomeIcon,
    },
    {
      name: t('navigation.symptomIntake'),
      href: '/symptom-intake',
      icon: DocumentTextIcon,
    },
    {
      name: t('navigation.episodes'),
      href: '/episodes',
      icon: ClipboardDocumentListIcon,
    },
    {
      name: t('navigation.profile'),
      href: '/profile',
      icon: UserIcon,
    },
    {
      name: t('navigation.settings'),
      href: '/settings',
      icon: Cog6ToothIcon,
    },
    {
      name: t('navigation.help'),
      href: '/help',
      icon: QuestionMarkCircleIcon,
    },
  ];

  return (
    <nav className="mt-8">
      <div className="px-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={onItemClick}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;