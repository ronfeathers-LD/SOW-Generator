'use client';

import { useState, useEffect, useRef } from 'react';
import { SlackUser } from '@/lib/slack-user-lookup';

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (user: SlackUser) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export default function MentionAutocomplete({
  value,
  onChange,
  onMentionSelect,
  placeholder = "Type your comment... Use @username to mention team members",
  className = "",
  rows = 3,
  disabled = false
}: MentionAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [filteredSuggestions, setFilteredSuggestions] = useState<SlackUser[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const latestSuggestionsRef = useRef<SlackUser[]>([]);

  // Load Slack users when component mounts
  useEffect(() => {
    loadSlackUsers();
  }, []);

  const loadSlackUsers = async () => {
    try {
      setIsLoading(true);
      // Use the new app-users endpoint instead of workspace-users
      const response = await fetch('/api/slack/app-users');
      if (response.ok) {
        const data = await response.json();
        // The API returns { users: [...] }, so we need to extract the users array
        if (data.users && Array.isArray(data.users)) {
          latestSuggestionsRef.current = data.users; // Update ref with latest data
          console.log('Loaded app users with Slack mappings:', data.users.length); // Debug log
        } else {
          console.warn('Invalid users data received:', data);
          latestSuggestionsRef.current = [];
        }
      } else {
        console.error('Failed to fetch app users:', response.status);
        latestSuggestionsRef.current = [];
      }
    } catch (error) {
      console.error('Error loading app users:', error);
      latestSuggestionsRef.current = [];
    } finally {
      setIsLoading(false);
    }
  };

  // Handle textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Check for @mentions
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    const beforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      // Use the ref to get the latest suggestions data
      const currentSuggestions = latestSuggestionsRef.current;
      
      // Ensure suggestions is an array before filtering and not still loading
      if (Array.isArray(currentSuggestions) && !isLoading) {
        const filtered = currentSuggestions.filter(user => 
          user.name.toLowerCase().includes(query) ||
          user.profile.display_name?.toLowerCase().includes(query) ||
          user.profile.real_name?.toLowerCase().includes(query) ||
          user.profile.email?.toLowerCase().includes(query)
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(0);
      } else {
        setFilteredSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle key navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (showSuggestions && filteredSuggestions.length > 0) {
          e.preventDefault();
          selectMention(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Select a mention from suggestions
  const selectMention = (user: SlackUser) => {
    const beforeMention = value.substring(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = value.substring(cursorPosition);
    const newValue = `${beforeMention}@${user.name} ${afterMention}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Focus back to textarea and position cursor after the mention
    if (textareaRef.current) {
      const newPosition = beforeMention.length + user.name.length + 2; // +2 for @ and space
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newPosition, newPosition);
    }
    
    // Call the onMentionSelect callback if provided
    if (onMentionSelect) {
      onMentionSelect(user);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        rows={rows}
        disabled={disabled}
      />
      

      
      {/* @Mention Suggestions */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-80 max-h-60 bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto"
          style={{
            position: 'absolute',
            top: 'calc(100% - 160px)',
            left: 0,
            zIndex: 50
          }}
        >
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              Loading users...
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              No users found
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Select a registered team member to mention:
              </div>
              {filteredSuggestions.map((user, index) => (
                <div
                  key={user.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                    index === selectedIndex ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => selectMention(user)}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.profile.display_name?.[0] || user.name[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.profile.display_name || user.profile.real_name || user.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        @{user.name}
                        {user.profile.email && ` • ${user.profile.email}`}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      
      {/* Help text */}
      <div className="mt-1 text-xs text-gray-500">
        💡 Type @ to mention registered team members. Use arrow keys to navigate suggestions.
      </div>
    </div>
  );
}
