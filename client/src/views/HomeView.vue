<template>
  <div class="home">
    <WordAdder />
  </div>
</template>

<script>
import WordAdder from '@/components/WordAdder.vue'

export default {
  name: 'HomeView',
  components: {
    WordAdder
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
}
</style>
