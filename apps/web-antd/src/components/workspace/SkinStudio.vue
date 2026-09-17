<!-- Copyright (C) 2026 Synapxnet. All rights reserved.
Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
皮肤编辑与实时预览。Skin editing and live preview.
Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
__version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
__maintainer__: maoyo | __email__: synapxnet@gmail.com -->
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { preferences, updatePreferences } from '@vben/preferences';
import { Button, Drawer, Input, message, Select, Slider } from 'ant-design-vue';
import {
  DEFAULT_SKIN,
  loadSkin,
  loadSkinLibrary,
  MAX_SKIN_BYTES,
  parseSkin,
  SKIN_KEY,
  SKIN_LIBRARY_KEY,
  upsertSkin,
  validateSkin,
} from './skin';
import type { WorkspaceSkin } from './skin';

const open = ref(false);
const draft = ref<WorkspaceSkin>({ ...DEFAULT_SKIN });
const saved = ref<WorkspaceSkin[]>([]);
const error = ref('');
let beforePreview = { ...DEFAULT_SKIN };
let importGeneration = 0;

/** 应用合法皮肤到现有主题体系。Apply a validated skin through the existing theme system. */
function applySkin(value: WorkspaceSkin) {
  const skin = validateSkin(value);
  updatePreferences({
    app: { compact: skin.density === 'compact' },
    theme: {
      builtinType: 'custom',
      colorPrimary: skin.accent,
      mode: skin.mode === 'system' ? 'auto' : skin.mode,
      radius: String(skin.radius / 16),
    },
  });
  document.documentElement.style.setProperty(
    '--xnet-background-image',
    skin.backgroundImage ? `url("${skin.backgroundImage}")` : 'none',
  );
  document.documentElement.style.setProperty(
    '--xnet-background-cover',
    `${(1 - skin.backgroundOpacity) * 100}%`,
  );
  document.documentElement.dataset.xnetDensity = skin.density;
  document.documentElement.style.setProperty(
    '--xnet-radius',
    `${skin.radius}px`,
  );
}

/** 初始化只包含视觉的本地偏好。Initialize local visual preferences only. */
function initializeSkin() {
  try {
    draft.value = loadSkin(localStorage);
    saved.value = loadSkinLibrary(localStorage);
    applySkin(draft.value);
  } catch {
    error.value = '浏览器暂时无法保存皮肤；仍可预览。';
    applySkin(DEFAULT_SKIN);
  }
}

/** 开始可取消的实时预览。Start a cancellable live preview. */
function showEditor() {
  importGeneration += 1;
  draft.value = {
    ...draft.value,
    mode: preferences.theme.mode === 'auto' ? 'system' : preferences.theme.mode,
  };
  beforePreview = { ...draft.value };
  error.value = '';
  open.value = true;
}

/** 取消后还原打开面板之前的皮肤。Restore the previous skin when cancelling. */
function cancelPreview() {
  importGeneration += 1;
  draft.value = { ...beforePreview };
  applySkin(beforePreview);
  open.value = false;
}

/** 逐项预览，暂不写入存储。Preview valid changes without persisting them. */
function previewSkin() {
  if (!open.value) return;
  try {
    applySkin(draft.value);
    error.value = '';
  } catch (reason) {
    error.value = String((reason as Error).message);
  }
}

/** 保存选定皮肤与命名收藏；失败时不报告成功。Save the active skin and named library without false success. */
function saveSkin() {
  try {
    const skin = validateSkin(draft.value);
    const library = upsertSkin(saved.value, skin);
    localStorage.setItem(SKIN_LIBRARY_KEY, JSON.stringify(library));
    localStorage.setItem(SKIN_KEY, JSON.stringify(skin));
    importGeneration += 1;
    saved.value = library;
    beforePreview = skin;
    open.value = false;
    message.success('皮肤已保存到此浏览器');
  } catch (reason) {
    error.value =
      reason instanceof Error
        ? reason.message
        : '皮肤保存失败，请尝试移除背景图片';
  }
}

/** 导入文件仅成为待保存预览。Import a file as an unsaved preview. */
async function importSkin(event: Event) {
  const request = ++importGeneration;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > MAX_SKIN_BYTES) throw new Error('皮肤文件不能超过 3 MB');
    const skin = parseSkin(await file.text());
    if (open.value && request === importGeneration) draft.value = skin;
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

