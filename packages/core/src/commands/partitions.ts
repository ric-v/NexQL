import * as vscode from 'vscode';
import { DatabaseTreeItem } from '../providers/DatabaseTreeProvider';
import { getDatabaseConnection, NotebookBuilder, MarkdownUtils } from './helper';
import { PartitionSQL } from './sql/partitions';

export async function cmdListPartitions(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    const table = item.tableName || item.label;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Partitions of ${schema}.${table}`) +
        MarkdownUtils.infoBox('Lists all partition child tables, their bounds, size, and row estimates.')
      )
      .addSql(PartitionSQL.list(schema, table))
      .addMarkdown('##### Partition Key Definition')
      .addSql(PartitionSQL.isPartitioned(schema, table))
      .show();
  } finally {
    release();
  }
}

export async function cmdDetachPartition(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const partitionName = item.label;
  const table = item.tableName!;
  const confirm = await vscode.window.showWarningMessage(
    `Detach partition "${partitionName}" from table "${table}"? The partition will remain as a standalone table.`,
    { modal: true },
    'Detach'
  );
  if (confirm !== 'Detach') { return; }
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Detach Partition: ${partitionName}`) +
        MarkdownUtils.warningBox(`Detaching partition "${partitionName}" from "${schema}"."${table}". The table will remain as a standalone table.`)
      )
      .addSql(PartitionSQL.detach(schema, table, partitionName))
      .show();
  } finally {
    release();
  }
}

export async function cmdShowPartitionProperties(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    const table = item.tableName!;
    const partitionName = item.label;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Partition: ${partitionName}`) +
        MarkdownUtils.infoBox(`Partition of table "${schema}"."${table}". Shows partition bound and sub-partitions if any.`)
      )
      .addSql(PartitionSQL.list(schema, table))
      .addMarkdown('##### Create Range Partition Template')
      .addSql(PartitionSQL.createRangePartition(schema, table))
      .addMarkdown('##### Create List Partition Template')
      .addSql(PartitionSQL.createListPartition(schema, table))
      .show();
  } finally {
    release();
  }
}

export async function cmdCreatePartition(item: DatabaseTreeItem, context: vscode.ExtensionContext) {
  const { metadata, release } = await getDatabaseConnection(item);
  try {
    const schema = item.schema!;
    const table = item.tableName || item.label;
    await new NotebookBuilder(metadata)
      .addMarkdown(
        MarkdownUtils.header(`Create Partition on ${schema}.${table}`) +
        MarkdownUtils.infoBox('Choose the partition type based on your partitioning strategy (RANGE, LIST, or HASH).')
      )
      .addMarkdown('##### Range Partition')
      .addSql(PartitionSQL.createRangePartition(schema, table))
      .addMarkdown('##### List Partition')
      .addSql(PartitionSQL.createListPartition(schema, table))
      .show();
  } finally {
    release();
  }
}
