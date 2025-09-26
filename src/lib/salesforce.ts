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
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  CurrencyIsoCode?: string;
  Owner?: {
    Name: string;
    Email: string;
  };
  // Lowercase properties for API responses
  id?: string;
  name?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  industry?: string;
  numberOfEmployees?: number;
  // Additional billing fields
  BillingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  // Custom fields (may not exist in all orgs)
  Payment_Terms__c?: string;
  Tax_Exempt__c?: boolean;
  Tax_Exemption_Number__c?: string;
  Tax_ID__c?: string;
  Credit_Limit__c?: number;
  Credit_Rating__c?: string;
  Billing_Contact__c?: string;
  Billing_Email__c?: string;
  Billing_Phone__c?: string;
  Purchase_Order_Required__c?: boolean;
  Invoice_Delivery_Preference__c?: string;
  Payment_Method__c?: string;
  Employee_Band__c?: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Department?: string;
  Description?: string;
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
    // Clean and validate the login URL
    const cleanLoginUrl = this.cleanLoginUrl(loginUrl || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com');
    
    this.conn = new jsforce.Connection({
      loginUrl: cleanLoginUrl
    });
  }

  /**
   * Clean and validate the Salesforce login URL
   */
  private cleanLoginUrl(loginUrl: string): string {
    // Remove trailing slashes and spaces
    let cleanUrl = loginUrl.trim().replace(/\/$/, '');
    
    // Ensure the URL has a protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    // Handle common URL formats
    if (cleanUrl.includes('lightning.force.com')) {
      // Convert lightning.force.com to login.salesforce.com
      cleanUrl = cleanUrl.replace('lightning.force.com', 'login.salesforce.com');
    }
    
    // Handle developer org URLs (dev-ed.my.salesforce.com)
    if (cleanUrl.includes('dev-ed.my.salesforce.com')) {
      // Convert dev-ed.my.salesforce.com to test.salesforce.com
      cleanUrl = cleanUrl.replace('dev-ed.my.salesforce.com', 'test.salesforce.com');
    }
    
    // Handle sandbox URLs (sandbox.my.salesforce.com)
    if (cleanUrl.includes('sandbox.my.salesforce.com')) {
      // Convert sandbox.my.salesforce.com to test.salesforce.com
      cleanUrl = cleanUrl.replace('sandbox.my.salesforce.com', 'test.salesforce.com');
    }
    
    // Handle custom domain URLs that end with .my.salesforce.com
    if (cleanUrl.includes('.my.salesforce.com') && !cleanUrl.includes('test.salesforce.com')) {
      // Extract the subdomain and convert to test.salesforce.com for dev/sandbox orgs
      const urlParts = cleanUrl.split('.');
      if (urlParts.length >= 3) {
        const subdomain = urlParts[0];
        // If it's a dev org (contains 'dev-ed') or sandbox, use test.salesforce.com
        if (subdomain.includes('dev-ed') || subdomain.includes('sandbox')) {
          cleanUrl = cleanUrl.replace(/^https?:\/\/[^\/]+\.my\.salesforce\.com/, 'https://test.salesforce.com');
        } else {
          // For production orgs with custom domains, use login.salesforce.com
          cleanUrl = cleanUrl.replace(/^https?:\/\/[^\/]+\.my\.salesforce\.com/, 'https://login.salesforce.com');
        }
      }
    }
    
    // Ensure it's a valid Salesforce login URL
    if (!cleanUrl.includes('login.salesforce.com') && !cleanUrl.includes('test.salesforce.com')) {
      console.warn(`Warning: Unusual login URL format: ${cleanUrl}`);
    }
    
    return cleanUrl;
  }

  /**
   * Authenticate with Salesforce using username/password
   */
  async authenticate(username: string, password: string, securityToken?: string, loginUrl?: string): Promise<void> {
    // Create a new connection with the provided login URL if specified
    if (loginUrl) {
      const cleanLoginUrl = this.cleanLoginUrl(loginUrl);
      this.conn = new jsforce.Connection({
        loginUrl: cleanLoginUrl
      });
    }
    
    try {
      // Authentication attempt started
      
      // Try authentication with password + security token first
      try {
        await this.conn.login(username, password + (securityToken || ''));
        // Authentication successful with password + token
      } catch (error) {
        // If that fails, try with password only (in case token is already appended)
        if (error instanceof Error && error.message.includes('INVALID_LOGIN')) {
          // First attempt failed, trying with password only
          await this.conn.login(username, password);
          // Authentication successful with password only
        } else {
          throw error;
        }
      }
      
      // Verify that the connection has a valid instance URL after authentication
      if (!this.conn.instanceUrl) {
        // If jsforce didn't set the instance URL, try to derive it from the login URL
        console.warn('Salesforce connection missing instance URL, attempting to derive from login URL');
        
        // Try to extract instance URL from the login URL used for authentication
        const loginUrl = this.conn.loginUrl || '';
        let derivedInstanceUrl = '';
        
        if (loginUrl.includes('login.salesforce.com')) {
          derivedInstanceUrl = 'https://na1.salesforce.com';
        } else if (loginUrl.includes('test.salesforce.com')) {
          derivedInstanceUrl = 'https://na1.salesforce.com';
        } else {
          // For custom domains, try to extract the instance
          const match = loginUrl.match(/https:\/\/([^.]+)\.salesforce\.com/);
          if (match) {
            derivedInstanceUrl = `https://${match[1]}.salesforce.com`;
          }
        }
        
        if (derivedInstanceUrl) {
  
          // Set the instance URL manually
          (this.conn as { instanceUrl?: string }).instanceUrl = derivedInstanceUrl;
        } else {
          throw new Error('Salesforce authentication succeeded but no instance URL was returned and could not be derived from login URL');
        }
      }
      
      
      // Authentication successful
    } catch (error) {
      console.error('Salesforce authentication failed:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('INVALID_LOGIN')) {
          throw new Error('Invalid username or password. Please check your credentials for this specific org.');
        } else if (error.message.includes('INVALID_CLIENT_ID')) {
          throw new Error('Invalid client ID or security token. Try resetting your security token.');
        } else if (error.message.includes('LOGIN_MUST_USE_SECURITY_TOKEN')) {
          throw new Error('Security token required. Please add your security token.');
        } else if (error.message.includes('INVALID_GRANT')) {
          throw new Error('Invalid grant. Please check your username, password, and security token.');
        } else if (error.message.includes('INSUFFICIENT_ACCESS')) {
          throw new Error('Insufficient access. Check your user permissions in Salesforce.');
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
              // OAuth2 authentication successful
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
      const escapedSearchTerm = searchTerm.replace(/'/g, "\\'");
      
      const query = `
        SELECT Id, Name, BillingStreet, BillingCity, BillingState, 
               BillingPostalCode, BillingCountry, Industry, NumberOfEmployees,
               Employee_Band__c, Owner.Name, Owner.Email
        FROM Account 
        WHERE Name LIKE '%${escapedSearchTerm}%' 
           OR BillingCity LIKE '%${escapedSearchTerm}%'
           OR BillingState LIKE '%${escapedSearchTerm}%'
           OR Industry LIKE '%${escapedSearchTerm}%'
        ORDER BY Name 
        LIMIT 20
      `;
      
      const result = await this.conn.query(query);
      
      // Use the actual Employee_Band__c field from Salesforce, fallback to calculation if not available
      result.records.forEach((record: Record<string, unknown>) => {
        const numberOfEmployees = record.NumberOfEmployees as number;
        const accountName = record.Name as string;
        const salesforceSegment = record.Employee_Band__c as string;
        
        // If Salesforce has the Employee_Band__c field, use it
        if (salesforceSegment) {
          console.log(`✅ Search: Using Salesforce Account Segment for ${accountName}: ${salesforceSegment}`);
        } else {
          // Fallback to calculation based on NumberOfEmployees if Salesforce field is empty
          if (numberOfEmployees !== null && numberOfEmployees !== undefined && typeof numberOfEmployees === 'number') {
            let calculatedSegment = '';
            if (numberOfEmployees > 4500) {
              calculatedSegment = 'LE';
            } else if (numberOfEmployees >= 1001) {
              calculatedSegment = 'EE';
            } else if (numberOfEmployees >= 251) {
              calculatedSegment = 'MM';
            } else {
              calculatedSegment = 'EC';
            }
            
            record.Employee_Band__c = calculatedSegment;
            console.log(`⚠️ Search: Salesforce Employee_Band__c empty for ${accountName}, calculated: ${calculatedSegment} (${numberOfEmployees} employees)`);
          } else {
            console.log(`⚠️ Search: No employee count or Salesforce segment available for ${accountName}`);
            record.Employee_Band__c = undefined;
          }
        }
      });
      
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
      // Query account with Employee_Band__c field and Owner information
      const query = `
        SELECT Id, Name, BillingStreet, BillingCity, BillingState, 
               BillingPostalCode, BillingCountry, Employee_Band__c,
               Owner.Name, Owner.Email
        FROM Account 
        WHERE Id = '${accountId}'
      `;
      
      const result = await this.conn.query(query);
      if (result.records.length === 0) {
        throw new Error('Account not found');
      }
      
      const account = result.records[0] as SalesforceAccount;
      
      // Use Employee_Band__c from Salesforce if available, otherwise calculate it
      if (!account.Employee_Band__c) {
        try {
          // Get NumberOfEmployees to calculate segment if Employee_Band__c is not available
          const employeeQuery = `SELECT NumberOfEmployees FROM Account WHERE Id = '${accountId}'`;
          const employeeResult = await this.conn.query(employeeQuery);
          
          if (employeeResult.records.length > 0) {
            const record = employeeResult.records[0];
            const numberOfEmployees = record.NumberOfEmployees as number;
            
            // Calculate segment using the same formula logic as Salesforce
            if (numberOfEmployees !== null && numberOfEmployees !== undefined && typeof numberOfEmployees === 'number') {
              let calculatedSegment = '';
              if (numberOfEmployees > 4500) {
                calculatedSegment = 'LE';
              } else if (numberOfEmployees >= 1001) {
                calculatedSegment = 'EE';
              } else if (numberOfEmployees >= 251) {
                calculatedSegment = 'MM';
              } else {
                calculatedSegment = 'EC';
              }
              
              account.Employee_Band__c = calculatedSegment;
              console.log(`✅ Calculated Account Segment for ${account.Name}: ${calculatedSegment} (${numberOfEmployees} employees)`);
            } else {
              console.log(`⚠️ No employee count available for ${account.Name}, setting Account Segment to undefined`);
              account.Employee_Band__c = undefined;
            }
          } else {
            console.log(`⚠️ No account found for ID ${accountId}`);
            account.Employee_Band__c = undefined;
          }
        } catch (segmentError) {
          console.error('Error calculating account segment:', segmentError);
          console.log(`⚠️ Error calculating segment for ${account.Name}, keeping existing value: ${account.Employee_Band__c}`);
        }
      } else {
        console.log(`✅ Using Employee_Band__c from Salesforce for ${account.Name}: ${account.Employee_Band__c}`);
      }
      
      return account;
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
      // Verify connection is properly authenticated
      if (!this.conn.instanceUrl) {
        throw new Error('Salesforce connection not properly authenticated - missing instance URL');
      }
      
      const query = `
        SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId,
               Account.Name
        FROM Contact 
        WHERE AccountId = '${accountId}' 
        ORDER BY FirstName, LastName
      `;
      
      
      const result = await this.conn.query(query);
      return result.records as SalesforceContact[];
    } catch (error) {
      console.error('Error getting account contacts:', error);
      console.error('Connection details:', {
        instanceUrl: this.conn.instanceUrl,
        accessToken: this.conn.accessToken ? 'present' : 'missing',
        isLoggedIn: !!this.conn.accessToken
      });
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
          AND StageName != 'Closed Lost'
          AND StageName != 'Closed Won'
          AND StageName != 'Disqualified'
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
        ORDER BY FirstName, LastName 
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
   * Get billing information for an account
   */
  async getAccountBillingInfo(accountId: string): Promise<{
    companyName: string;
    billingContact: string;
    billingAddress: string;
    billingEmail: string;
  }> {
    try {
      const account = await this.getAccount(accountId);
      
      // Build billing address
      const addressParts = [
        account.BillingStreet,
        account.BillingCity,
        account.BillingState,
        account.BillingPostalCode,
        account.BillingCountry
      ].filter(Boolean);
      
      const billingAddress = addressParts.join(', ');
      
      return {
        companyName: account.Name || '',
        billingContact: account.Billing_Contact__c || '',
        billingAddress,
        billingEmail: account.Billing_Email__c || ''
      };
    } catch (error) {
      console.error('Error getting account billing info:', error);
      throw new Error('Failed to get account billing information');
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
      // Check if we have the necessary connection details
      if (!this.conn.instanceUrl || !this.conn.accessToken) {
        console.error('Salesforce connection test failed: Missing instance URL or access token');
        return false;
      }
      
      const result = await this.conn.query('SELECT Id FROM User LIMIT 1');
      return result.records.length > 0;
    } catch (error) {
      console.error('Salesforce connection test failed:', error);
      return false;
    }
  }

  async query(soql: string): Promise<{ records: unknown[]; totalSize: number; done: boolean }> {
    return await this.conn.query(soql);
  }

  /**
   * Check if the connection is properly authenticated
   */
  isAuthenticated(): boolean {
    const hasInstanceUrl = !!this.conn.instanceUrl;
    const hasAccessToken = !!this.conn.accessToken;
    

    
    return !!(hasInstanceUrl && hasAccessToken);
  }
}

// Create a singleton instance
const salesforceClient = new SalesforceClient();

export { salesforceClient };
export default salesforceClient; 