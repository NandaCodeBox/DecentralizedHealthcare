import React, { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from './Navigation';
import OfflineIndicator from './OfflineIndicator';
import LanguageSelector from './LanguageSelector';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNavigation = true }) => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              {showNavigation && (
                <button
                  type="button"
                  className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <span className="sr-only">Open main menu</span>
                  {mobileMenuOpen ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              )}
              
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 ml-2 md:ml-0">
                Healthcare OS
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <OfflineIndicator />
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {showNavigation && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                type="button"
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <Navigation onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex">
        {/* Desktop Navigation */}
        {showNavigation && (
          <aside className="hidden md:block w-64 bg-white shadow-sm min-h-screen">
            <Navigation />
          </aside>
        )}
        
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 safe-bottom">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;