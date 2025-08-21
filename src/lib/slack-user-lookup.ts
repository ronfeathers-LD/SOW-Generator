/**
 * Service for looking up Slack users using Slack's Web API
 * This allows dynamic user ID resolution for @mentions
 */

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile: {
    email?: string;
    display_name?: string;
    real_name?: string;
  };
  is_bot: boolean;
  deleted: boolean;
}

export interface SlackUserLookupResult {
  success: boolean;
  user?: SlackUser;
  error?: string;
}

export class SlackUserLookupService {
  private static botToken: string | undefined;
  private static baseUrl = 'https://slack.com/api';
  
  // Cache for user data with TTL
  private static userCache: {
    data: SlackUser[];
    timestamp: number;
    ttl: number; // Time to live in milliseconds (5 minutes)
  } | null = null;
  
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the service with Slack bot token
   */
  static initialize(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Check if cache is valid
   */
  private static isCacheValid(): boolean {
    if (!this.userCache) return false;
    const now = Date.now();
    return (now - this.userCache.timestamp) < this.userCache.ttl;
  }

  /**
   * Get cached users if available and valid
   */
  private static getCachedUsers(): SlackUser[] | null {
    if (this.isCacheValid()) {
      return this.userCache!.data;
    }
    return null;
  }

  /**
   * Set cache with current timestamp
   */
  private static setCache(users: SlackUser[]): void {
    this.userCache = {
      data: users,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    };
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    this.userCache = null;
  }

  /**
   * Look up a user by username (without @ symbol)
   */
  static async lookupUserByUsername(username: string): Promise<SlackUserLookupResult> {
    if (!this.botToken) {
      return {
        success: false,
        error: 'Slack bot token not configured'
      };
    }

    try {
      // First, try to get all users and search by username/display name
      // This is more reliable than trying to construct emails
      const allUsers = await this.getAllUsers();
      
      // Generate username variations to try
      const usernameVariations = this.generateUsernameVariations(username);
      console.log(`Trying username variations: ${usernameVariations.join(', ')}`);
      
      // Search by various name fields with all variations
      const foundUser = allUsers.find(user => {
        const displayName = user.profile.display_name?.toLowerCase();
        const realName = user.profile.real_name?.toLowerCase();
        const name = user.name.toLowerCase();
        
        // Check if any username variation matches any name field
        return usernameVariations.some(variation => {
          const searchTerm = variation.toLowerCase();
          return displayName === searchTerm || 
                 realName === searchTerm || 
                 name === searchTerm ||
                 displayName?.includes(searchTerm) ||
                 realName?.includes(searchTerm) ||
                 name.includes(searchTerm);
        });
      });

      if (foundUser) {
        console.log(`✅ Found user with variation: ${foundUser.name}`);
        return {
          success: true,
          user: foundUser
        };
      }

      // If not found by name, try to construct email and lookup by email
      // But only if we have a proper workspace domain
      const workspaceDomain = process.env.SLACK_WORKSPACE_DOMAIN;
      if (workspaceDomain && workspaceDomain.includes('.slack.com')) {
        // Try email lookup with different username variations
        for (const variation of usernameVariations) {
          try {
            const constructedEmail = `${variation}@${workspaceDomain}`;
            console.log(`Trying email lookup with: ${constructedEmail}`);
            
            const response = await fetch(`${this.baseUrl}/users.lookupByEmail`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: constructedEmail,
              }),
            });

            const data = await response.json();

            if (data.ok && data.user) {
              console.log(`✅ Found user with email: ${constructedEmail}`);
              return {
                success: true,
                user: data.user
              };
            } else if (data.error === 'users_not_found') {
              console.log(`User not found with email: ${constructedEmail}`);
            } else {
              console.log(`Email lookup error: ${data.error}`);
            }
          } catch {
            console.log(`Email lookup failed for ${variation}, continuing...`);
          }
        }
      }

