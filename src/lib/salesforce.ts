import * as jsforce from 'jsforce';

export interface SalesforceAccount {
  Id: string;
  Name: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  Phone?: string;
  Website?: string;
  Industry?: string;
  Type?: string;
  Description?: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  AccountId?: string;
  Account?: {
    Name: string;
  };
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount?: number;
  CloseDate?: string;
  StageName: string;
  Description?: string;
  AccountId?: string;
  Account?: {
    Name: string;
  };
}

class SalesforceClient {
  private conn: jsforce.Connection;

  constructor(loginUrl?: string) {
    this.conn = new jsforce.Connection({
      loginUrl: loginUrl || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });
  }

  /**
   * Authenticate with Salesforce using username/password
   */
  async authenticate(username: string, password: string, securityToken?: string): Promise<void> {
    try {
      console.log('Attempting Salesforce authentication...');
      console.log('Login URL:', this.conn.loginUrl);
      console.log('Username:', username);
      console.log('Has security token:', !!securityToken);
      
      await this.conn.login(username, password + (securityToken || ''));
      console.log('Salesforce authentication successful');
    } catch (error) {
      console.error('Salesforce authentication failed:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('INVALID_LOGIN')) {
          throw new Error('Invalid username or password. Please check your credentials.');
        } else if (error.message.includes('INVALID_CLIENT_ID')) {
          throw new Error('Invalid client ID or security token.');
        } else if (error.message.includes('LOGIN_MUST_USE_SECURITY_TOKEN')) {
          throw new Error('Security token required. Please add your security token.');
        } else if (error.message.includes('INVALID_GRANT')) {
          throw new Error('Invalid grant. Please check your username, password, and security token.');
        } else {
          throw new Error(`Authentication failed: ${error.message}`);
        }
      } else {
        throw new Error('Failed to authenticate with Salesforce');
      }
    }
  }

  /**
   * Authenticate with Salesforce using OAuth2 (for production)
   */
  async authenticateWithOAuth2(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string
  ): Promise<void> {
    try {
      await this.conn.authorize({
        clientId,
        clientSecret,
        redirectUri,
        code,
        grant_type: 'authorization_code'
      });
      console.log('Salesforce OAuth2 authentication successful');
    } catch (error) {
      console.error('Salesforce OAuth2 authentication failed:', error);
      throw new Error('Failed to authenticate with Salesforce OAuth2');
    }
  }

  /**
   * Search for accounts by name
   */
  async searchAccounts(searchTerm: string): Promise<SalesforceAccount[]> {
    try {
      const query = `
        SELECT Id, Name, BillingStreet, BillingCity, BillingState, 
               BillingPostalCode, BillingCountry, Phone, Website, 
               Industry, Type, Description
        FROM Account 
        WHERE Name LIKE '%${searchTerm}%' 
        ORDER BY Name 
        LIMIT 10
      `;
      
      const result = await this.conn.query(query);
      return result.records as SalesforceAccount[];
    } catch (error) {
      console.error('Error searching accounts:', error);
      throw new Error('Failed to search Salesforce accounts');
    }
  }

  /**
   * Get account details by ID
   */
  async getAccount(accountId: string): Promise<SalesforceAccount> {
    try {
      const query = `
        SELECT Id, Name, BillingStreet, BillingCity, BillingState, 
               BillingPostalCode, BillingCountry, Phone, Website, 
               Industry, Type, Description
        FROM Account 
        WHERE Id = '${accountId}'
      `;
      
      const result = await this.conn.query(query);
      if (result.records.length === 0) {
        throw new Error('Account not found');
      }
      
      return result.records[0] as SalesforceAccount;
    } catch (error) {
      console.error('Error getting account:', error);
      throw new Error('Failed to get Salesforce account');
    }
  }

  /**
   * Get contacts for an account
   */
  async getAccountContacts(accountId: string): Promise<SalesforceContact[]> {
    try {
      const query = `
        SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId,
               Account.Name
        FROM Contact 
        WHERE AccountId = '${accountId}' 
        ORDER BY LastName, FirstName
      `;
      
      const result = await this.conn.query(query);
      return result.records as SalesforceContact[];
    } catch (error) {
      console.error('Error getting account contacts:', error);
      throw new Error('Failed to get Salesforce contacts');
    }
  }

  /**
   * Get opportunities for an account
   */
  async getAccountOpportunities(accountId: string): Promise<SalesforceOpportunity[]> {
    try {
      const query = `
        SELECT Id, Name, Amount, CloseDate, StageName, Description, AccountId,
               Account.Name
        FROM Opportunity 
        WHERE AccountId = '${accountId}' 
        ORDER BY CloseDate DESC
      `;
      
      const result = await this.conn.query(query);
      return result.records as SalesforceOpportunity[];
    } catch (error) {
      console.error('Error getting account opportunities:', error);
      throw new Error('Failed to get Salesforce opportunities');
    }
  }

  /**
   * Search for contacts by name or email
   */
  async searchContacts(searchTerm: string): Promise<SalesforceContact[]> {
    try {
      const query = `
        SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId,
               Account.Name
        FROM Contact 
        WHERE FirstName LIKE '%${searchTerm}%' 
           OR LastName LIKE '%${searchTerm}%' 
           OR Email LIKE '%${searchTerm}%'
        ORDER BY LastName, FirstName 
        LIMIT 10
      `;
      
      const result = await this.conn.query(query);
      return result.records as SalesforceContact[];
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw new Error('Failed to search Salesforce contacts');
    }
  }

  /**
   * Get full customer information including account, contacts, and opportunities
   */
  async getCustomerInfo(accountId: string): Promise<{
    account: SalesforceAccount;
    contacts: SalesforceContact[];
    opportunities: SalesforceOpportunity[];
  }> {
    try {
      const [account, contacts, opportunities] = await Promise.all([
        this.getAccount(accountId),
        this.getAccountContacts(accountId),
        this.getAccountOpportunities(accountId)
      ]);

      return {
        account,
        contacts,
        opportunities
      };
    } catch (error) {
      console.error('Error getting customer info:', error);
      throw new Error('Failed to get customer information from Salesforce');
    }
  }

  /**
   * Get the Salesforce instance URL
   */
  getInstanceUrl(): string | null {
    return this.conn.instanceUrl || null;
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.conn.query('SELECT Id FROM User LIMIT 1');
      return result.records.length > 0;
    } catch (error) {
      console.error('Salesforce connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
const salesforceClient = new SalesforceClient();

export { salesforceClient };
export default salesforceClient; 