/** 导出白名单JSON并释放下载资源。Export whitelisted JSON and release the download URL. */
function exportSkin() {
  try {
    const skin = validateSkin(draft.value);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(skin, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'xnet-mlops-skin.json';
    link.click();
    URL.revokeObjectURL(url);
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

/** 验证本地位图并转成可移植背景。Validate local raster images for portable backgrounds. */
async function importBackground(event: Event) {
  const request = ++importGeneration;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    )
      throw new Error('请选择不超过 2 MB 的 PNG、JPEG 或 WebP');
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    if (!open.value || request !== importGeneration) return;
    const reader = new FileReader();
    /** 完成读取后应用图片；关闭编辑器时忽略迟到结果。Apply completed reads only while the editor remains open. */
    reader.onload = () => {
      if (open.value && request === importGeneration)
        draft.value = {
          ...draft.value,
          backgroundImage: String(reader.result),
        };
    };
    /** 读取失败时显示具体状态。Report file read failures. */
    reader.onerror = () => {
      error.value = '图片读取失败';
    };
    reader.readAsDataURL(file);
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

/** 选取已保存的完整皮肤。Select a complete saved skin. */
function chooseSkin(name: unknown) {
  if (typeof name !== 'string') return;
  importGeneration += 1;
  const skin = saved.value.find((item) => item.name === name);
  if (skin) draft.value = { ...skin };
}
/** 恢复品牌默认并保留预览确认流程。Preview brand defaults. */
function resetSkin() {
  importGeneration += 1;
  draft.value = { ...DEFAULT_SKIN };
}
/** 品牌预设随明暗切换，用户自定义主色保持不变。Adapt brand presets to mode while retaining custom accents. */
function syncBrandAccent(mode: WorkspaceSkin['mode']) {
  if (['#187bbd', '#60bcec'].includes(draft.value.accent))
    draft.value.accent = mode === 'dark' ? '#60bcec' : '#187bbd';
}
watch(() => draft.value.mode, syncBrandAccent);
watch(draft, previewSkin, { deep: true });
onMounted(initializeSkin);
</script>

<template>
  <Button type="text" aria-label="自定义皮肤" @click="showEditor">皮肤</Button>
  <Drawer
    :open="open"
    title="让工作区更像你"
    width="420"
    class="xnet-skin-drawer"
    @close="cancelPreview"
  >
    <p class="xnet-muted">实时预览主色与空间感，保存后在所有功能页使用。</p>
    <div class="xnet-skin-fields">
      <label
        >皮肤名称<Input v-model:value="draft.name" :maxlength="60"
      /></label>
      <label v-if="saved.length"
        >我的皮肤<Select
          aria-label="我的皮肤"
          :options="
            saved.map((item) => ({ label: item.name, value: item.name }))
          "
          @change="chooseSkin"
      /></label>
      <label
        >主色<input v-model="draft.accent" type="color" aria-label="皮肤主色"
      /></label>
      <label
        >明暗<Select
          v-model:value="draft.mode"
          aria-label="明暗"
          :options="[
            { label: '明亮', value: 'light' },
            { label: '深色', value: 'dark' },
            { label: '跟随系统', value: 'system' },
          ]"
      /></label>
      <label
        >紧凑度<Select
          v-model:value="draft.density"
          aria-label="紧凑度"
          :options="[
            { label: '舒适', value: 'comfortable' },
            { label: '紧凑', value: 'compact' },
          ]"
      /></label>
      <label
        >圆角 · {{ draft.radius }} px<Slider
          v-model:value="draft.radius"
          :min="0"
          :max="24"
      /></label>
      <label class="xnet-file-label"
        >背景图片 · 本地 PNG / JPEG / WebP<input
          aria-label="上传背景图片"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          @change="importBackground"
      /></label>
      <label v-if="draft.backgroundImage"
        >背景显现程度<Slider
          v-model:value="draft.backgroundOpacity"
          :min="0"
          :max="0.4"
          :step="0.01"
      /></label>
      <Button v-if="draft.backgroundImage" @click="draft.backgroundImage = ''"
        >移除背景</Button
      >
      <p v-if="error" role="alert" class="xnet-skin-error">{{ error }}</p>
      <div class="xnet-skin-actions">
        <Button @click="resetSkin">恢复品牌风格</Button
        ><Button @click="exportSkin">导出 JSON</Button>
      </div>
      <label class="xnet-file-label"
        >导入皮肤<input
          aria-label="导入皮肤 JSON"
          type="file"
          accept=".json,application/json"
          @change="importSkin"
      /></label>
    </div>
    <template #footer
      ><div class="xnet-skin-actions">
        <Button @click="cancelPreview">取消预览</Button
        ><Button type="primary" @click="saveSkin">保存并使用</Button>
      </div></template
    >
  </Drawer>
</template>
