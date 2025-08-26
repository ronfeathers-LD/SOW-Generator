import { google } from 'googleapis';
import { GeminiClient } from './gemini';
import { Readable } from 'stream';

interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

interface DriveSearchResult {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

// Google Drive API response types
interface GoogleDriveFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  parents?: string[] | null;
  webViewLink?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  size?: string | null;
}

interface FolderStructure {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  createdTime: string;
  modifiedTime: string;
  subfolders: FolderStructure[];
}

interface FolderSearchQuery {
  query: string;
  folderName?: string;
  parentFolderId?: string;
  includeSubfolders?: boolean;
  maxResults?: number;
}

export class GoogleDriveService {
  private drive!: ReturnType<typeof google.drive>;
  private geminiClient: GeminiClient | null = null;
  private config: GoogleDriveConfig;
  
  // Simple cache for search results to avoid repeated API calls
  private searchCache = new Map<string, { results: DriveSearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Common company suffixes to ignore when searching for customer folders
  private static COMPANY_SUFFIXES: ReadonlyArray<string> = [
    'inc', 'inc.', 'llc', 'l.l.c', 'ltd', 'ltd.', 'limited', 'corp', 'corp.', 'corporation',
    'company', 'co', 'co.', 'holdings', 'group', 'technologies', 'technology', 'systems',
    'software', 'solutions', 'services'
  ];

  // Escape single quotes in Drive query values
  private static escapeQueryValue(value: string): string {
    return value.replace(/'/g, "\\'");
  }

  // Normalize a customer or folder name for comparison/search
  private static normalizeName(name: string): string {
    const lower = name.toLowerCase();
    // Remove punctuation
    const noPunct = lower.replace(/[^a-z0-9\s-]/g, '');
    // Remove common company suffix words
    const tokens = noPunct.split(/\s+/).filter(Boolean).filter(token => !this.COMPANY_SUFFIXES.includes(token));
    return tokens.join(' ').trim();
  }

  // Generate multiple search variants to improve match likelihood
  private static generateSearchVariants(raw: string): string[] {
    const variants: string[] = [];
    const trimmed = raw.trim();
    const normalized = this.normalizeName(trimmed); // e.g., "smartmoving software" -> "smartmoving"

    // Original and normalized
    variants.push(trimmed);
    if (normalized && normalized !== trimmed.toLowerCase()) {
      variants.push(normalized);
    }

    // Space and no-space variants (e.g., "Smart Moving" and "SmartMoving")
    const collapsed = normalized.replace(/\s+/g, '');
    if (collapsed && !variants.includes(collapsed)) variants.push(collapsed);
    const spaced = normalized.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (spaced && !variants.includes(spaced)) variants.push(spaced);

    // Title-case variant of normalized
    const titleCased = normalized.replace(/\b\w/g, ch => ch.toUpperCase());
    if (titleCased && !variants.includes(titleCased)) variants.push(titleCased);

    // Deduplicate while preserving order
    return Array.from(new Set(variants)).filter(v => v.length > 0);
  }

  constructor(config: GoogleDriveConfig, geminiApiKey?: string) {
    this.config = config;
    
    if (geminiApiKey) {
      this.geminiClient = new GeminiClient(geminiApiKey);
    }

    this.initializeDrive();
  }

  private initializeDrive() {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    if (this.config.refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken
      });
    }

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Use Gemini to interpret natural language search queries and convert them to structured search parameters
   */
  async interpretSearchQuery(naturalQuery: string): Promise<Partial<FolderSearchQuery>> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not configured for query interpretation');
    }

    const prompt = `
You are a Google Drive search query interpreter. Convert the following natural language query into structured search parameters.

Query: "${naturalQuery}"

Please respond with a JSON object containing the following fields:
- query: The main search query string for Google Drive
- folderName: Specific folder name to look for (if mentioned)
- includeSubfolders: Whether to search in subfolders (true/false)
- maxResults: Maximum number of results to return (default: 50)

Example response format:
{
  "query": "project documents",
  "folderName": "SOW",
  "includeSubfolders": true,
  "maxResults": 25
}

Only include fields that are relevant to the query. If no specific folder name is mentioned, omit folderName.
`;

