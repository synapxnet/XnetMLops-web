import { dppRequestClient } from '#/api/request';

// 特征属性列配置项
export interface FeatureColumnConfig {
  key: string;
  title: string;
  type: 'select' | 'input' | 'number' | 'switch';
  options?: { label: string; value: string }[];
  default?: any;
  placeholder?: string;
  min?: number;
  max?: number;
}

// 算子参数配置项
export interface OperatorParamConfig {
  type: 'select' | 'input' | 'number' | 'switch';
  label: string;
  options?: string[] | { label: string; value: string }[];
  default?: any;
  min?: number;
  max?: number;
}

// 特征算子接口
export interface FeatureOperator {
  id?: number;
  uid?: string;
  name: string;
  code: string;
  description?: string;
  category: 'format_conversion' | 'feature_transform' | 'data_cleaning';
  outputFormats: string; // JSON数组字符串
  featureColumns: string; // JSON数组字符串，FeatureColumnConfig[]
  parameterSchema: string; // JSON对象字符串
  sortOrder?: number;
  enabled?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 解析后的特征算子（方便前端使用）
export interface ParsedFeatureOperator
  extends Omit<
    FeatureOperator,
    'outputFormats' | 'featureColumns' | 'parameterSchema'
  > {
  outputFormats: string[];
  featureColumns: FeatureColumnConfig[];
  parameterSchema: Record<string, OperatorParamConfig>;
}

// 字段特征配置（保存时使用）
export interface FieldFeatureConfig {
  columnName: string;
  [key: string]: any; // 动态属性，根据算子的featureColumns定义
}

// 获取所有启用的特征算子
export const fetchFeatureOperators = async (): Promise<FeatureOperator[]> => {
  const response = await dppRequestClient.get('/dpp/feature-operators');
  return response.data || response;
};

// 获取所有特征算子（包括禁用的）
export const fetchAllFeatureOperators = async (): Promise<
  FeatureOperator[]
> => {
  const response = await dppRequestClient.get('/dpp/feature-operators/all');
  return response.data || response;
};

// 根据类别获取特征算子
export const fetchFeatureOperatorsByCategory = async (
  category: string,
): Promise<FeatureOperator[]> => {
  const response = await dppRequestClient.get(
    `/dpp/feature-operators/category/${category}`,
  );
  return response.data || response;
};

// 根据ID获取特征算子
export const fetchFeatureOperatorById = async (
  id: number,
): Promise<FeatureOperator> => {
  const response = await dppRequestClient.get(`/dpp/feature-operators/${id}`);
  return response.data || response;
};

// 根据代码获取特征算子
export const fetchFeatureOperatorByCode = async (
  code: string,
): Promise<FeatureOperator> => {
  const response = await dppRequestClient.get(
    `/dpp/feature-operators/code/${code}`,
  );
  return response.data || response;
};

// 创建特征算子
export const createFeatureOperator = async (
  data: FeatureOperator,
): Promise<FeatureOperator> => {
  const response = await dppRequestClient.post('/dpp/feature-operators', data, {
    responseReturn: 'body',
  });
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '创建失败');
};

// 更新特征算子
export const updateFeatureOperator = async (
  id: number,
  data: FeatureOperator,
): Promise<FeatureOperator> => {
  const response = await dppRequestClient.put(
    `/dpp/feature-operators/${id}`,
    data,
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '更新失败');
};

// 启用/禁用特征算子
export const toggleFeatureOperatorEnabled = async (
  id: number,
  enabled: boolean,
): Promise<void> => {
  const response = await dppRequestClient.patch(
    `/dpp/feature-operators/${id}/enabled`,
    { enabled },
    {
      responseReturn: 'body',
    },
  );
  if (response.code !== 0) {
    throw new Error(response.message || '操作失败');
  }
};

// 删除特征算子
export const deleteFeatureOperator = async (id: number): Promise<void> => {
  const response = await dppRequestClient.delete(
    `/dpp/feature-operators/${id}`,
    {
      responseReturn: 'body',
    },
  );
  if (response.code !== 0) {
    throw new Error(response.message || '删除失败');
  }
};

// 初始化默认算子
export const initDefaultOperators = async (): Promise<FeatureOperator[]> => {
  const response = await dppRequestClient.post(
    '/dpp/feature-operators/init-defaults',
    {},
    {
      responseReturn: 'body',
    },
  );
  if (response.code === 0) {
    return response.data;
  }
  throw new Error(response.message || '初始化失败');
};

// 解析特征算子的JSON字段
export const parseFeatureOperator = (
  operator: FeatureOperator,
): ParsedFeatureOperator => {
  return {
    ...operator,
    outputFormats: JSON.parse(operator.outputFormats || '[]'),
    featureColumns: JSON.parse(operator.featureColumns || '[]'),
    parameterSchema: JSON.parse(operator.parameterSchema || '{}'),
  };
};

// 算子类别选项
export const operatorCategoryOptions = [
  { label: '格式转换', value: 'format_conversion' },
  { label: '特征变换', value: 'feature_transform' },
  { label: '数据清洗', value: 'data_cleaning' },
];

// 获取类别标签
export const getCategoryLabel = (category: string): string => {
  const option = operatorCategoryOptions.find((opt) => opt.value === category);
  return option?.label || category;
};
