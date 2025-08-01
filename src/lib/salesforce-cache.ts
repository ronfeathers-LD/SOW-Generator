// Salesforce data caching system
// Caches POC and Opportunity queries to reduce API calls and improve performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface SalesforceCache {
  contacts: Map<string, CacheEntry<any[]>>;
  opportunities: Map<string, CacheEntry<any[]>>;
}

class SalesforceCacheManager {
  private cache: SalesforceCache;
  private readonly CONTACTS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly OPPORTUNITIES_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.cache = {
      contacts: new Map(),
      opportunities: new Map()
    };
  }

  // Get cached contacts for an account
  getCachedContacts(accountId: string): any[] | null {
    const entry = this.cache.contacts.get(accountId);
    
    if (!entry) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.contacts.delete(accountId);
      return null;
    }

    // Using cached contacts
    return entry.data;
  }

  // Cache contacts for an account
  cacheContacts(accountId: string, contacts: any[]): void {
    const expiresAt = Date.now() + this.CONTACTS_CACHE_DURATION;
    
    this.cache.contacts.set(accountId, {
      data: contacts,
      timestamp: Date.now(),
      expiresAt
    });

    // Contacts cached
  }

  // Get cached opportunities for an account
  getCachedOpportunities(accountId: string): any[] | null {
    const entry = this.cache.opportunities.get(accountId);
    
    if (!entry) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.opportunities.delete(accountId);
      return null;
    }

    // Using cached opportunities
    return entry.data;
  }

  // Cache opportunities for an account
  cacheOpportunities(accountId: string, opportunities: any[]): void {
    const expiresAt = Date.now() + this.OPPORTUNITIES_CACHE_DURATION;
    
    this.cache.opportunities.set(accountId, {
      data: opportunities,
      timestamp: Date.now(),
      expiresAt
    });

    // Opportunities cached
  }

  // Clear cache for a specific account
  clearAccountCache(accountId: string): void {
    this.cache.contacts.delete(accountId);
    this.cache.opportunities.delete(accountId);
    // Cache cleared for account
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.contacts.clear();
    this.cache.opportunities.clear();
    // All cache cleared
  }

  // Get cache statistics
  getCacheStats(): {
    contacts: { size: number; entries: Array<{ accountId: string; expiresIn: number }> };
    opportunities: { size: number; entries: Array<{ accountId: string; expiresIn: number }> };
  } {
    const contacts = Array.from(this.cache.contacts.entries()).map(([accountId, entry]) => ({
      accountId,
      expiresIn: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000))
    }));

    const opportunities = Array.from(this.cache.opportunities.entries()).map(([accountId, entry]) => ({
      accountId,
      expiresIn: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000))
    }));

    return {
      contacts: { size: contacts.length, entries: contacts },
      opportunities: { size: opportunities.length, entries: opportunities }
    };
  }

  // Force refresh cache for an account
  forceRefresh(accountId: string): void {
    this.clearAccountCache(accountId);
    // Force refresh requested
  }
}

// Create a singleton instance
const salesforceCache = new SalesforceCacheManager();

export default salesforceCache; 