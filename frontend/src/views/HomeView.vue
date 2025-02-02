<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";

// Define the type for the image data
interface ScrapedData {
  images: string[];  // Array of image URLs
}

const scrapedData = ref<ScrapedData>({ images: [] });
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
  scrapedData.value = { images: [] }; // Reset scraped data

  try {
    const fullUrl = `https://${userUrl.value}`;
    const response = await axios.get(
      `https://webscrapper-1ab5.onrender.com/scrape?url=${encodeURIComponent(fullUrl)}`
    );

    console.log(response.data); // Log the entire response to inspect it

    if (response.data.success) {
      scrapedData.value = {
        images: response.data.images || [],
      };
      console.log('Scraped Image URLs:', scrapedData.value.images); // Log image URLs
    } else {
      error.value = "No data found. Please try another URL.";
    }
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
    <h1 class="text-4xl font-bold text-blue-700 mb-6">Scrape Website Images</h1>
    <p class="text-lg text-gray-600 mb-4">Enter the domain of a website to scrape its images.</p>
    <div class="mb-6 flex justify-center items-center space-x-4">
      <input
        v-model="userUrl"
        type="text"
        class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter domain (e.g., example.com)"
        aria-label="Enter website domain"
      />
      <button
        @click="fetchScrapedData"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Scrape Website"
      >
        Scrape
      </button>
    </div>
    <div v-if="loading" class="text-lg text-black">Loading...</div>
    <div v-else-if="error" class="text-lg text-red-500 mb-4">
      <span>{{ error }}</span>
    </div>
    <div v-else>
      <!-- Display Images -->
      <div v-if="scrapedData.images.length > 0" class="bg-white shadow-md rounded-lg p-4">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Images</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(src, index) in scrapedData.images"
            :key="`image-${index}`"
            class="border rounded-lg overflow-hidden"
          >
            <img :src="src" :alt="'Image ' + index" class="w-full h-auto" />
          </div>
        </div>
      </div>
      <p v-else class="text-gray-500">No images found.</p>
    </div>
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

img {
  max-width: 100%;
  height: auto;
}
</style>
