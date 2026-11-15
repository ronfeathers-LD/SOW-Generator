import { describe, it, expect } from 'vitest';
import { GoogleDriveService } from './google-drive';

type Call = Record<string, unknown>;

function serviceWith(files: Record<string, (params: Call) => unknown>) {
  const svc = new GoogleDriveService({
    clientId: 'x',
    clientSecret: 'y',
    redirectUri: 'z',
    refreshToken: 'r',
    allowedFolderIds: [],
  });
  (svc as unknown as { drive: unknown }).drive = {
    files: Object.fromEntries(
      Object.entries(files).map(([k, fn]) => [k, async (p: Call) => fn(p)])
    ),
  };
  return svc;
}

describe('searchFolders folderName escaping (#138)', () => {
  it('escapes quotes and backslashes in the exact-name query', async () => {
    const queries: string[] = [];
    const svc = serviceWith({
      list: (p) => {
        queries.push(p.q as string);
        return { data: { files: [] } };
      },
    });
    await svc.searchFolders({ folderName: "Bob's\\ x' or name contains '" });
    expect(queries[0]).toContain("name='Bob\\'s\\\\ x\\' or name contains \\''");
  });
});

describe('getFolderStructure pagination (#143)', () => {
  it('follows nextPageToken for subfolders', async () => {
    const svc = serviceWith({
      get: (p) => ({ data: { id: p.fileId, name: `n-${p.fileId}`, mimeType: 'folder' } }),
      list: (p) => {
        const q = p.q as string;
        if (q.startsWith("'root'")) {
          return p.pageToken
            ? { data: { files: [{ id: 'b' }] } }
            : { data: { files: [{ id: 'a' }], nextPageToken: 't2' } };
        }
        return { data: { files: [] } };
      },
    });
    const tree = await svc.getFolderStructure('root', 1);
    expect(tree.subfolders.map((f) => f.id)).toEqual(['a', 'b']);
  });
});

describe('uploadFile failure (#145)', () => {
  it('throws instead of creating an empty file when the content upload fails', async () => {
    let calls = 0;
    const svc = serviceWith({
      create: (p) => {
        calls++;
        if (p.media) throw new Error('boom');
        return { data: { id: 'empty', name: 'f' } };
      },
    });
    await expect(
      svc.uploadFile({ folderId: 'f', fileName: 'a.pdf', fileType: 'application/pdf', fileContent: 'aGk=' })
    ).rejects.toThrow(/Failed to upload file/);
    expect(calls).toBe(1);
  });
});
