<script setup lang="ts">
const { data: counter } = await useFetch("/api/counter")
</script>

<template>
  <p>Hit counter: {{ counter }}</p>
</template>
