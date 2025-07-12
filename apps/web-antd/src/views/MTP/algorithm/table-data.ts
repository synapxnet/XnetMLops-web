// src/table-data.ts

export interface RowType {
  algorithmName: string;
  algorithmVersion: string;
  userId: string;
  size: string;
  updateDate: string;
  latestExecutionDate: string;
  parentId: null | number;
  id: number;
}

export const MOCK_TABLE_DATA: RowType[] = [
  {
    id: 0,
    algorithmName: 'Task 1',
    algorithmVersion: '1.0.0',
    size: '32.3 MB',
    userId: '00000001',
    updateDate: '2024-05-15',
    latestExecutionDate: '2024-05-15',
    parentId: null,
  },
  {
    id: 1,
    algorithmName: 'Task 2',
    algorithmVersion: '1.0.0',
    size: '32.3 MB',
    userId: '00000002',
    updateDate: '2024-05-15',
    latestExecutionDate: '2024-05-15',
    parentId: 0,
  },
  {
    id: 2,
    algorithmName: 'Task 3',
    algorithmVersion: '1.0.0',
    size: '32.3 MB',
    userId: '00000003',
    updateDate: '2024-05-15',
    latestExecutionDate: '2024-05-15',
    parentId: null,
  },
];
