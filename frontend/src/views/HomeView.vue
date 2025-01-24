<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";
interface ScrapedData {
  tag: string;
  text: string;
}
const scrapedData = ref<ScrapedData[]>([]);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const userUrl = ref<string>("");
const fetchScrapedData = async () => {
  if (!userUrl.value) {
    error.value = "Please provide a domain (e.g., example.com) to scrape.";
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const fullUrl = `https://${userUrl.value}`;
    const response = await axios.get(`http://localhost:5000/scrape?url=${encodeURIComponent(fullUrl)}`);
    scrapedData.value = response.data.data;
  } catch (err) {
    console.error("Error fetching data:", err);
    error.value = "Failed to load scraped data.";
  } finally {
    loading.value = false;
  }
};
</script>
<template>
  <div class="container mx-auto p-6 text-center">
    <h1 class="text-4xl font-bold text-blue-700 mb-6">Scrape Website Headers</h1>
    <p class="text-lg text-gray-600 mb-4">Enter the domain of a website to scrape its header tags.</p>
    <div class="mb-6 flex justify-center items-center space-x-4">
      <input v-model="userUrl" type="text"
        class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter domain (e.g., example.com)" aria-label="Enter website domain" />
      <button @click="fetchScrapedData"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Scrape Website">
        Scrape
      </button>
    </div>
    <div v-if="loading" class="text-lg text-black">Loading...</div>
    <div v-else-if="error" class="text-lg text-red-500 mb-4">
      <span>{{ error }}</span>
    </div>
    <ul v-else-if="scrapedData.length > 0" class="bg-white shadow-md rounded-lg p-4 space-y-4">
      <li v-for="(item, index) in scrapedData" :key="index" class="p-3 border-b last:border-none flex justify-between">
        <span class="font-semibold text-gray-800">{{ item.tag }}</span>
        <span class="ml-4 text-gray-600">{{ item.text }}</span>
      </li>
    </ul>
    <p v-else class="text-gray-500">No data found. Please try another URL.</p>
  </div>
</template>
<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

button {
  cursor: pointer;
}

input {
  max-width: 400px;
}
</style>