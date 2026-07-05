import { describe, it, expect } from 'vitest';
import { GoogleDriveService } from './google-drive';

/**
 * Exercises the object-level authorization logic added for audit #74
 * (isWithinAllowedRoots / hasAccessAllowlist) by injecting a fake Drive client
 * that models a parent hierarchy — no network, no googleapis mock needed.
 */

// A tiny in-memory Drive: id -> { parents?, driveId? }
type Node = { parents?: string[]; driveId?: string };

function serviceWith(allowedFolderIds: string[], graph: Record<string, Node>) {
  const svc = new GoogleDriveService({
    clientId: 'x',
    clientSecret: 'y',
    redirectUri: 'z',
    refreshToken: 'r',
    allowedFolderIds,
  });
  // Replace the real Drive client with a fake files.get.
  (svc as unknown as { drive: unknown }).drive = {
    files: {
      get: async ({ fileId }: { fileId: string }) => {
        if (!(fileId in graph)) {
          const err = new Error('File not found') as Error & { code?: number };
          err.code = 404;
          throw err;
        }
        return { data: { id: fileId, ...graph[fileId] } };
      },
    },
  };
  return svc;
}

describe('GoogleDriveService allowlist (#74)', () => {
  it('hasAccessAllowlist reflects whether roots are configured', () => {
    expect(serviceWith([], {}).hasAccessAllowlist()).toBe(false);
    expect(serviceWith(['root1'], {}).hasAccessAllowlist()).toBe(true);
  });

  it('is permissive (returns true) when no allowlist is set', async () => {
    const svc = serviceWith([], { anything: {} });
    expect(await svc.isWithinAllowedRoots('anything')).toBe(true);
  });

  it('allows the root id itself', async () => {
    const svc = serviceWith(['root1'], { root1: {} });
    expect(await svc.isWithinAllowedRoots('root1')).toBe(true);
  });

  it('allows a descendant nested several levels under a root', async () => {
    const svc = serviceWith(['root1'], {
      doc: { parents: ['sub'] },
      sub: { parents: ['mid'] },
      mid: { parents: ['root1'] },
      root1: {},
    });
    expect(await svc.isWithinAllowedRoots('doc')).toBe(true);
  });

  it('denies a resource outside every allowed root', async () => {
    const svc = serviceWith(['root1'], {
      doc: { parents: ['other'] },
      other: { parents: ['unrelatedRoot'] },
      unrelatedRoot: {},
      root1: {},
    });
    expect(await svc.isWithinAllowedRoots('doc')).toBe(false);
  });

  it('allows a resource whose containing shared drive is allowlisted', async () => {
    const svc = serviceWith(['sharedDrive1'], {
      doc: { parents: ['folderInDrive'], driveId: 'sharedDrive1' },
      folderInDrive: { driveId: 'sharedDrive1' },
    });
    expect(await svc.isWithinAllowedRoots('doc')).toBe(true);
  });

  it('denies when an ancestor is inaccessible (cannot prove containment)', async () => {
    const svc = serviceWith(['root1'], {
      doc: { parents: ['missingParent'] },
      root1: {},
      // missingParent intentionally absent -> files.get throws
    });
    expect(await svc.isWithinAllowedRoots('doc')).toBe(false);
  });

  it('denies an empty resource id', async () => {
    const svc = serviceWith(['root1'], { root1: {} });
    expect(await svc.isWithinAllowedRoots('')).toBe(false);
  });

  it('terminates on a parent cycle instead of looping forever', async () => {
    const svc = serviceWith(['root1'], {
      a: { parents: ['b'] },
      b: { parents: ['a'] }, // cycle, neither reaches root1
      root1: {},
    });
    expect(await svc.isWithinAllowedRoots('a')).toBe(false);
  });
});
