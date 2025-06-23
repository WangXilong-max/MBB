<template>
  <div>
    <h2>文件上传</h2>
    <div id="dropZone" @click="triggerFileInput" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave" @drop.prevent="onDrop" :class="{ dragover: isDragover }">
      拖拽文件到此处或点击上传
    </div>
    <input type="file" ref="fileInput" style="display:none" @change="onFileChange" />
    <div id="progressContainer" v-show="progressVisible">
      <div id="progressBar" :style="{ width: progress + '%' }"></div>
    </div>
    <div id="uploadResult" v-html="uploadResult"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const PRESIGN_API = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/presignedURL';

const fileInput = ref(null);
const isDragover = ref(false);
const progress = ref(0);
const progressVisible = ref(false);
const uploadResult = ref('');

function getIdToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

function triggerFileInput() {
  fileInput.value.click();
}

function onFileChange(e) {
  if (e.target.files.length) handleFile(e.target.files[0]);
}

function onDragOver() {
  isDragover.value = true;
}
function onDragLeave() {
  isDragover.value = false;
}
function onDrop(e) {
  isDragover.value = false;
  const files = e.dataTransfer.files;
  if (files.length) handleFile(files[0]);
}

async function handleFile(file) {
  const idToken = getIdToken();
  if (!idToken) {
    alert('⚠️ No id_token was obtained, please log in first!');
    return;
  }

  uploadResult.value = '';
  progress.value = 0;
  progressVisible.value = true;

  try {
    uploadResult.value = 'Getting upload link...';
    const query = `?filename=${encodeURIComponent(file.name)}`;
    const resp = await fetch(PRESIGN_API + query, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (!resp.ok) throw new Error(`Can't get presigned URL，status：${resp.status}`);
    const { uploadUrl, contentType } = await resp.json();

    uploadResult.value = 'Starting to upload file...';
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        progress.value = Math.round((e.loaded / e.total) * 100);
      }
    });
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          progress.value = 100;
          uploadResult.value = `<p class="success">Upload Successfully！</p>`;
        } else {
          uploadResult.value = `<p class="error">Upload failed, status：${xhr.status}</p>`;
        }
      }
    };
    xhr.send(file);

  } catch (err) {
    progressVisible.value = false;
    uploadResult.value = `<p class="error">Upload error：${err.message}</p>`;
    console.error(err);
  }
}
</script>

<style scoped>
#dropZone {
  border: 2px dashed #aaa;
  padding: 30px;
  text-align: center;
  cursor: pointer;
}
#dropZone.dragover {
  border-color: #409eff;
  background: #f0faff;
}
#progressContainer {
  margin-top: 10px;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}
#progressBar {
  height: 100%;
  background: #409eff;
  transition: width 0.3s;
}
.success { color: green; }
.error { color: red; }
</style> 