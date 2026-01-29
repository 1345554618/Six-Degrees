<template>
  <el-card>
    <template #header>
      <div style="font-weight: 600">我的關係線</div>
    </template>

    <el-table :data="rows" style="width: 100%">
      <el-table-column prop="name" label="對象" />
      <el-table-column label="狀態">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'accepted'" type="success">已確認</el-tag>
          <el-tag v-else-if="row.status === 'pending_in'" type="warning">對方邀請你（待接受）</el-tag>
          <el-tag v-else type="info">你已邀請（待對方接受）</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending_in'" type="primary" @click="accept(row.id)">
            接受
          </el-button>
          <el-button v-else disabled>—</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/services/api";

const rows = ref<any[]>([]);

async function load() {
  rows.value = await api.graph.getConnections();
}

async function accept(id: string) {
  await api.graph.acceptInvite(id);
  ElMessage.success("已接受（mock）");
  await load();
}

onMounted(load);
</script>
