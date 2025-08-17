import React, { useState, useEffect } from 'react';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
}

interface SearchBarProps {
  onLocationSelect: (lat: number, lon: number, name: string) => void;
}

export default function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Search with Nominatim API (limited to Philippines)
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search result selection
  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    onLocationSelect(lat, lon, result.display_name);
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
  };

  return (
    <div className="absolute top-4 right-0 w-48 sm:w-64 md:w-80 z-10 px-2 sm:px-4">
      <div className="relative">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full px-3 py-2 pl-8 pr-3 bg-white rounded-lg shadow-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          onFocus={() => {
            if (searchResults.length > 0) setShowSearchResults(true);
          }}
          onBlur={() => {
            // Delay hiding results to allow for clicks
            setTimeout(() => setShowSearchResults(false), 150);
          }}
        />
        
        <div className="absolute left-2 top-2.5 flex items-center">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          ) : (
            <i className="ri-search-line text-gray-400"></i>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="text-sm text-gray-800 font-medium truncate">
                  {result.display_name.split(',')[0]}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}