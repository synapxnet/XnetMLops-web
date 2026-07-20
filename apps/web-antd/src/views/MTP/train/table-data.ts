// src/table-data.ts

export interface RowType {
  taskName: string;
  taskType: string;
  userId: string;
  taskState: string;
  updateDate: string;
  latestExecutionDate: string;
  parentId: null | number;
  id: number;
}

export const MOCK_TABLE_DATA: RowType[] = [
  {
    id: 0,
    taskName: 'Task 1',
    taskType: '训练任务',
    taskState: '-',
    userId: '00000001',
    updateDate: '2024-05-15',
    latestExecutionDate: '2024-05-15',
    parentId: null,
  },
  {
    id: 1,
    taskName: 'Task 2',
    taskType: '训练任务',
    taskState: '-',
    userId: '00000002',
    updateDate: '2024-05-15',
    latestExecutionDate: '2024-05-15',
    parentId: 0,
  },
  {
    id: 2,
    taskName: 'Task 3',
    taskType: '训练任务',
    taskState: '-',
    userId: '00000003',
    updateDate: '2024-05-15',
    latestExecutionDate: '2024-05-15',
    parentId: null,
  },
];