      // If still not found, try the old alternative lookup methods
      return await this.tryAlternativeLookups(username);

    } catch (error) {
      console.error('Error looking up user by username:', error);
      return {
        success: false,
        error: 'Network error during user lookup'
      };
    }
  }

  /**
   * Get a user by Slack user ID (most efficient method)
   */
  static async getUserById(userId: string): Promise<SlackUser | null> {
    if (!this.botToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/users.info?user=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
        },
      });

      const data = await response.json();

      if (data.ok && data.user) {
        return data.user;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Look up a user by email address
   */
  static async lookupUserByEmail(email: string): Promise<SlackUserLookupResult> {
    if (!this.botToken) {
      return {
        success: false,
        error: 'Slack bot token not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/users.lookupByEmail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.ok && data.user) {
        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to lookup user'
        };
      }
    } catch (error) {
      console.error('Error looking up user by email:', error);
      return {
        success: false,
        error: 'Network error during user lookup'
      };
    }
  }

  /**
   * Get all users in the workspace (for admin interfaces)
   */
  static async getAllUsers(): Promise<SlackUser[]> {
    if (!this.botToken) {
      throw new Error('Slack bot token not configured');
    }

    // Check cache first
    const cachedUsers = this.getCachedUsers();
    if (cachedUsers) {
      return cachedUsers;
    }

    try {
      const response = await fetch(`${this.baseUrl}/users.list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
        },
      });

      const data = await response.json();

      if (data.ok && data.members) {
        // Filter out bots and deleted users
        const filteredUsers = data.members.filter((user: SlackUser) => 
          !user.is_bot && !user.deleted
        );
        
        // Cache the filtered users
        this.setCache(filteredUsers);
        
        return filteredUsers;
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  /**
   * Try alternative lookup methods when email lookup fails
   */
  private static async tryAlternativeLookups(username: string): Promise<SlackUserLookupResult> {
    if (!this.botToken) {
      return {
        success: false,
        error: 'Slack bot token not configured'
      };
    }

    try {
      // Try to get all users and search by display name or real name
      const allUsers = await this.getAllUsers();
      
      // Search by various name fields
      const foundUser = allUsers.find(user => {
        const displayName = user.profile.display_name?.toLowerCase();
        const realName = user.profile.real_name?.toLowerCase();
        const name = user.name.toLowerCase();
        const searchTerm = username.toLowerCase();
        
        return displayName === searchTerm || 
               realName === searchTerm || 
               name === searchTerm ||
               displayName?.includes(searchTerm) ||
               realName?.includes(searchTerm) ||
               name.includes(searchTerm);
      });

      if (foundUser) {
        return {
          success: true,
          user: foundUser
        };
      }

      return {
        success: false,
        error: 'User not found'
      };

    } catch (error) {
      console.error('Error in alternative lookup:', error);
      return {
        success: false,
        error: 'Failed to perform alternative lookup'
      };
    }
  }

  /**
   * Generate variations of a username to try different formats
   */
  private static generateUsernameVariations(username: string): string[] {
    const variations = [username]; // Original username
    
    // Remove dots and try
    const noDots = username.replace(/\./g, '');
    if (noDots !== username) {
      variations.push(noDots);
    }
    
    // Add dots between words if username looks like it could be split
    if (username.includes('_') || username.length > 8) {
      // Try adding dots in common places
      const withDots = username.replace(/([a-z])([A-Z])/g, '$1.$2').toLowerCase();
      if (withDots !== username.toLowerCase()) {
        variations.push(withDots);
      }
      
      // Try underscore variations
      const withUnderscores = username.replace(/\./g, '_');
      if (withUnderscores !== username) {
        variations.push(withUnderscores);
      }
      
      const noUnderscores = username.replace(/_/g, '');
      if (noUnderscores !== username) {
        variations.push(noUnderscores);
      }
    }
    
    // Common variations
    if (username.includes('.')) {
      // If it has dots, try without dots
      variations.push(username.replace(/\./g, ''));
    } else {
      // If it doesn't have dots, try adding them in common places
      // For names like "ronfeathers", try "ron.feathers"
      if (username.length > 8) {
        const withDot = username.slice(0, 3) + '.' + username.slice(3);
        variations.push(withDot);
      }
    }
    
    // Remove duplicates and return
    return Array.from(new Set(variations));
  }

  /**
   * Extract domain from bot token for email construction
   * This is a fallback method - ideally users would provide full emails
   */
  private static getDomainFromToken(): string {
    // This is a simplified approach - in production you might want to store the domain separately
    const domain = process.env.SLACK_WORKSPACE_DOMAIN || 'company.com';
    return domain;
  }

  /**
   * Validate if a Slack bot token is properly configured
   */
  static async validateToken(): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth.test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
        },
      });

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error validating Slack token:', error);
      return false;
    }
  }

  /**
   * Get workspace info for display purposes
   */
  static async getWorkspaceInfo(): Promise<{ name: string; domain: string } | null> {
    if (!this.botToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/team.info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
        },
      });

      const data = await response.json();

      if (data.ok && data.team) {
        return {
          name: data.team.name,
          domain: data.team.domain
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching workspace info:', error);
      return null;
    }
  }
}
