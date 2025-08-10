/**
 * Database utility functions for common Supabase operations and query patterns
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  filters?: Record<string, any>;
  select?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface QueryResult<T> {
  data: T[] | null;
  error: any;
  count?: number;
}

/**
 * Generic query builder with common options
 */
export const buildQuery = <T>(
  supabase: SupabaseClient,
  table: string,
  options: QueryOptions = {}
) => {
  let query = supabase.from(table).select(options.select || '*');
  
  // Apply filters
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          // Handle LIKE queries
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    }
  }
  
  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true
    });
  }
  
  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
  }
  
  return query;
};

/**
 * Execute a query with error handling and logging
 */
export const executeQuery = async <T>(
  query: any,
  operation: string = 'database query'
): Promise<QueryResult<T>> => {
  try {
    const { data, error, count } = await query;
    
    if (error) {
      logger.error(`Database error in ${operation}:`, error);
      return { data: null, error };
    }
    
    logger.log(`Successfully executed ${operation}`, { count: data?.length || 0 });
    return { data, error: null, count };
  } catch (err) {
    logger.error(`Unexpected error in ${operation}:`, err);
    return { data: null, error: err };
  }
};

/**
 * Get a single record by ID
 */
export const getById = async <T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  select?: string
): Promise<QueryResult<T>> => {
  const query = supabase
    .from(table)
    .select(select || '*')
    .eq('id', id)
    .single();
  
  return executeQuery(query, `get ${table} by ID`);
};

/**
 * Get records with pagination
 */
export const getPaginated = async <T>(
  supabase: SupabaseClient,
  table: string,
  options: PaginationOptions & QueryOptions
): Promise<QueryResult<T>> => {
  const { page, limit, ...queryOptions } = options;
  const offset = (page - 1) * limit;
  
  const query = buildQuery(supabase, table, {
    ...queryOptions,
    limit,
    offset
  });
  
  return executeQuery(query, `get paginated ${table}`);
};

/**
 * Get count of records with filters
 */
export const getCount = async (
  supabase: SupabaseClient,
  table: string,
  filters?: Record<string, any>
): Promise<{ count: number | null; error: any }> => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }
  }
  
  const { count, error } = await query;
  
  if (error) {
    logger.error(`Error getting count from ${table}:`, error);
  }
  
  return { count, error };
};

/**
 * Insert a single record
 */
export const insertRecord = async <T>(
  supabase: SupabaseClient,
  table: string,
  data: Partial<T>
): Promise<QueryResult<T>> => {
  const query = supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  return executeQuery(query, `insert ${table} record`);
};

/**
 * Insert multiple records
 */
export const insertRecords = async <T>(
  supabase: SupabaseClient,
  table: string,
  data: Partial<T>[]
): Promise<QueryResult<T>> => {
  const query = supabase
    .from(table)
    .insert(data)
    .select();
  
  return executeQuery(query, `insert multiple ${table} records`);
};

/**
 * Update a record by ID
 */
export const updateRecord = async <T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  data: Partial<T>
): Promise<QueryResult<T>> => {
  const query = supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  return executeQuery(query, `update ${table} record`);
};

/**
 * Delete a record by ID
 */
export const deleteRecord = async (
  supabase: SupabaseClient,
  table: string,
  id: string
): Promise<{ success: boolean; error: any }> => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) {
    logger.error(`Error deleting ${table} record:`, error);
    return { success: false, error };
  }
  
  logger.log(`Successfully deleted ${table} record with ID: ${id}`);
  return { success: true, error: null };
};

/**
 * Soft delete (hide) a record by setting hidden flag
 */
export const softDeleteRecord = async (
  supabase: SupabaseClient,
  table: string,
  id: string
): Promise<{ success: boolean; error: any }> => {
  const { error } = await supabase
    .from(table)
    .update({ is_hidden: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    logger.error(`Error soft deleting ${table} record:`, error);
    return { success: false, error };
  }
  
  logger.log(`Successfully soft deleted ${table} record with ID: ${id}`);
  return { success: true, error: null };
};

/**
 * Check if a record exists
 */
export const recordExists = async (
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, any>
): Promise<{ exists: boolean; error: any }> => {
  let query = supabase
    .from(table)
    .select('id')
    .limit(1);
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error(`Error checking if ${table} record exists:`, error);
    return { exists: false, error };
  }
  
  return { exists: (data?.length || 0) > 0, error: null };
};

/**
 * Get records by a specific field value
 */
export const getByField = async <T>(
  supabase: SupabaseClient,
  table: string,
  field: string,
  value: any,
  select?: string
): Promise<QueryResult<T>> => {
  const query = supabase
    .from(table)
    .select(select || '*')
    .eq(field, value);
  
  return executeQuery(query, `get ${table} by ${field}`);
};

/**
 * Search records with text search
 */
export const searchRecords = async <T>(
  supabase: SupabaseClient,
  table: string,
  searchField: string,
  searchTerm: string,
  options: QueryOptions = {}
): Promise<QueryResult<T>> => {
  const query = buildQuery(supabase, table, options)
    .ilike(searchField, `%${searchTerm}%`);
  
  return executeQuery(query, `search ${table} records`);
};

/**
 * Transaction helper for multiple operations
 */
export const executeTransaction = async <T>(
  operations: (() => Promise<T>)[],
  rollbackOnError: boolean = true
): Promise<{ success: boolean; results: T[]; error: any }> => {
  const results: T[] = [];
  
  try {
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    
    return { success: true, results, error: null };
  } catch (error) {
    logger.error('Transaction failed:', error);
    
    if (rollbackOnError) {
      logger.log('Rolling back transaction...');
      // Note: Supabase doesn't support true transactions in the client
      // This is a best-effort rollback
    }
    
    return { success: false, results, error };
  }
};
