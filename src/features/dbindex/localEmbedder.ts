import * as vscode from 'vscode';

let pipelinePromise: any = null;

export async function getLocalPipeline(
  globalStorageUri: vscode.Uri,
  progress?: vscode.Progress<{ message?: string }>,
  cancellationToken?: vscode.CancellationToken
): Promise<any> {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  pipelinePromise = (async () => {
    // Dynamic import to avoid loading it when not used
    const { pipeline, env } = await import('@huggingface/transformers');

    // Configure cache directory under globalStorageUri
    env.cacheDir = vscode.Uri.joinPath(globalStorageUri, 'dbindex', 'models').fsPath;
    env.localModelPath = null as any;

    if (progress) {
      progress.report({ message: 'Loading local embedding model (Xenova/all-MiniLM-L6-v2)...' });
    }

    if (cancellationToken?.isCancellationRequested) {
      pipelinePromise = null;
      throw new vscode.CancellationError();
    }

    return await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (info: any) => {
        if (cancellationToken?.isCancellationRequested) {
          throw new vscode.CancellationError();
        }
        if (info.status === 'progress' && progress) {
          progress.report({ message: `Downloading model: ${info.file} (${Math.round(info.progress)}%)` });
        }
      }
    });
  })();

  try {
    return await pipelinePromise;
  } catch (err) {
    pipelinePromise = null; // Reset on failure so we can try again
    throw err;
  }
}

export async function generateLocalEmbedding(
  text: string,
  globalStorageUri: vscode.Uri,
  progress?: vscode.Progress<{ message?: string }>,
  cancellationToken?: vscode.CancellationToken
): Promise<number[]> {
  const pipe = await exports.getLocalPipeline(globalStorageUri, progress, cancellationToken);
  if (cancellationToken?.isCancellationRequested) {
    throw new vscode.CancellationError();
  }
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function generateLocalEmbeddingsBatch(
  texts: string[],
  globalStorageUri: vscode.Uri,
  progress?: vscode.Progress<{ message?: string }>,
  cancellationToken?: vscode.CancellationToken
): Promise<number[][]> {
  const pipe = await exports.getLocalPipeline(globalStorageUri, progress, cancellationToken);
  const results: number[][] = [];
  
  for (let i = 0; i < texts.length; i++) {
    if (cancellationToken?.isCancellationRequested) {
      throw new vscode.CancellationError();
    }
    if (progress) {
      progress.report({ message: `Generating local embeddings: ${i + 1}/${texts.length}` });
    }
    const output = await pipe(texts[i], { pooling: 'mean', normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }
  
  return results;
}
