<script setup>
import UploadZone from './components/UploadZone.vue'
import SpeciesSearch from './components/SpeciesSearch.vue'
import ThumbSearch from './components/ThumbSearch.vue'
import TagEditor from './components/TagEditor.vue'
import DeleteFiles from './components/DeleteFiles.vue'
import TagQuery from './components/TagQuery.vue'
import DetectTag from './components/DetectTag.vue'
</script>

<template>
  <div>
    <h1>多功能文件管理平台</h1>
    <UploadZone />
    <SpeciesSearch />
    <ThumbSearch />
    <TagEditor />
    <DeleteFiles />
    <TagQuery />
    <DetectTag />
  </div>
</template>

<style>
body {
  background: url('background.png') no-repeat center center fixed;
  background-size: cover;
  min-height: 100vh;
}
</style>
