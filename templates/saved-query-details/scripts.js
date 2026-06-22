const vscode = acquireVsCodeApi();

document.getElementById('btnCopy')?.addEventListener('click', () => {
  vscode.postMessage({ command: 'copy' });
});

document.getElementById('btnDelete')?.addEventListener('click', () => {
  vscode.postMessage({ command: 'delete' });
});

window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.command === 'updateQuery') {
    window.location.reload();
  }
});
