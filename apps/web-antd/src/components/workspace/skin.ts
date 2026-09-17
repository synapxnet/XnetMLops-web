/* Copyright (C) 2026 Synapxnet. All rights reserved.
 * Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
 * 自定义皮肤验证与存储。Custom skin validation and storage.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
 * __version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
 * __maintainer__: maoyo | __email__: synapxnet@gmail.com
 */
export interface WorkspaceSkin {
  accent: string;
  backgroundImage: string;
  backgroundOpacity: number;
  density: 'comfortable' | 'compact';
  mode: 'dark' | 'light' | 'system';
  name: string;
  radius: number;
  schema: 'synapxnet.skin';
  version: 1;
}
export const SKIN_KEY = 'synapxnet:mlops:skin:v1';
export const SKIN_LIBRARY_KEY = 'synapxnet:mlops:skin-library:v1';
export const MAX_SKIN_BYTES = 3 * 1024 * 1024;
export const DEFAULT_SKIN: WorkspaceSkin = {
  accent: '#187bbd',
  backgroundImage: '',
  backgroundOpacity: 0.12,
  density: 'comfortable',
  mode: 'light',
  name: 'SynapXnet 蓝青',
  radius: 12,
  schema: 'synapxnet.skin',
  version: 1,
};

/** 白名单读取皮肤；拒绝任意样式、脚本和远程图片。Validate a skin without arbitrary styles, scripts or remote images. */
export function validateSkin(value: unknown): WorkspaceSkin {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('皮肤格式无效');
  const skin = value as Record<string, unknown>;
  if (
    skin.schema !== 'synapxnet.skin' ||
    skin.version !== 1 ||
    typeof skin.name !== 'string' ||
    !skin.name.trim() ||
    skin.name.length > 60
  )
    throw new Error('请使用版本 1 的 SynapXnet 皮肤和 1–60 字名称');
  if (typeof skin.accent !== 'string' || !/^#[\da-f]{6}$/i.test(skin.accent))
    throw new Error('主色必须为六位十六进制颜色');
  if (skin.mode !== 'light' && skin.mode !== 'dark' && skin.mode !== 'system')
    throw new Error('请选择亮色、深色或跟随系统');
  if (skin.density !== 'comfortable' && skin.density !== 'compact')
    throw new Error('紧凑度无效');
  if (
    typeof skin.radius !== 'number' ||
    !Number.isInteger(skin.radius) ||
    skin.radius < 0 ||
    skin.radius > 24
  )
    throw new Error('圆角范围为 0–24');
  if (
    typeof skin.backgroundOpacity !== 'number' ||
    !Number.isFinite(skin.backgroundOpacity) ||
    skin.backgroundOpacity < 0 ||
    skin.backgroundOpacity > 0.4
  )
    throw new Error('背景透明度范围为 0–0.4');
  if (
    typeof skin.backgroundImage !== 'string' ||
    skin.backgroundImage.length > Math.ceil((2 * 1024 * 1024) / 3) * 4 + 30 ||
    (skin.backgroundImage !== '' &&
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        skin.backgroundImage,
      ))
  )
    throw new Error('背景仅支持不超过 2 MB 的本地 PNG、JPEG 或 WebP 图片');
  return {
    accent: skin.accent.toLowerCase(),
    backgroundImage: skin.backgroundImage,
    backgroundOpacity: skin.backgroundOpacity,
    density: skin.density,
    mode: skin.mode,
    name: skin.name.trim(),
    radius: skin.radius,
    schema: 'synapxnet.skin',
    version: 1,
  };
}

/** 限制导入体积并重建白名单字段。Limit import size and rebuild whitelisted fields. */
export function parseSkin(text: string): WorkspaceSkin {
  if (new Blob([text]).size > MAX_SKIN_BYTES)
    throw new Error('皮肤文件不能超过 3 MB');
  try {
    return validateSkin(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('JSON 格式不正确');
    throw error;
  }
}

/** 隔离损坏的本地偏好并回退品牌默认。Recover safely from corrupted local preferences. */
export function loadSkin(storage: Pick<Storage, 'getItem'>): WorkspaceSkin {
  try {
    const raw = storage.getItem(SKIN_KEY);
    return raw ? parseSkin(raw) : { ...DEFAULT_SKIN };
  } catch {
    return { ...DEFAULT_SKIN };
  }
}

/** 仅加载通过校验的命名皮肤。Load only validated named skins. */
export function loadSkinLibrary(
  storage: Pick<Storage, 'getItem'>,
): WorkspaceSkin[] {
  try {
    const raw = storage.getItem(SKIN_LIBRARY_KEY);
    if (!raw || raw.length > MAX_SKIN_BYTES * 12) return [];
    const items: unknown = JSON.parse(raw);
    if (!Array.isArray(items) || items.length > 12) return [];
    return items.map(validateSkin);
  } catch {
    return [];
  }
}

/** 按名称替换并限制收藏数量。Replace by name and bound the saved library. */
export function upsertSkin(
  skins: WorkspaceSkin[],
  next: WorkspaceSkin,
): WorkspaceSkin[] {
  const safe = validateSkin(next);
  return [safe, ...skins.filter((skin) => skin.name !== safe.name)].slice(
    0,
    12,
  );
}
