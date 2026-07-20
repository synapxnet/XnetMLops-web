import type {
  ApiResponse,
  EmptyData,
  FileUploadData,
  HdfsFileListData,
} from './types';

import { mtpRequestClient } from '#/api/request';

// 获取算法HDFS文件列表
export const fetchAlgorithmFileList = async (
  algorithmId: string,
  path: string,
): Promise<ApiResponse<HdfsFileListData>> => {
  return mtpRequestClient.get(`/mtp/algorithms/${algorithmId}/files`, {
    params: { path },
    responseReturn: 'body',
  });
};

// 上传文件到算法HDFS目录
export const uploadAlgorithmFile = async (
  algorithmId: string,
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ApiResponse<FileUploadData>> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);

  return mtpRequestClient.post(`/mtp/algorithms/${algorithmId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseReturn: 'body',
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

// 下载算法文件
export const downloadAlgorithmFile = async (
  algorithmId: string,
  filePath: string,
): Promise<Blob> => {
  return mtpRequestClient.get(`/mtp/algorithms/${algorithmId}/download`, {
    params: { filePath },
    responseType: 'blob',
  });
};

// 删除算法文件或目录
export const deleteAlgorithmFile = async (
  algorithmId: string,
  path: string,
): Promise<ApiResponse<EmptyData>> => {
  return mtpRequestClient.delete(`/mtp/algorithms/${algorithmId}/delete`, {
    data: { path },
    responseReturn: 'body',
  });
};

// 创建算法目录
export const createAlgorithmDirectory = async (
  algorithmId: string,
  path: string,
  folderName: string,
): Promise<ApiResponse<EmptyData>> => {
  return mtpRequestClient.post(
    `/mtp/algorithms/${algorithmId}/mkdir`,
    { path, folderName },
    {
      responseReturn: 'body',
    },
  );
};