    try {
      const result = await this.geminiClient['model'].generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      if (!content) {
        throw new Error('No response from Gemini');
      }

      // Clean the response and parse JSON
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedContent);
      return parsed;
    } catch (error) {
      console.error('Failed to interpret search query with Gemini:', error);
      // Fallback to basic query processing
      return { query: naturalQuery };
    }
  }

  /**
   * Search for folders using Google Drive API
   */
  async searchFolders(searchParams: FolderSearchQuery): Promise<DriveSearchResult[]> {
    try {
      // Check cache first
      const cacheKey = JSON.stringify(searchParams);
      const cached = this.searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        return cached.results;
      }

      // Start with a more targeted query - only search for folders
      let query = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      // Use exact name matching first for better performance
      if (searchParams.folderName) {
        query += ` and name='${searchParams.folderName}'`;
      } else if (searchParams.query) {
        // For customer name searches, use name contains instead of fullText for better performance
        const normalizedQuery = GoogleDriveService.normalizeName(searchParams.query);
        query += ` and name contains '${GoogleDriveService.escapeQueryValue(normalizedQuery)}'`;
      }
      
      if (searchParams.parentFolderId) {
        query += ` and '${searchParams.parentFolderId}' in parents`;
      }

      // Reduce page size for faster results - we only need a few folders
      const pageSize = Math.min(searchParams.maxResults || 10, 20);
      
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime)',
        pageSize: pageSize,
        orderBy: 'modifiedTime desc',
        // Only search in user's drive for better performance
        includeItemsFromAllDrives: false,
        supportsAllDrives: false,
        corpora: 'user'
      });

      let files = response.data.files || [];
      
      // If no results and we have a query, try a broader search with name variants
      if (files.length === 0 && searchParams.query && !searchParams.folderName) {
        const variants = GoogleDriveService.generateSearchVariants(searchParams.query);
        
        // Use a simpler OR query for better performance
        const variantQueries = variants.map(v => `name contains '${GoogleDriveService.escapeQueryValue(v)}'`);
        let broaderQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and (${variantQueries.join(' or ')})`;
        
        if (searchParams.parentFolderId) {
          broaderQuery += ` and '${searchParams.parentFolderId}' in parents`;
        }
        
        const broaderResponse = await this.drive.files.list({
          q: broaderQuery,
          fields: 'files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime)',
          pageSize: pageSize,
          orderBy: 'modifiedTime desc',
          includeItemsFromAllDrives: false,
          supportsAllDrives: false,
          corpora: 'user'
        });
        
        files = broaderResponse.data.files || [];
      }
      
      const results = files
        .filter((file): file is GoogleDriveFile => file !== null && file !== undefined)
        .map((file): DriveSearchResult => ({
          id: file.id || '',
          name: file.name || '',
          mimeType: file.mimeType || '',
          parents: file.parents || undefined,
          webViewLink: file.webViewLink || undefined,
          createdTime: file.createdTime || '',
          modifiedTime: file.modifiedTime || '',
          size: file.size || undefined
        }));

      // Cache the results
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error searching Google Drive:', error);
      throw new Error(`Failed to search Google Drive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a specific folder exists
   */
  async folderExists(folderName: string, parentFolderId?: string): Promise<boolean> {
    try {
      const results = await this.searchFolders({
        query: '',
        folderName,
        parentFolderId,
        maxResults: 1
      });
      
      return results.length > 0;
    } catch (error) {
      console.error('Error checking if folder exists:', error);
      return false;
    }
  }

  /**
   * Get folder details including subfolder structure
   */
  async getFolderStructure(folderId: string, maxDepth: number = 3): Promise<FolderStructure> {
    try {
      const folder = await this.drive.files.get({
        fileId: folderId,
        fields: 'id,name,mimeType,parents,webViewLink,createdTime,modifiedTime'
      });

      if (maxDepth <= 0) {
        return {
          id: folder.data.id || '',
          name: folder.data.name || '',
          mimeType: folder.data.mimeType || '',
          parents: folder.data.parents || undefined,
          webViewLink: folder.data.webViewLink || undefined,
          createdTime: folder.data.createdTime || '',
          modifiedTime: folder.data.modifiedTime || '',
          subfolders: []
        };
      }

      // Get subfolders
      const subfolders = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime)',
        orderBy: 'name'
      });

      const folderData: FolderStructure = {
        id: folder.data.id || '',
        name: folder.data.name || '',
        mimeType: folder.data.mimeType || '',
        parents: folder.data.parents || undefined,
        webViewLink: folder.data.webViewLink || undefined,
        createdTime: folder.data.createdTime || '',
        modifiedTime: folder.data.modifiedTime || '',
        subfolders: []
      };

      for (const subfolder of subfolders.data.files || []) {
        if (subfolder.id) {
          const subfolderStructure = await this.getFolderStructure(subfolder.id, maxDepth - 1);
          folderData.subfolders.push(subfolderStructure);
        }
      }

      return folderData;
    } catch (error) {
      console.error('Error getting folder structure:', error);
      throw new Error(`Failed to get folder structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use Gemini to analyze folder structure and provide insights
   */
  async analyzeFolderStructure(folderStructure: Record<string, unknown>, analysisPrompt?: string): Promise<string> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not configured for folder analysis');
    }

    const defaultPrompt = `
Analyze the following Google Drive folder structure and provide insights:

${JSON.stringify(folderStructure, null, 2)}

Please provide:
1. A summary of the folder organization
2. Any patterns or inconsistencies you notice
3. Suggestions for better organization (if applicable)
4. Key findings about the content structure
`;

    const prompt = analysisPrompt || defaultPrompt;

    try {
      const result = await this.geminiClient['model'].generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      return content || 'No analysis available';
    } catch (error) {
      console.error('Failed to analyze folder structure with Gemini:', error);
      return 'Folder analysis failed due to an error';
    }
  }

  /**
   * Intelligent folder search using Gemini for query interpretation
   */
  async intelligentFolderSearch(naturalQuery: string): Promise<{
    searchResults: DriveSearchResult[];
    interpretedQuery: Partial<FolderSearchQuery>;
    analysis?: string;
  }> {
    try {
      // Use Gemini to interpret the natural language query
      const interpretedQuery = await this.interpretSearchQuery(naturalQuery);
      
      // Execute the search with default values for required fields
      const searchParams: FolderSearchQuery = {
        query: interpretedQuery.query || naturalQuery,
        folderName: interpretedQuery.folderName,
        parentFolderId: interpretedQuery.parentFolderId,
        includeSubfolders: interpretedQuery.includeSubfolders,
        maxResults: interpretedQuery.maxResults || 50
      };
      
      const searchResults = await this.searchFolders(searchParams);
      
      // Use Gemini to analyze the results if we have any
      let analysis: string | undefined;
      if (searchResults.length > 0 && this.geminiClient) {
        analysis = await this.analyzeFolderStructure(
          { 
            query: naturalQuery, 
            results: searchResults,
            totalResults: searchResults.length 
          },
          `Analyze these Google Drive search results for the query "${naturalQuery}": ${JSON.stringify(searchResults, null, 2)}`
        );
      }

      return {
        searchResults,
        interpretedQuery,
        analysis
      };
    } catch (error) {
      console.error('Intelligent folder search failed:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile({
    folderId,
    fileName,
    fileType,
    fileContent
  }: {
    folderId: string;
    fileName: string;
    fileType: string;
    fileContent?: string | null;
  }): Promise<{
    id: string;
    name: string;
    webViewLink?: string;
  }> {
    try {
      const fileMetadata = {
        name: fileName,
        mimeType: fileType,
        parents: [folderId]
      };

      // If we have file content (base64), create the file with content
      if (fileContent) {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileContent, 'base64');
        
        try {
          // Convert buffer to Readable stream to avoid pipe error
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null); // End the stream
          
          // Use stream instead of buffer
          const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media: {
              mimeType: fileType,
              body: stream
            },
            fields: 'id,name,webViewLink'
          });

          return {
            id: response.data.id || '',
            name: response.data.name || fileName,
            webViewLink: response.data.webViewLink || undefined
          };
        } catch (uploadError) {
          console.error('Error uploading file with content:', uploadError);
          
          // Fallback: create empty file
          try {
            const response = await this.drive.files.create({
              requestBody: fileMetadata,
              fields: 'id,name,webViewLink'
            });
            
            return {
              id: response.data.id || '',
              name: response.data.name || fileName,
              webViewLink: response.data.webViewLink || undefined
            };
          } catch (createError) {
            console.error('Error creating empty file:', createError);
            throw new Error(`Failed to create file: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
          }
        }
      } else {
        // Create an empty file if no content provided
        const response = await this.drive.files.create({
          requestBody: fileMetadata,
          fields: 'id,name,webViewLink'
        });

        return {
          id: response.data.id || '',
          name: response.data.name || fileName,
          webViewLink: response.data.webViewLink || undefined
        };
      }
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List root folders in Google Drive
   */
  async listRootFolders(): Promise<DriveSearchResult[]> {
    try {
      const response = await this.drive.files.list({
        q: "'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id,name,mimeType,createdTime,modifiedTime)',
        orderBy: 'name',
        pageSize: 100
      });

      return (response.data.files || []).map(file => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        createdTime: file.createdTime || '',
        modifiedTime: file.modifiedTime || ''
      }));
    } catch (error) {
      console.error('Error listing root folders:', error);
      throw new Error(`Failed to list root folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get folder contents and metadata
   */
  async getFolderContents(folderId: string): Promise<{
    folder: { id: string; name: string; path: string[] };
    contents: Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      createdTime: string;
      modifiedTime: string;
    }>;
  }> {
    try {
      // Get folder info
      const folderResponse = await this.drive.files.get({
        fileId: folderId,
        fields: 'id,name,parents'
      });

      const folder = folderResponse.data;

      // Get folder contents
      const contentsResponse = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime)',
        orderBy: 'name',
        pageSize: 100
      });

      const contents = contentsResponse.data.files || [];

      // Build folder path for breadcrumb navigation
      let folderPath: string[] = [];
      if (folder.parents && folder.parents.length > 0) {
        try {
          const parentResponse = await this.drive.files.get({
            fileId: folder.parents[0],
            fields: 'name'
          });
          folderPath = [parentResponse.data.name || 'Unknown'];
        } catch (error) {
          console.warn('Could not get parent folder name:', error);
        }
      }

      return {
        folder: {
          id: folder.id || '',
          name: folder.name || '',
          path: folderPath
        },
        contents: contents.map(item => ({
          id: item.id || '',
          name: item.name || '',
          mimeType: item.mimeType || '',
          size: item.size || undefined,
          createdTime: item.createdTime || '',
          modifiedTime: item.modifiedTime || ''
        }))
      };
    } catch (error) {
      console.error('Error getting folder contents:', error);
      throw new Error(`Failed to get folder contents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from a Google Drive document
   */
  async extractDocumentContent(documentId: string): Promise<{ content: string; wasTruncated: boolean }> {
    try {
      // Get file metadata first
      const fileResponse = await this.drive.files.get({
        fileId: documentId,
        fields: 'id,name,mimeType'
      });

      const file = fileResponse.data;
      const mimeType = file.mimeType;

      let content = '';

      // Handle different Google Workspace file types
      if (mimeType === 'application/vnd.google-apps.document') {
        // Google Docs - export as plain text
        const exportResponse = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/plain'
        });
        content = exportResponse.data as string;
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Google Sheets - export as CSV
        const exportResponse = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/csv'
        });
        content = exportResponse.data as string;
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        // Google Slides - export as plain text
        const exportResponse = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/plain'
        });
        content = exportResponse.data as string;
      } else if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'application/pdf') {
        // Plain text, CSV, or PDF files - download content
        const downloadResponse = await this.drive.files.get({
          fileId: documentId,
          alt: 'media'
        });
        content = downloadResponse.data as string;
      } else {
        // For other file types, return a placeholder
        content = `[Content extraction not supported for ${mimeType} files]`;
      }

      // Clean up the content
      let wasTruncated = false;
      if (content) {
        // Remove extra whitespace and normalize line breaks
        content = content.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Limit content length to prevent overwhelming the AI
        if (content.length > 100000) {
          content = content.substring(0, 100000) + '\n\n[Content truncated - document is too long]';
          wasTruncated = true;
        }
      }

      return {
        content: content || 'No content could be extracted from this document.',
        wasTruncated
      };
    } catch (error) {
      console.error('Error extracting document content:', error);
      throw new Error(`Failed to extract content from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set Gemini client after initialization
   */
  setGeminiClient(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Update configuration and reinitialize
   */
  updateConfig(newConfig: Partial<GoogleDriveConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initializeDrive();
  }
}


