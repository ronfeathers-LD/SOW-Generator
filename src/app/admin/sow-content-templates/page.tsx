'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SOWContentTemplate } from '@/types/sow';
import TipTapEditor from '@/components/TipTapEditor';
import { DEFAULT_SEGMENT_RULES } from '@/lib/segment-rules';

// Segment options for the selector: Global (segment = null) first, then the
// four segment codes with display names sourced from segment_rules (static
// import is fine here — this is admin-only display metadata, not a pricing
// calculation; see task-6 brief).
const SEGMENT_OPTIONS: { code: string | null; label: string }[] = [
  { code: null, label: 'Global (default)' },
  ...Object.values(DEFAULT_SEGMENT_RULES).map((rule) => ({
    code: rule.segment,
    label: `${rule.segment} — ${rule.displayName}`,
  })),
];

function segmentLabel(code: string | null | undefined): string {
  const normalized = code ?? null;
  const match = SEGMENT_OPTIONS.find((o) => o.code === normalized);
  return match ? (normalized === null ? 'Global' : normalized) : (normalized as string);
}

export default function SOWContentTemplatesPage() {
  const [templates, setTemplates] = useState<SOWContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Define the desired order of sections with metadata - memoized to prevent recreation
  const sections = useMemo(() => [
    { id: 'intro', name: 'Introduction', description: 'Opening content for the SOW' },
    { id: 'objectives-disclosure', name: 'Objectives', description: 'Disclosure about objectives' },
    { id: 'scope', name: 'Scope', description: 'Project scope and deliverables' },
    { id: 'out-of-scope', name: 'Out of Scope', description: 'What is not included in the project' },
    { id: 'project-phases', name: 'Project Phases', description: 'Detailed project phases and activities' },
    { id: 'assumptions', name: 'Assumptions', description: 'Project assumptions and constraints' }
  ], []);

  const sectionOrder = useMemo(() => sections.map(s => s.id), [sections]);

  const sortTemplates = useCallback((templates: SOWContentTemplate[]) => {
    return templates.sort((a, b) => {
      const aIndex = sectionOrder.indexOf(a.section_name);
      const bIndex = sectionOrder.indexOf(b.section_name);

      // If both sections are in our defined order, sort by that
      if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      // If only one is in our defined order, prioritize it
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;

      // Same section (or neither in our defined order and alphabetically
      // equal) — group variants together, Global first, then by segment code.
      if (a.section_name !== b.section_name) {
        return a.section_name.localeCompare(b.section_name);
      }
      const aSeg = a.segment ?? '';
      const bSeg = b.segment ?? '';
      if (aSeg === bSeg) return 0;
      if (aSeg === '') return -1;
      if (bSeg === '') return 1;
      return aSeg.localeCompare(bSeg);
    });
  }, [sectionOrder]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sow-content-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(sortTemplates(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [sortTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async (template: Partial<SOWContentTemplate>) => {
    setSaving(true);
    setError(null);

    try {
      const url = template.id
        ? `/api/admin/sow-content-templates/${template.id}`
        : '/api/admin/sow-content-templates';

      const method = template.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to save template');
      }

      const savedTemplate = await response.json();

      // Update local state immediately instead of refetching
      setTemplates(prevTemplates => {
        const existingIndex = prevTemplates.findIndex(t => t.id === savedTemplate.id);

        if (existingIndex >= 0) {
          // Update existing template
          const updated = [...prevTemplates];
          updated[existingIndex] = savedTemplate;
          return sortTemplates(updated);
        } else {
          // Add new template
          return sortTemplates([...prevTemplates, savedTemplate]);
        }
      });
      setActiveSegment(savedTemplate.segment ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (source: SOWContentTemplate, targetSegment: string) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/sow-content-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section_name: source.section_name,
          section_title: source.section_title,
          default_content: source.default_content,
          description: source.description,
          sort_order: source.sort_order,
          segment: targetSegment,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to duplicate template');
      }

      const savedTemplate = await response.json();
      setTemplates(prev => sortTemplates([...prev, savedTemplate]));
      setActiveSegment(targetSegment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const rowsForActiveSection = useMemo(
    () => templates.filter(t => t.section_name === activeSection),
    [templates, activeSection]
  );

  const getCurrentTemplate = useCallback(() => {
    return rowsForActiveSection.find(t => (t.segment ?? null) === activeSegment);
  }, [rowsForActiveSection, activeSegment]);

  const existingSegments = useMemo(
    () => new Set(rowsForActiveSection.map(t => t.segment ?? null)),
    [rowsForActiveSection]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">SOW Content Templates</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Subnav */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {sections.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setActiveSegment(null);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {section.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {sections.find(s => s.id === activeSection)?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {sections.find(s => s.id === activeSection)?.description}
          </p>

          {/* Per-section variant chips: which segments have a row today. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">
              Variants
            </span>
            {SEGMENT_OPTIONS.map((option) => {
              const hasRow = existingSegments.has(option.code);
              const isSelected = activeSegment === option.code;
              return (
                <button
                  key={option.code ?? 'global'}
                  type="button"
                  onClick={() => setActiveSegment(option.code)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : hasRow
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-gray-50 text-gray-400 border-dashed border-gray-300 hover:bg-gray-100'
                  }`}
                  title={hasRow ? `${option.label} row exists` : `No ${option.label} row yet`}
                >
                  {option.code ?? 'Global'}
                  {!hasRow && ' (none)'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <SectionEditor
            key={`${activeSection}:${activeSegment ?? 'global'}`}
            section={sections.find(s => s.id === activeSection)!}
            template={getCurrentTemplate()}
            activeSegment={activeSegment}
            onSegmentChange={setActiveSegment}
            onSave={handleSave}
            onDuplicate={handleDuplicate}
            existingSegments={existingSegments}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}

interface SectionEditorProps {
  section: { id: string; name: string; description: string };
  template?: SOWContentTemplate;
  activeSegment: string | null;
  onSegmentChange: (segment: string | null) => void;
  onSave: (template: Partial<SOWContentTemplate>) => void;
  onDuplicate: (source: SOWContentTemplate, targetSegment: string) => void;
  existingSegments: Set<string | null>;
  saving: boolean;
}

function SectionEditor({
  section,
  template,
  activeSegment,
  onSegmentChange,
  onSave,
  onDuplicate,
  existingSegments,
  saving,
}: SectionEditorProps) {
  const [formData, setFormData] = useState<Partial<SOWContentTemplate>>({
    id: template?.id,
    section_name: section.id,
    section_title: section.name,
    description: section.description,
    default_content: template?.default_content || '',
    sort_order: template?.sort_order || 0,
    is_active: true,
    segment: template?.segment ?? activeSegment,
  });
  const [duplicateTarget, setDuplicateTarget] = useState<string>('');

  // Update form data when the underlying row (section, segment) changes, but
  // not while a save is in flight. Handles both "row exists" (load it) and
  // "no row for this segment yet" (blank form addressed at that segment).
  useEffect(() => {
    if (saving) return;
    if (template) {
      setFormData({
        id: template.id,
        section_name: section.id,
        section_title: section.name,
        description: section.description,
        default_content: template.default_content || '',
        sort_order: template.sort_order || 0,
        is_active: template.is_active ?? true,
        segment: template.segment ?? null,
      });
    } else {
      setFormData({
        id: undefined,
        section_name: section.id,
        section_title: section.name,
        description: section.description,
        default_content: '',
        sort_order: 0,
        is_active: true,
        segment: activeSegment,
      });
    }
  }, [template, section.id, section.name, section.description, saving, activeSegment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleSegmentSelect = (value: string) => {
    const segment = value === '' ? null : value;
    setFormData({ ...formData, segment });
    onSegmentChange(segment);
  };

  // Segments that don't already have a row for this section — the only
  // sensible "duplicate to" targets (duplicating onto an existing segment
  // would just 409).
  const duplicateTargets = SEGMENT_OPTIONS.filter(
    (o) => o.code !== null && !existingSegments.has(o.code)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Segment
        </label>
        <select
          value={formData.segment ?? ''}
          onChange={(e) => handleSegmentSelect(e.target.value)}
          className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {SEGMENT_OPTIONS.map((option) => (
            <option key={option.code ?? 'global'} value={option.code ?? ''}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Global content is used unless a matching segment-specific row exists for this section.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content
        </label>
        <div className="mt-1">
          <TipTapEditor
            value={formData.default_content || ''}
            onChange={(value) => setFormData({ ...formData, default_content: value })}
            placeholder={`Enter the default content for ${section.name.toLowerCase()}...`}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          You can use the toolbar above to format your content with headers, bold text, lists, tables, and more.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {'{clientName}'} is resolved in the Introduction  and {'{deliverables}'} is for the Scope section.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {template && duplicateTargets.length > 0 && (
            <>
              <select
                value={duplicateTarget}
                onChange={(e) => setDuplicateTarget(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
                <option value="">Duplicate to segment…</option>
                {duplicateTargets.map((option) => (
                  <option key={option.code} value={option.code as string}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!duplicateTarget || saving}
                onClick={() => {
                  if (duplicateTarget) {
                    onDuplicate(template, duplicateTarget);
                    setDuplicateTarget('');
                  }
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Duplicate
              </button>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? 'Saving...'
            : `${template ? 'Update' : 'Create'} ${segmentLabel(formData.segment)} Template`}
        </button>
      </div>
    </form>
  );
}
