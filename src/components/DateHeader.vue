<template>
  <div class="date-header">
    <h3 class="date-title">{{ dateLabel }}</h3>
  </div>
</template>

<script setup lang="ts">
interface Props {
  dateLabel: string
}

defineProps<Props>()
</script>

<style scoped>
.date-header {
  padding: 16px 0 8px 0;
  margin-top: 24px;
}

.date-header:first-child {
  margin-top: 0;
}

.date-title {
  font-size: 14px;
  font-weight: 600;
  color: #6c757d;
  margin: 0;
  text-transform: capitalize;
  letter-spacing: 0.5px;
}
</style>
