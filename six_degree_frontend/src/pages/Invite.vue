<template>
  <el-card>
    <template #header>
      <div style="font-weight: 600">邀請朋友加入（建立關係線）</div>
    </template>

    <div style="max-width: 520px; display: grid; gap: 10px">
      <el-input v-model="value" placeholder="輸入朋友的 Email 或邀請碼" />
      <el-button type="primary" :loading="loading" @click="invite">送出邀請</el-button>
      <el-text type="info">
        建議：邀請後需要對方「接受認識關係」才會建立一條線，避免被亂加。
      </el-text>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/services/api";

const value = ref("");
const loading = ref(false);

async function invite() {
  try {
    loading.value = true;
    await api.graph.inviteFriend(value.value.trim());
    ElMessage.success("已送出邀請（mock）");
    value.value = "";
  } catch (e: any) {
    ElMessage.error(e?.message || "邀請失敗");
  } finally {
    loading.value = false;
  }
}
</script>
