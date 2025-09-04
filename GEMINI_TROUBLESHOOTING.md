# Gemini Transcription Analysis Error Troubleshooting

## Error Message
```
"Failed to analyze transcription. Please try again or contact support if the issue persists."
```

## Overview
This error occurs when the Gemini AI service fails to analyze transcription data and generate objectives and scope items for SOW creation. The error is a generic fallback message that appears when more specific error handling fails.

## Common Causes and Solutions

### 1. API Key Issues
**Symptoms:**
- Error mentions "AI service is not properly configured"
- No response from Gemini API

**Solutions:**
1. Check the admin panel (`/admin/gemini`) for API key configuration
2. Ensure the API key is valid and not expired
3. Verify the API key is not masked/truncated (should not contain `•` or `····`)
4. Test the API key in Google AI Studio
5. Regenerate the API key if necessary

### 2. Model Overload
**Symptoms:**
- Error mentions "AI service is currently overloaded"
- 503 Service Unavailable errors
- Inconsistent failures

**Solutions:**
1. The system automatically tries different models (fallback mechanism)
2. Wait a few minutes and try again
3. Check if the issue persists across different times
4. Consider switching to a different model in the admin panel

### 3. Response Parsing Issues
**Symptoms:**
- Error mentions "AI response could not be processed"
- Gemini returns content but it's not in expected JSON format

**Solutions:**
1. Check the AI prompt configuration in `/admin/ai-prompts`
2. Ensure the prompt is properly formatted
3. Review recent Gemini logs for parsing errors
4. Test with a simpler prompt if needed

### 4. Network Issues
**Symptoms:**
- Error mentions "Network error occurred"
- Timeout errors
- Intermittent failures

**Solutions:**
1. Check network connectivity
2. Verify firewall settings
3. Try from a different network
4. Check if the issue is environment-specific

### 5. Rate Limiting
**Symptoms:**
- Error mentions "rate limit exceeded"
- Consistent failures after multiple attempts

**Solutions:**
1. Wait before retrying
2. Check API usage quotas
3. Implement request throttling if needed
4. Consider upgrading API plan if necessary

## Diagnostic Tools

### 1. Run the Diagnostic Script
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the diagnostic script
node scripts/diagnose-gemini-errors.js
```

### 2. Check Gemini Logs
1. Navigate to `/admin/gemini-logs`
2. Filter by failed requests (`success: false`)
3. Review error messages and processing times
4. Check for patterns in recent errors

### 3. Test API Configuration
1. Go to `/admin/gemini`
2. Use the "Test Configuration" button
3. Verify the API key works
4. Check the model configuration

### 4. Review AI Prompts
1. Navigate to `/admin/ai-prompts`
2. Ensure at least one prompt is active
3. Check prompt content and formatting
4. Verify prompt version history

## Debugging Steps

### Step 1: Check Configuration
```sql
-- Check Gemini configuration
SELECT * FROM gemini_configs WHERE is_active = true;

-- Check AI prompts
SELECT * FROM ai_prompts WHERE is_active = true ORDER BY sort_order;
```

### Step 2: Review Recent Errors
```sql
-- Get recent failed requests
SELECT 
  created_at,
  customer_name,
  model_used,
  error_message,
  processing_time_ms
FROM gemini_logs 
WHERE success = false 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 3: Check Success Rates
```sql
-- Get success rate by model
SELECT 
  model_used,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  ROUND(
    (SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*)) * 100, 2
  ) as success_rate
FROM gemini_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY model_used
ORDER BY success_rate DESC;
```

## Prevention

### 1. Monitoring
- Set up alerts for high error rates
- Monitor API usage and quotas
- Track response times and success rates

### 2. Configuration Management
- Regularly test API keys
- Keep AI prompts updated and tested
- Maintain fallback model configurations

### 3. Error Handling
- Implement retry logic with exponential backoff
- Use multiple model fallbacks
- Provide clear user feedback for different error types

## Support Information

When contacting support, please provide:
1. The exact error message
2. Customer name and timestamp
3. Gemini log entry ID (if available)
4. Steps to reproduce the issue
5. Environment details (production/staging)

## Related Files
- `src/app/api/gemini/analyze-transcription/route.ts` - Main API endpoint
- `src/lib/gemini.ts` - Gemini client implementation
- `src/lib/gemini-logging.ts` - Logging service
- `scripts/diagnose-gemini-errors.js` - Diagnostic tool
- `/admin/gemini` - Configuration panel
- `/admin/gemini-logs` - Logs viewer
- `/admin/ai-prompts` - Prompt management

