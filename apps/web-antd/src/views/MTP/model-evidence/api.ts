/*
 * Copyright (C) 2026 Synapxnet. All rights reserved.
 * This file is Synapxnet Proprietary and Confidential. It is strictly
 * forbidden to copy, distribute, or use without explicit authorization.
 * 模型证据读取客户端。 / Read client for model evidence.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-13
 * Version: 1.0.0 | Security Level: INTERNAL | Maintainer: maoyo
 * Email: synapxnet@gmail.com
 */
import type { ModelEvidenceWorkspace } from './model';

import { mtpRequestClient } from '#/api/request';

/** 使用统一认证客户端读取当前租户证据。 / Read tenant evidence through the shared authenticated client. */
export function fetchModelEvidence(tenantUid: string) {
  return mtpRequestClient.get<ModelEvidenceWorkspace>('/mtp/model-evidence', {
    headers: { 'X-Tenant-Uid': tenantUid },
  });
}
