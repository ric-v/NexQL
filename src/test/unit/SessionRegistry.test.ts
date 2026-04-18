import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import {
  SessionRegistry,
  getLatestNumberedUri,
  getNewNotebookUri,
  getScratchUri,
  isNotebookForSession
} from '../../services/SessionRegistry';

describe('SessionRegistry', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    for (const [connectionId] of SessionRegistry.entries()) {
      SessionRegistry.delete(connectionId);
    }
    (vscode as any).FileType = { File: 1 };
    (vscode.workspace.fs as any).readDirectory = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
    for (const [connectionId] of SessionRegistry.entries()) {
      SessionRegistry.delete(connectionId);
    }
  });

  it('stores and manages notebook sessions', () => {
    const notebook = { uri: vscode.Uri.file('/tmp/session.pgsql') } as any;

    expect(SessionRegistry.has('conn-1')).to.be.false;
    SessionRegistry.set('conn-1', notebook);
    expect(SessionRegistry.has('conn-1')).to.be.true;
    expect(SessionRegistry.get('conn-1')).to.equal(notebook);
    expect(Array.from(SessionRegistry.entries())).to.deep.equal([['conn-1', notebook]]);

    SessionRegistry.delete('conn-1');
    expect(SessionRegistry.has('conn-1')).to.be.false;
    expect(SessionRegistry.get('conn-1')).to.equal(undefined);
  });

  it('builds scratch and session notebook URIs with sanitized path segments', () => {
    const storage = vscode.Uri.file('/var/storage');
    const scratch = getScratchUri(storage, 'connection-1', 'sales db', 'Primary Connection!');

    expect(scratch.path).to.equal('/var/storage/Primary_Connection_/sales_db/scratch.pgsql');
    expect(isNotebookForSession(scratch, 'sales db', 'Primary Connection!', 'connection-1')).to.be.true;
    expect(isNotebookForSession(vscode.Uri.file('/var/storage/other/other/file.pgsql'), 'sales db', 'Primary Connection!', 'connection-1')).to.be.false;
  });

  it('finds a new notebook URI when the first generated name already exists', async () => {
    const statStub = sandbox.stub(vscode.workspace.fs, 'stat');
    statStub.onCall(0).resolves({} as any);
    statStub.onCall(1).rejects(new Error('FileNotFound'));

    const storage = vscode.Uri.file('/var/storage');
    const newNotebook = await getNewNotebookUri(storage, 'analytics db', 'Primary Connection!');
    expect(newNotebook.path).to.match(/^\/var\/storage\/Primary_Connection_\/analytics_db\/.*\.pgsql$/);
    expect(statStub.callCount).to.equal(2);
  });

  it('finds the latest numbered notebook by modification time', async () => {
    const readDirectoryStub = vscode.workspace.fs.readDirectory as sinon.SinonStub;
    readDirectoryStub.resolves([
      ['scratch.pgsql', (vscode as any).FileType.File],
      ['old.pgsql', (vscode as any).FileType.File],
      ['newest.pgsql', (vscode as any).FileType.File],
      ['ignore.txt', 0]
    ] as any);

    const statStub = sandbox.stub(vscode.workspace.fs, 'stat');
    statStub.callsFake(async (uri: vscode.Uri) => {
      if (uri.path.endsWith('old.pgsql')) {
        return { mtime: 1000 } as any;
      }
      if (uri.path.endsWith('newest.pgsql')) {
        return { mtime: 2000 } as any;
      }
      return { mtime: 500 } as any;
    });

    const latest = await getLatestNumberedUri(vscode.Uri.file('/var/storage'), 'analytics db', 'Primary Connection!');
    expect(latest?.path).to.equal('/var/storage/Primary_Connection_/analytics_db/newest.pgsql');
    expect(readDirectoryStub.calledOnce).to.be.true;
  });
});
