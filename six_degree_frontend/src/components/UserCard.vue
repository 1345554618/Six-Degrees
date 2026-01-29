<template>
  <el-card>
    <div style="display: flex; gap: 12px; align-items: flex-start">
      <el-avatar :size="44">{{ initials }}</el-avatar>

      <div style="flex: 1">
        <div style="display: flex; align-items: center; gap: 10px">
          <div style="font-weight: 700; font-size: 16px">{{ user.name }}</div>
          <DegreeBadge :degrees="user.degrees" />
          <el-tag type="info">共同朋友 {{ user.mutualCount }}</el-tag>
        </div>

        <div style="margin-top: 6px; opacity: 0.8">
          <span v-if="user.city">{{ user.city }}</span>
          <span v-if="user.city && user.interests?.length"> · </span>
          <span v-if="user.interests?.length">{{ user.interests.join(", ") }}</span>
        </div>

        <div v-if="user.pathPreview?.length" style="margin-top: 10px">
          <el-text type="info">路徑預覽：</el-text>
          <el-text>{{ user.pathPreview.join(" → ") }}</el-text>
        </div>

        <div style="margin-top: 12px; display: flex; gap: 8px">
          <el-button type="primary">打招呼</el-button>
          <el-button>查看個人檔案</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DegreeBadge from "./DegreeBadge.vue";

const props = defineProps<{ user: any }>();

const initials = computed(() => (props.user?.name || "?").slice(0, 1));
</script>
