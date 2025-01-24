<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import HelloWorld from "./components/HelloWorld.vue";
</script>

<template>
  <header class="flex flex-col items-center p-6 bg-gray-100 shadow-md">
    <!-- Header content -->
    <nav class="mt-4 space-x-6 text-lg font-medium">
      <RouterLink to="/" class="text-blue-600 hover:underline">Home</RouterLink>
      <RouterLink to="/about" class="text-blue-600 hover:underline">About</RouterLink>
    </nav>
  </header>

  <main class="container mx-auto p-6">
    <RouterView />
  </main>
</template>
