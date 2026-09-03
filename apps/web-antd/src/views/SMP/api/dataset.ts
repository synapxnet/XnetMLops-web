import type { DatasetItem } from './types';

import { message } from 'ant-design-vue';

import { dppRequestClient } from '#/api/request'; // 根据实际路径调整

export interface DataOpsProduct {
  artifactDigestSha256: string;
  createdAt: string;
  lineageReference: string;
  negativeCount: number;
  positiveCount: number;
  productName: string;
  productVersion: string;
  publishedAt?: string;
  rowCount: number;
  schemaDigestSha256: string;
  status: 'building' | 'published' | 'retired' | 'validated';
}

export interface DataOpsImportIdentity {
  deptUid?: null | string;
  level: number;
  teamName?: string;
  teamUid: string;
  tenantUid: string;
  userId: string;
}
/**
 * 创建数据集
 */
export const createDataset = async (
  payload: Omit<DatasetItem, 'id' | 'uid'> & { tempFilePath?: string },
): Promise<DatasetItem> => {
  try {
    // 添加租户ID请求头
    const headers = {
      'X-Tenant-Id': payload.tenant_uid,
    };

    // 发送POST请求创建数据集
    const response = await dppRequestClient.post<DatasetItem>(
      '/dpp/datasets-create',
      {
        ...payload,
        tempFilePath: payload.tempFilePath || null, // 添加临时路径参数
      },
      { headers },
    );

    return response;
  } catch (error) {
    console.error('创建数据集失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('countByDatasetFile')) {
      message.error('数据集文件已存在');
    } else {
      message.error('创建数据集失败，请重试');
    }
    throw error;
  }
};

// 添加API函数
export const fetchDatasetList = async (): Promise<DatasetItem[]> => {
  try {
    const response = await dppRequestClient.get('/dpp/datasets');
    return response;
  } catch (error) {
    console.error('获取数据集列表失败:', error);
    throw error;
  }
};

/** 查询 XnetDataOps 可供 MLOps 导入的数据产品。 */
export const fetchDataOpsProducts = async (): Promise<DataOpsProduct[]> => {
  return dppRequestClient.get<DataOpsProduct[]>('/dpp/dataops-products');
};

/** 使用当前组织身份导入一个已发布的 DataOps 数据产品。 */
export const importDataOpsProduct = async (
  productVersion: string,
  identity: DataOpsImportIdentity,
): Promise<DatasetItem> => {
  return dppRequestClient.post<DatasetItem>(
    `/dpp/dataops-products/${encodeURIComponent(productVersion)}/import`,
    undefined,
    {
      headers: {
        'X-Dept-Id': identity.deptUid || '',
        'X-Organization-Level': String(identity.level),
        'X-Team-Id': identity.teamUid,
        'X-Team-Name': identity.teamName || identity.teamUid,
        'X-Tenant-Id': identity.tenantUid,
        'X-User-Id': identity.userId,
      },
    },
  );
};

export const deleteDataset = async (id: number): Promise<void> => {
  try {
    await dppRequestClient.delete(`/dpp/datasets/${id}`);
  } catch (error) {
    console.error('删除数据集失败:', error);
    throw error;
  }
};

/**
 * 更新数据集
 * @param id 数据集ID
 * @param payload 需要更新的数据
 */
export const updateDataset = async (
  id: number,
  payload: { description: string },
): Promise<void> => {
  try {
    // 1. 首先获取当前数据集详情
    const currentDataset = await fetchDatasetDetail(id);

    // 2. 合并更新字段到现有数据集对象
    const updatedDataset = {
      ...currentDataset,
      ...payload,
    };

    // 3. 添加租户ID请求头
    const headers = {
      'X-Tenant-Id': currentDataset.tenant_uid,
    };

    // 4. 发送PUT请求更新整个数据集
    await dppRequestClient.put(`/dpp/datasets/${id}`, updatedDataset, {
      headers,
    });
  } catch (error) {
    console.error('更新数据集失败:', error);
    message.error('更新数据集失败');
    throw error;
  }
};

/**
 * 获取数据集详情
 * @param id 数据集ID
 */
export const fetchDatasetDetail = async (id: number): Promise<DatasetItem> => {
  try {
    const response = await dppRequestClient.get(`/dpp/datasets/${id}`);
    return response;
  } catch (error) {
    console.error('获取数据集详情失败:', error);
    message.error('获取数据集详情失败');
    throw error;
  }
};

/**
 * 上传文件到临时目录
 * @returns 返回临时文件路径
 */
export const uploadFileToTemp = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await dppRequestClient.post(
      '/dpp/upload', // 上传到临时目录的接口
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      },
    );

    return response; // 直接返回临时路径字符串
  } catch (error) {
    console.error('文件上传失败:', error);
    throw new Error('文件上传失败');
  }
};
