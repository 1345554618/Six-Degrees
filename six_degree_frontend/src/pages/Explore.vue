<template>
  <div style="display: grid; grid-template-columns: 280px 1fr; gap: 16px">
    <el-card>
      <template #header>
        <div style="font-weight: 600">篩選</div>
      </template>

      <div style="display: grid; gap: 12px">
        <div>
          <div style="margin-bottom: 6px">最大幾度</div>
          <el-slider v-model="maxDegrees" :min="1" :max="6" show-stops />
        </div>

        <div>
          <div style="margin-bottom: 6px">城市（可選）</div>
          <el-select v-model="city" placeholder="不限" clearable style="width: 100%">
            <el-option label="Taipei" value="Taipei" />
            <el-option label="Taichung" value="Taichung" />
          </el-select>
        </div>

        <el-button :loading="loading" @click="load">套用</el-button>
      </div>
    </el-card>

    <div style="display: grid; gap: 12px">
      <el-card>
        <template #header>
          <div style="font-weight: 600">推薦給你（圈內優先）</div>
        </template>

        <div v-if="list.length === 0" style="opacity: 0.7">
          目前沒有符合條件的推薦。你可以提高最大幾度或邀請更多朋友進來建立關係線。
        </div>

        <div style="display: grid; gap: 12px">
          <UserCard v-for="u in list" :key="u.id" :user="u" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/services/api";
import UserCard from "@/components/UserCard.vue";

const loading = ref(false);
const maxDegrees = ref(3);
const city = ref<string | undefined>(undefined);
const list = ref<any[]>([]);

async function load() {
  try {
    loading.value = true;
    list.value = await api.graph.getRecommendations({ maxDegrees: maxDegrees.value, city: city.value });
  } catch (e: any) {
    ElMessage.error(e?.message || "載入失敗");
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
