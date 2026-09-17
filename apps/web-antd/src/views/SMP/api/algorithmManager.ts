import type {
  ApiResponse,
  EmptyData,
  FileUploadData,
  HdfsFileListData,
} from './types';

import { mtpRequestClient } from '#/api/request';
import { publicRequestMessage } from '#/api/public-error';

// 校验原始包络，业务失败不得返回为空文件列表。 Validate the raw envelope so business failures cannot become empty file lists.
export const fetchAlgorithmFileList = async (
  algorithmId: string,
  path: string,
): Promise<ApiResponse<HdfsFileListData>> => {
  const response = await mtpRequestClient.get<ApiResponse<HdfsFileListData>>(
    `/mtp/algorithms/${algorithmId}/files`,
    {
      params: { path },
      responseReturn: 'body',
    },
  );
  if (!response || response.code !== 0) {
    throw new Error(
      publicRequestMessage(
        { response: { data: response } },
        '算法文件读取失败',
      ),
    );
  }
  return response;
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

  return mtpRequestClient.post(
    `/mtp/algorithms/${algorithmId}/upload`,
    formData,
    {
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
    },
  );
};

// 以二进制正文下载，避免将文件套入业务JSON包络。 / Download the binary body without treating the file as a business JSON envelope.
export const downloadAlgorithmFile = async (
  algorithmId: string,
  filePath: string,
  onProgress?: (progress: number) => void,
): Promise<Blob> => {
  return mtpRequestClient.get(`/mtp/algorithms/${algorithmId}/download`, {
    params: { filePath },
    responseType: 'blob',
    responseReturn: 'body',
    // 依据实际传输字节更新行内进度。 / Update row progress from actual transferred bytes.
    onDownloadProgress: (event) => {
      if (event.total && event.total > 0) onProgress?.(Math.min(99, Math.round(event.loaded * 100 / event.total)));
    },
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
