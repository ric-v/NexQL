const vscode = acquireVsCodeApi();
let isGenerating = false;

function getQueryText() {
  const el = document.getElementById('queryPreview');
  return el ? el.textContent || '' : '';
}

function setButtonLoading(loading) {
  const button = document.getElementById('btnAiAll');
  if (!button) return;
  if (loading) {
    button.disabled = true;
    const originalText = button.innerHTML;
    button.setAttribute('data-original-text', originalText);
    button.innerHTML = '<span class="ai-loading"></span> Generating...';
  } else {
    button.disabled = false;
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
      button.innerHTML = originalText;
    }
  }
}

function generateAll() {
  if (isGenerating) return;
  isGenerating = true;
  setButtonLoading(true);
  vscode.postMessage({ command: 'generateAI', field: 'all' });
}

document.getElementById('btnAiAll')?.addEventListener('click', generateAll);

document.getElementById('btnCancel')?.addEventListener('click', () => {
  vscode.postMessage({ command: 'cancel' });
});

document.getElementById('saveForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const tags = document.getElementById('tags').value;
  const query = getQueryText();
  vscode.postMessage({ command: 'save', title, description, tags, query });
});

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'aiGenerated':
      isGenerating = false;
      if (message.field === 'all' && message.values) {
        document.getElementById('title').value = message.values.title;
        document.getElementById('description').value = message.values.description;
        document.getElementById('tags').value = message.values.tags;
      } else if (message.value !== undefined) {
        const field = document.getElementById(message.field);
        if (field) field.value = message.value;
      }
      setButtonLoading(false);
      break;
    case 'aiError':
      isGenerating = false;
      setButtonLoading(false);
      alert(message.message);
      break;
    case 'loadEditData':
      if (message.data) {
        document.getElementById('title').value = message.data.title || '';
        document.getElementById('description').value = message.data.description || '';
        document.getElementById('tags').value = message.data.tags || '';
        const preview = document.getElementById('queryPreview');
        if (preview && message.data.query) {
          preview.textContent = message.data.query;
        }
      }
      break;
    case 'updateQuery':
      if (message.query) {
        const preview = document.getElementById('queryPreview');
        if (preview) preview.textContent = message.query;
      }
      break;
  }
});
