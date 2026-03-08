import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  PhoneIcon,
  HomeIcon,
  SparklesIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { useStaticTranslation } from '@/hooks/useStaticTranslation';
import { translateInputToEnglish } from '@/utils/inputTranslation';

const ProviderSearch: React.FC = () => {
  const { t, currentLanguage } = useStaticTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedDistance, setSelectedDistance] = useState('10');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);

  const handleAiSearch = async () => {
    setIsAiSearching(true);
    
    try {
      // Translate search query to English if needed
      const englishQuery = await translateInputToEnglish(searchQuery, currentLanguage);
      
      // Store translated query for backend processing
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('providerSearchQuery', JSON.stringify({
          originalQuery: searchQuery,
          englishQuery,
          language: currentLanguage
        }));
      }
      
      // Simulate AI processing with translated query
      setTimeout(() => {
        setIsAiSearching(false);
        const lowerQuery = englishQuery.toLowerCase();
        
        let suggestions: string[] = [];
        let filtered: any[] = [];
        
        if (lowerQuery.includes('fever') || lowerQuery.includes('headache') || lowerQuery.includes('general')) {
          suggestions = ['General Practitioner', 'Internal Medicine', 'Infectious Disease'];
          filtered = providers.filter(p => p.specialty === 'General Practitioner');
        } else if (lowerQuery.includes('heart') || lowerQuery.includes('chest') || lowerQuery.includes('cardio')) {
          suggestions = ['Cardiologist', 'Emergency Medicine', 'Internal Medicine'];
          filtered = providers.filter(p => p.specialty === 'Cardiologist');
        } else if (lowerQuery.includes('child') || lowerQuery.includes('pediatric') || lowerQuery.includes('kid')) {
          suggestions = ['Pediatrician', 'Family Medicine'];
          filtered = providers.filter(p => p.specialty === 'Pediatrician');
        } else if (lowerQuery.includes('bone') || lowerQuery.includes('joint') || lowerQuery.includes('orthopedic')) {
          suggestions = ['Orthopedic Surgeon', 'Physical Therapy'];
          filtered = providers.filter(p => p.specialty === 'Orthopedic Surgeon');
        } else {
          suggestions = ['General Practitioner', 'Family Medicine'];
          filtered = providers;
        }
        
        setAiSuggestions(suggestions);
        setFilteredProviders(filtered);
      }, 1000);
    } catch (error) {
      console.error('Translation error:', error);
      setIsAiSearching(false);
      // Continue with original query if translation fails
      setAiSuggestions(['General Practitioner', 'Family Medicine']);
      setFilteredProviders(providers);
    }
  };

  const providers = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'General Practitioner',
      rating: 4.8,
      reviews: 234,
      distance: '2.3 km',
      availability: 'Available Today',
      nextSlot: '2:30 PM',
      hospital: 'City General Hospital',
      experience: '15 years',
      languages: ['English', 'Hindi'],
      acceptingNew: true,
      aiMatch: 95,
      aiReason: 'Best match for general symptoms and immediate availability'
    },
    {
      id: 2,
      name: 'Dr. Rajesh Kumar',
      specialty: 'Cardiologist',
      rating: 4.9,
      reviews: 456,
      distance: '3.5 km',
      availability: 'Tomorrow',
      nextSlot: '10:00 AM',
      hospital: 'Heart Care Center',
      experience: '20 years',
      languages: ['English', 'Hindi', 'Tamil'],
      acceptingNew: true,
      aiMatch: 88,
      aiReason: 'Highly rated specialist with extensive experience'
    },
    {
      id: 3,
      name: 'Dr. Priya Sharma',
      specialty: 'Pediatrician',
      rating: 4.7,
      reviews: 189,
      distance: '1.8 km',
      availability: 'Available Today',
      nextSlot: '4:00 PM',
      hospital: 'Children\'s Clinic',
      experience: '12 years',
      languages: ['English', 'Hindi'],
      acceptingNew: true,
      aiMatch: 92,
      aiReason: 'Closest location with same-day availability'
    },
    {
      id: 4,
      name: 'Dr. Michael Chen',
      specialty: 'Orthopedic Surgeon',
      rating: 4.6,
      reviews: 312,
      distance: '5.2 km',
      availability: 'Next Week',
      nextSlot: 'Mon 9:00 AM',
      hospital: 'Bone & Joint Institute',
      experience: '18 years',
      languages: ['English', 'Mandarin'],
      acceptingNew: false,
      aiMatch: 78,
      aiReason: 'Specialized expertise for complex cases'
    }
  ];

  const specialties = [
    'All Specialties',
    'General Practitioner',
    'Cardiologist',
    'Pediatrician',
    'Orthopedic Surgeon',
    'Dermatologist',
    'Neurologist'
  ];

  return (
    <>
      <Head>
        <title>AI Provider Search - Arogya.ai</title>
        <meta name="description" content="AI-powered semantic search for healthcare providers" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="w-full bg-gray-50 min-h-screen pb-24 lg:pb-12">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-full">
                <HomeIcon className="h-6 w-6 text-gray-600" />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Provider Search</h1>
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs sm:text-sm text-gray-500">Semantic search powered by AI</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-purple-900">AI Active</span>
              </div>
            </div>

            {/* AI Search Bar */}
            <div className="relative mb-4">
              <div className="relative">
                <SparklesIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500 animate-pulse" />
                <input
                  id="provider-search-input"
                  data-testid="provider-search-input"
                  type="text"
                  placeholder="Describe your symptoms or what you need... (e.g., 'fever and headache for 3 days')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
                  className="w-full pl-10 pr-24 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  aria-label="Provider search input"
                />
                <button
                  onClick={handleAiSearch}
                  disabled={isAiSearching || !searchQuery}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isAiSearching ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      {t('ai_search')}
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-1">
                <span className="text-xs text-gray-500">💡 Try:</span>
                <button
                  onClick={() => setSearchQuery("I have chest pain and shortness of breath")}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  "chest pain and shortness of breath"
                </button>
                <span className="text-xs text-gray-400">or</span>
                <button
                  onClick={() => setSearchQuery("need a pediatrician for my child")}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  "pediatrician for my child"
                </button>
              </div>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg animate-fadeIn">
                <div className="flex items-center gap-2 mb-3">
                  <LightBulbIcon className="h-5 w-5 text-purple-600 animate-bounce" />
                  <span className="text-sm font-bold text-purple-900">AI Recommendations</span>
                  <span className="ml-auto px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                    ✨ Powered by AI
                  </span>
                </div>
                <p className="text-xs text-purple-700 mb-2">Based on your symptoms, we recommend these specialties:</p>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSpecialty(suggestion.toLowerCase().replace(/ /g, '_'))}
                      className="px-3 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                    >
                      <span className="mr-1">🎯</span>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {specialties.map((specialty, index) => (
                  <option key={index} value={specialty.toLowerCase().replace(/ /g, '_')}>
                    {specialty}
                  </option>
                ))}
              </select>

              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="20">Within 20 km</option>
                <option value="50">Within 50 km</option>
              </select>

              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <FunnelIcon className="h-4 w-4" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredProviders.length > 0 ? filteredProviders.length : providers.length} providers found
              {filteredProviders.length > 0 && filteredProviders.length < providers.length && (
                <span className="ml-2 text-purple-600 font-semibold">(filtered by AI)</span>
              )}
            </p>
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-300 rounded-full">
              <SparklesIcon className="h-4 w-4 text-purple-600 animate-pulse" />
              <span className="text-xs font-bold text-purple-900">Sorted by AI relevance</span>
            </div>
          </div>

          <div className="space-y-4">
            {(filteredProviders.length > 0 ? filteredProviders : providers).map((provider) => (
              <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* Provider Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
                      {provider.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                  </div>

                  {/* Provider Info */}
                  <div className="flex-1 flex flex-col">
                    {/* Name on first line */}
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{provider.name}</h3>
                    
                    {/* Specialty on second line */}
                    <p className="text-sm text-gray-600 mt-1">{provider.specialty}</p>
                    
                    {/* Badges on third line */}
                    <div className="flex items-center gap-2 mt-2 mb-3">
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded">
                        <SparklesIcon className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-bold text-purple-900">{provider.aiMatch}% Match</span>
                      </div>
                      {provider.acceptingNew && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          Accepting New
                        </span>
                      )}
                    </div>

                    {/* AI Reasoning */}
                    <div className="mb-3 p-2 bg-purple-50 border-l-2 border-purple-400 rounded">
                      <p className="text-xs text-purple-800">
                        <span className="font-semibold">AI Insight:</span> {provider.aiReason}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{provider.rating}</span>
                        <span>({provider.reviews})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{provider.distance}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{provider.availability}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600">{provider.hospital}</p>
                      <p className="text-xs text-gray-500">{provider.experience} experience • {provider.languages.join(', ')}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => {
                          setSelectedProvider(provider);
                          setShowBookingModal(true);
                        }}
                        data-testid={`book-appointment-provider-${provider.id}`}
                        className="flex-1 sm:flex-none px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        {t('book_appointment')}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedProvider(provider);
                          setShowDetailsModal(true);
                        }}
                        data-testid={`view-profile-provider-${provider.id}`}
                        className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t('view_profile')}
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <PhoneIcon className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>

                    {provider.nextSlot && (
                      <div className="mt-3 p-2 bg-teal-50 rounded text-sm">
                        <span className="text-teal-700">Next available: </span>
                        <span className="font-semibold text-teal-900">{provider.nextSlot}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Modal */}
        {showBookingModal && selectedProvider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Book Appointment</h3>
                <button 
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-teal-50 rounded-lg">
                <p className="font-semibold text-teal-900">{selectedProvider.name}</p>
                <p className="text-sm text-teal-700">{selectedProvider.specialty} • {selectedProvider.hospital}</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                alert(`Appointment booked with ${selectedProvider.name}! You will receive a confirmation email.`);
                setShowBookingModal(false);
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Time
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select time</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Visit
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Brief description of your symptoms..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700"
                  >
                    {t('confirm_booking')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Provider Details Modal */}
        {showDetailsModal && selectedProvider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Provider Profile</h3>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {selectedProvider.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{selectedProvider.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{selectedProvider.specialty}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-900 text-xs font-bold rounded">
                        {selectedProvider.aiMatch}% AI Match
                      </span>
                      {selectedProvider.acceptingNew && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                          Accepting New Patients
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Experience</p>
                    <p className="font-semibold text-gray-900">{selectedProvider.experience}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Rating</p>
                    <p className="font-semibold text-gray-900">⭐ {selectedProvider.rating} ({selectedProvider.reviews} reviews)</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <p className="font-semibold text-gray-900">📍 {selectedProvider.distance}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Availability</p>
                    <p className="font-semibold text-gray-900">⏰ {selectedProvider.availability}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Hospital/Clinic</h5>
                  <p className="text-gray-700">{selectedProvider.hospital}</p>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Languages</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.languages.map((lang: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border-l-4 border-purple-400 rounded">
                  <p className="text-sm font-semibold text-purple-900 mb-1">AI Recommendation</p>
                  <p className="text-sm text-purple-800">{selectedProvider.aiReason}</p>
                </div>

                {selectedProvider.nextSlot && (
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <p className="text-sm text-teal-700">
                      <span className="font-semibold">Next available:</span> {selectedProvider.nextSlot}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowBookingModal(true);
                    }}
                    className="flex-1 px-4 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700"
                  >
                    {t('book_appointment')}
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProviderSearch;
