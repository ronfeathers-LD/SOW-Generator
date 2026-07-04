'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/form';

interface DashboardClientProps {
  stats: {
    total: number;
    draft: number;
    in_review: number;
    approved: number;
    rejected: number;
    recalled: number;
  };
  recentSOWs: Array<{
    id: string;
    sow_title?: string;
    client_name?: string;
    status: string;
    created_at: string;
    author?: { name: string };
    products?: Array<{ product: { name: string } }>;
  }>;
  pendingApprovals: Array<{
    id: string;
    sow_title?: string;
    client_name?: string;
    status: string;
    created_at: string;
  }>;
  draftSOWs: Array<{
    id: string;
    sow_title?: string;
    client_name?: string;
    created_at: string;
  }>;
}

// Brand-green text link, legible in both themes (pure #26D07C is too low-contrast
// as text on white, so use the green scale: darker in light, lighter in dark).
const LINK = 'text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300';

export default function DashboardClient({ stats, recentSOWs, pendingApprovals, draftSOWs }: DashboardClientProps) {

  // Status pill colors, dark-safe (explicit dark variants — not the globals shim).
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-muted dark:border-dark-border';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900';
      case 'recalled':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-dark-surface-alt dark:text-dark-text-muted dark:border-dark-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'in_review':
        return 'In Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'recalled':
        return 'Recalled';
      default:
        return status;
    }
  };

  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Unknown date';

  const stat = [
    { label: 'Total', value: stats.total, href: '/sow', numberCls: 'text-gray-900 dark:text-dark-text group-hover:text-green-700 dark:group-hover:text-green-400', rounded: 'rounded-l-lg' },
    { label: 'Draft', value: stats.draft, href: '/sow?status=draft', numberCls: 'text-gray-900 dark:text-dark-text group-hover:text-gray-600 dark:group-hover:text-dark-text-muted', rounded: '' },
    { label: 'In Review', value: stats.in_review, href: '/sow?status=in_review', numberCls: 'text-blue-600 dark:text-blue-400 group-hover:text-blue-700', rounded: '' },
    { label: 'Approved', value: stats.approved, href: '/sow?status=approved', numberCls: 'text-green-600 dark:text-green-400 group-hover:text-green-700', rounded: '' },
    { label: 'Rejected', value: stats.rejected, href: '/sow?status=rejected', numberCls: 'text-red-600 dark:text-red-400 group-hover:text-red-700', rounded: '' },
    { label: 'Recalled', value: stats.recalled, href: '/sow?status=recalled', numberCls: 'text-purple-600 dark:text-purple-400 group-hover:text-purple-700', rounded: 'rounded-r-lg' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Welcome back!</h1>
            <p className="mt-2 text-gray-600 dark:text-dark-text-muted">
              Here&apos;s what&apos;s happening with your SOWs today.
            </p>
          </div>
          <Link
            href="/sow/new"
            className="inline-flex items-center px-6 py-3 rounded-lg transition-colors bg-[#2a2a2a] text-white border border-[#26D07C] hover:bg-[#01eb1d] hover:text-[#2a2a2a]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New SOW
          </Link>
        </div>
      </Card>

      {/* All SOWs Stats */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">All SOWs</h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-muted">Org-wide totals</p>
        </div>
        <Card padding="none" className="overflow-hidden">
          <div className="flex divide-x divide-gray-200 dark:divide-dark-border">
            {stat.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className={`group flex flex-1 flex-col items-center py-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-surface-alt ${s.rounded}`}
              >
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-text-muted">{s.label}</span>
                <span className={`text-xl font-bold transition-colors ${s.numberCls}`}>{s.value}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Resume your drafts — the user's own unfinished SOWs, straight to edit. */}
      {draftSOWs.length > 0 && (
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Resume your drafts</h3>
            {stats.draft > draftSOWs.length && (
              <Link href="/sow?status=draft" className={LINK}>View all {stats.draft} →</Link>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {draftSOWs.map((sow) => (
                <Link
                  key={sow.id}
                  href={`/sow/${sow.id}/edit`}
                  className="group block rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#26D07C] hover:bg-green-50 dark:border-dark-border dark:bg-dark-surface-alt dark:hover:border-[#26D07C] dark:hover:bg-[#26D07C]/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-gray-900 dark:text-dark-text">
                        {sow.client_name || sow.sow_title || 'Untitled draft'}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-dark-text-muted">Created: {formatDate(sow.created_at)}</p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium text-green-700 group-hover:text-green-800 dark:text-green-400 dark:group-hover:text-green-300">
                      Resume →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card padding="none">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Pending Approvals</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pendingApprovals.slice(0, 3).map((sow) => (
                <Card key={sow.id} tone="warning" padding="sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1 text-lg font-semibold text-gray-900 dark:text-dark-text">
                        {sow.client_name || 'No client'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-dark-text-muted">Created: {formatDate(sow.created_at)}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(sow.status)}`}>
                        {getStatusLabel(sow.status)}
                      </span>
                      <Link href={`/sow/${sow.id}`} className={LINK}>Review</Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/sow" className={LINK}>View all SOWs →</Link>
            </div>
          </div>
        </Card>
      )}

      {/* My Recent SOWs */}
      <Card padding="none">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-dark-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">My Recent SOWs</h3>
        </div>
        <div className="p-6">
          {recentSOWs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentSOWs.slice(0, 3).map((sow) => {
                const productNames = sow.products?.map((p) => p.product?.name).filter(Boolean) || [];
                return (
                  <Card key={sow.id} tone="muted" padding="sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="mb-1 text-lg font-semibold text-gray-900 dark:text-dark-text">
                          {sow.client_name || 'No client'}
                        </h4>
                        <p className="mb-2 text-sm text-gray-600 dark:text-dark-text-muted">Created: {formatDate(sow.created_at)}</p>
                        {productNames.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {productNames.map((productName, index) => (
                              <span
                                key={index}
                                className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                              >
                                {productName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center space-x-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(sow.status)}`}>
                          {getStatusLabel(sow.status)}
                        </span>
                        <Link href={`/sow/${sow.id}`} className={LINK}>View</Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                You haven&apos;t created any SOWs yet.
              </p>
              <Link href="/sow/new" className="text-purple-600 hover:underline dark:text-purple-400">
                Create your first SOW →
              </Link>
            </div>
          )}
          <div className="mt-4">
            <Link href="/sow" className={LINK}>View all SOWs →</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
