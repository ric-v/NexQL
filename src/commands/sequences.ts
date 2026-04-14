import * as vscode from 'vscode';
import { DatabaseTreeItem } from '../providers/DatabaseTreeProvider';
import { getDatabaseConnection, NotebookBuilder, MarkdownUtils } from './helper';
import { SequenceSQL } from './sql/sequences';

export async function cmdListSequences(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Sequences in Schema: ${schema}`) +
        MarkdownUtils.infoBox('Lists all sequences in this schema with their current values and settings.')
      )
      .addSql(SequenceSQL.list(schema))
      .show();
  } finally {
    release();
  }
}

export async function cmdCreateSequence(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Create Sequence in Schema: ${schema}`) +
        MarkdownUtils.infoBox('Replace "new_sequence_name" with the desired sequence name.')
      )
      .addSql(SequenceSQL.create(schema))
      .show();
  } finally {
    release();
  }
}

export async function cmdDropSequence(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const seqName = item.label;
  const confirm = await vscode.window.showWarningMessage(
    `Drop sequence "${seqName}"? This action cannot be undone.`,
    { modal: true },
    'Drop'
  );
  if (confirm !== 'Drop') { return; }
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Drop Sequence: ${schema}.${seqName}`) +
        MarkdownUtils.dangerBox(`Dropping sequence "${schema}"."${seqName}". This is permanent.`)
      )
      .addSql(SequenceSQL.drop(schema, seqName))
      .show();
  } finally {
    release();
  }
}

export async function cmdSequenceNextValue(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    const seqName = item.label;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Next Value: ${schema}.${seqName}`) +
        MarkdownUtils.warningBox('Calling nextval() will advance the sequence and cannot be rolled back even if the transaction fails.')
      )
      .addSql(SequenceSQL.nextValue(schema, seqName))
      .show();
  } finally {
    release();
  }
}

export async function cmdShowSequenceProperties(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    const seqName = item.label;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Sequence Properties: ${schema}.${seqName}`) +
        MarkdownUtils.infoBox('Full sequence definition including min/max values, increment, and current state.')
      )
      .addSql(SequenceSQL.getDefinition(schema, seqName))
      .addMarkdown('##### Current Value')
      .addSql(SequenceSQL.currentValue(schema, seqName))
      .addMarkdown('##### Alter Sequence Template')
      .addSql(SequenceSQL.alter(schema, seqName))
      .show();
  } finally {
    release();
  }
}

export async function cmdSequenceOperations(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    const seqName = item.label;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Sequence Operations: ${schema}.${seqName}`) +
        MarkdownUtils.operationsTable([
          { operation: 'Properties', description: 'View sequence properties and settings', riskLevel: 'Safe' },
          { operation: 'Current Value', description: 'Get current sequence value', riskLevel: 'Safe' },
          { operation: 'Next Value', description: 'Advance and get next value (irreversible)', riskLevel: 'Medium' },
          { operation: 'Alter', description: 'Modify sequence parameters', riskLevel: 'Low' },
          { operation: 'Drop', description: 'Permanently drop the sequence', riskLevel: 'High' },
        ])
      )
      .addMarkdown('##### Sequence Properties')
      .addSql(SequenceSQL.getDefinition(schema, seqName))
      .addMarkdown('##### Current Value')
      .addSql(SequenceSQL.currentValue(schema, seqName))
      .addMarkdown('##### Next Value — WARNING: advances the sequence permanently')
      .addSql(SequenceSQL.nextValue(schema, seqName))
      .addMarkdown('##### Alter Sequence')
      .addSql(SequenceSQL.alter(schema, seqName))
      .addMarkdown('##### Drop Sequence — WARNING: permanently deletes the sequence')
      .addSql(SequenceSQL.drop(schema, seqName))
      .show();
  } finally {
    release();
  }
}
