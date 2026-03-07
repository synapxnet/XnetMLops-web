import { smpRequestClient } from '#/api/request';

export interface DataSource {
  id?: number;
  uid?: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  defaultDatabase?: string;
  allowedDatabases?: string; // 允许访问的数据库列表，用逗号分隔
  description?: string;
  enabled?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableInfo {
  name: string;
  type: string;
  remarks?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  size: number;
  nullable: boolean;
  remarks?: string;
  defaultValue?: string;
}

// 获取所有数据源
export const fetchDataSourceList = async (): Promise<DataSource[]> => {
  const response = await smpRequestClient.get('/smp/datasource');
  return response.data || response;
};

// 获取启用的数据源
export const fetchEnabledDataSources = async (): Promise<DataSource[]> => {
  const response = await smpRequestClient.get('/smp/datasource/enabled');
  return response.data || response;
};

// 获取单个数据源
export const fetchDataSourceById = async (id: number): Promise<DataSource> => {
  const response = await smpRequestClient.get(`/smp/datasource/${id}`);
  return response.data || response;
};

// 创建数据源
export const createDataSource = async (
  data: DataSource,
): Promise<DataSource> => {
  const response = await smpRequestClient.post('/smp/datasource', data);
  return response.data || response;
};

// 更新数据源
export const updateDataSource = async (
  id: number,
  data: DataSource,
): Promise<DataSource> => {
  const response = await smpRequestClient.put(`/smp/datasource/${id}`, data);
  return response.data || response;
};

// 删除数据源
export const deleteDataSource = async (id: number): Promise<void> => {
  await smpRequestClient.delete(`/smp/datasource/${id}`);
};

// 测试数据源连接
export const testDataSourceConnection = async (
  data: DataSource,
): Promise<{ success: boolean }> => {
  const response = await smpRequestClient.post('/smp/datasource/test', data, {
    responseReturn: 'body',
  });
  return response.data || response;
};

// 获取数据库列表（返回配置的允许数据库列表）
export const fetchDatabases = async (id: number): Promise<string[]> => {
  const response = await smpRequestClient.get(
    `/smp/datasource/${id}/databases`,
  );
  return response.data || response;
};

// 获取所有数据库列表（从数据源实际获取，用于配置时选择）
export const fetchAllDatabases = async (id: number): Promise<string[]> => {
  const response = await smpRequestClient.get(
    `/smp/datasource/${id}/all-databases`,
  );
  return response.data || response;
};

// 获取数据表列表
export const fetchTables = async (
  id: number,
  database: string,
): Promise<TableInfo[]> => {
  const response = await smpRequestClient.get(`/smp/datasource/${id}/tables`, {
    params: { database },
  });
  return response.data || response;
};

// 获取表字段列表
export const fetchColumns = async (
  id: number,
  database: string,
  table: string,
): Promise<ColumnInfo[]> => {
  const response = await smpRequestClient.get(`/smp/datasource/${id}/columns`, {
    params: { database, table },
  });
  return response.data || response;
};

// 预览表数据
export const previewTableData = async (
  id: number,
  database: string,
  table: string,
  limit?: number,
): Promise<{
  columns: string[];
  rows: Record<string, any>[];
  total: number;
}> => {
  const response = await smpRequestClient.get(`/smp/datasource/${id}/preview`, {
    params: { database, table, limit: limit || 100 },
  });
  return response.data || response;
};
