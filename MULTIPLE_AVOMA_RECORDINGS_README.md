# Multiple Avoma Recordings Feature

## Overview
This feature allows users to add multiple Avoma meeting recordings to a single SOW, providing richer context for AI analysis and more comprehensive project understanding.

## Features

### 1. Multiple Recording Support
- Add unlimited Avoma meeting URLs to a single SOW
- Each recording is tracked independently with status, title, and date
- Automatic transcription fetching for each recording

### 2. Enhanced AI Analysis
- Combines all transcriptions for comprehensive analysis
- Clear separation between different recording sources
- Better context for generating objectives and deliverables

### 3. User Experience Improvements
- Clean, intuitive interface for managing multiple recordings
- Status indicators (pending, completed, failed)
- Individual transcription management per recording
- Legacy transcription support for backward compatibility

## Technical Implementation

### Database Schema
- New `avoma_recordings` table with proper RLS policies
- UUID-based primary keys for scalability
- Timestamp tracking for audit purposes
- Status enum for recording state management

### Frontend Components
- Updated `ObjectivesTab.tsx` with multiple recording interface
- State management for recording arrays
- Individual transcription fetching and display
- Error handling and user feedback

### API Integration
- Enhanced transcription analysis to combine multiple sources
- Individual recording management endpoints
- Proper error handling and status updates

## Usage

### Adding Recordings
1. Navigate to the Objectives tab in SOW edit mode
2. Enter an Avoma meeting URL in the "Add New Recording" field
3. Click "Add Recording" to add it to the list
4. The system automatically fetches the transcription

### Managing Recordings
- View all recordings with their current status
- Remove recordings using the delete button
- Retry failed transcriptions
- Edit recording titles and metadata

### AI Analysis
- Analysis automatically combines all available transcriptions
- Clear source identification for each transcription segment
- Enhanced context for better AI-generated content

## Migration Notes

### Database Migration
Run the `add-avoma-recordings-table.sql` migration to:
- Create the new `avoma_recordings` table
- Set up proper indexes and RLS policies
- Enable timestamp triggers

### Backward Compatibility
- Existing SOWs with single transcriptions continue to work
- Legacy transcription field is preserved and displayed
- New recordings are stored separately for better organization

## Benefits

1. **Richer Context**: Multiple meetings provide comprehensive project understanding
2. **Better AI Analysis**: Combined transcriptions lead to more accurate objectives
3. **Flexible Workflow**: Add recordings as they become available
4. **Improved Organization**: Clear separation and management of different meeting sources
5. **Scalability**: Support for unlimited recordings per SOW

## Future Enhancements

- Bulk import of multiple Avoma URLs
- Recording categorization and tagging
- Advanced transcription search and filtering
- Integration with meeting scheduling systems
- Automated transcription quality assessment
