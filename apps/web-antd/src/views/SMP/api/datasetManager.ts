import type {
  ApiResponse,
  EmptyData,
  FileUploadData,
  HdfsFileListData,
} from './types';

import { dppRequestClient } from '#/api/request'; // 根据实际路径调整

// 获取HDFS文件列表
export const fetchHdfsFileList = async (
  datasetId: string,
  path: string,
): Promise<ApiResponse<HdfsFileListData>> => {
  return dppRequestClient.get(`/dpp/datasets/${datasetId}/files`, {
    params: { path },
    headers: {
      'X-Tenant-Id': localStorage.getItem('tenantId') || '',
    },
  });
};

// 上传文件到HDFS
export const uploadHdfsFile = async (
  datasetId: string,
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ApiResponse<FileUploadData>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);

  return dppRequestClient.post(`/dpp/datasets/${datasetId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Tenant-Id': localStorage.getItem('tenantId') || '',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(progress);
      }
    },
  });
};

// 下载HDFS文件
export const downloadHdfsFile = async (
  datasetId: string,
  filePath: string,
): Promise<Blob> => {
  return dppRequestClient.get(`/dpp/datasets/${datasetId}/download`, {
    params: { filePath },
    responseType: 'blob',
    headers: {
      'X-Tenant-Id': localStorage.getItem('tenantId') || '',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};

// 删除HDFS文件或目录
export const deleteHdfsFile = async (
  datasetId: string,
  path: string,
): Promise<ApiResponse<EmptyData>> => {
  return dppRequestClient.delete(`/dpp/datasets/${datasetId}/delete`, {
    data: { path },
    headers: {
      'X-Tenant-Id': localStorage.getItem('tenantId') || '',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};

// 批量删除HDFS文件或目录
export const batchDeleteHdfsFiles = async (
  datasetId: string,
  paths: string[],
): Promise<ApiResponse<EmptyData>> => {
  return dppRequestClient.post(
    `/dpp/datasets/${datasetId}/batchDelete`,
    { paths },
    {
      headers: {
        'X-Tenant-Id': localStorage.getItem('tenantId') || '',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    },
  );
};

// 创建HDFS目录
export const createHdfsDirectory = async (
  datasetId: string,
  path: string,
  folderName: string,
): Promise<ApiResponse<EmptyData>> => {
  return dppRequestClient.post(
    `/dpp/datasets/${datasetId}/mkdir`,
    { path, folderName },
    {
      headers: {
        'X-Tenant-Id': localStorage.getItem('tenantId') || '',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    },
  );
};
