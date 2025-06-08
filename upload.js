// —— 常量定义 ——
const PRESIGN_API               = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/presignedURL';
const API_ENDPOINT_FIND_BY_SPECIES = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_by_species';
const API_ENDPOINT_FIND_BY_THUMB  = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query';
const API_ENDPOINT_GET_LABELS    = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/edittag';
const API_ENDPOINT_UPDATE_TAGS   = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/edittag';
const API_ENDPOINT_DELETE_FILES  = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/query_delete_files';
const API_QUERY_ENDPOINT         = 'https://ajens8j2c5.execute-api.us-east-1.amazonaws.com/test/Find_image_video';

// —— Cognito ID Token 提取 ——
function getIdToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

// —— 文件上传相关元素 ——
const dropZone         = document.getElementById('dropZone');
const fileInput        = document.getElementById('fileInput');
const progressContainer= document.getElementById('progressContainer');
const progressBar      = document.getElementById('progressBar');
const uploadResult     = document.getElementById('uploadResult');

// —— 触发文件选择 ——
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  dropZone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
  });
});
dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) handleFile(files[0]);
});

// —— 处理文件上传 ——
async function handleFile(file) {
  const idToken = getIdToken();
  if (!idToken) {
    alert('未获得 id_token，请先登录！');
    return;
  }

  uploadResult.textContent        = '';
  progressBar.style.width         = '0%';
  progressContainer.style.visibility = 'visible';

  try {
    uploadResult.textContent = '获取上传链接中...';
    const query = `?filename=${encodeURIComponent(file.name)}`;
    const presignResp = await fetch(`${PRESIGN_API}${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (!presignResp.ok) throw new Error(`无法获取 presigned URL，状态：${presignResp.status}`);
    const { uploadUrl, contentType } = await presignResp.json();

    uploadResult.textContent = '开始上传文件...';
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + '%';
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          progressBar.style.width = '100%';
          uploadResult.innerHTML = `<p class="success">上传成功！</p>`;
        } else {
          uploadResult.innerHTML = `<p class="error">上传失败，状态：${xhr.status}</p>`;
          console.error(`上传失败，状态：${xhr.status}`);
        }
      }
    };
    xhr.send(file);

  } catch (err) {
    progressContainer.style.visibility = 'hidden';
    uploadResult.innerHTML = `<p class="error">上传出错：${err.message}</p>`;
    console.error(err);
  }
}

// —— 按物种查询 ——
const searchBtn   = document.getElementById('searchBtn');
const speciesInput= document.getElementById('speciesInput');
const linksList   = document.getElementById('linksList');

searchBtn.addEventListener('click', () => {
  const idToken = getIdToken();
  if (!idToken) {
    alert('未获得 id_token，请先登录！');
    return;
  }

  const raw = speciesInput.value.trim();
  if (!raw) { alert('请先输入至少一个物种（英文小写，逗号分隔）。'); return; }
  const arr = raw.split(',').map(s=>s.trim()).filter(s=>s);
  if (!arr.length) { alert('请输入合法的物种列表，比如：crow 或 crow,pigeon'); return; }

  const qs = arr.map(sp => `species=${encodeURIComponent(sp)}`).join('&');
  const url = `${API_ENDPOINT_FIND_BY_SPECIES}?${qs}`;

  fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    }
  })
  .then(resp => { if (!resp.ok) throw new Error('HTTP 错误：'+resp.status); return resp.json(); })
  .then(data => {
    linksList.innerHTML = '';
    if (Array.isArray(data.links) && data.links.length) {
      data.links.forEach(link => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href = link; a.target = '_blank'; a.textContent = link;
        li.appendChild(a); linksList.appendChild(li);
      });
    } else {
      linksList.innerHTML = '<li>没有匹配到任何文件。</li>';
    }
  })
  .catch(err => {
    console.error(err);
    linksList.innerHTML = '<li>查询出错，请检查控制台日志。</li>';
  });
});

// —— 按缩略图查询原图 ——
const thumbBtn     = document.getElementById('thumbBtn');
const thumbInput   = document.getElementById('thumbInput');
const thumbResult  = document.getElementById('thumbResult');

thumbBtn.addEventListener('click', async () => {
  const idToken = getIdToken();
  thumbResult.innerHTML = '';
  if (!idToken) { thumbResult.innerHTML = '<p class="error">⚠️ 未获得 id_token，请先登录！</p>'; return; }

  const thumbUrl = thumbInput.value.trim();
  if (!thumbUrl) {
    thumbResult.innerHTML = '<p class="error">⚠️ 请先输入一个缩略图 S3 URL。</p>';
    return;
  }

  thumbBtn.disabled = true;
  thumbBtn.textContent = '查询中...';
  
  try {
    const resp = await fetch(API_ENDPOINT_FIND_BY_THUMB, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ thumbnail_url: thumbUrl })
    });
    if (!resp.ok) throw new Error('后端返回状态：'+resp.status);
    const data = await resp.json();
    if (!data.full_image_url) throw new Error('后端未返回 full_image_url');
    thumbResult.innerHTML = `
      <p class="success">查询成功！原图 URL：</p>
      <a href="${data.full_image_url}" target="_blank">${data.full_image_url}</a>
    `;
  } catch (err) {
    console.error(err);
    thumbResult.innerHTML = `<p class="error">❌ 查询失败：${err.message}</p>`;
  } finally {
    thumbBtn.disabled = false;
    thumbBtn.textContent = '查询原图';
  }
});

// —— 获取当前标签 ——
const fetchLabelsBtn    = document.getElementById('fetchLabelsBtn');
const urlsInput         = document.getElementById('urlsInput');
const currentLabelsArea = document.getElementById('currentLabelsArea');
const updateResultArea  = document.getElementById('updateResultArea');

fetchLabelsBtn.addEventListener('click', async () => {
  const idToken = getIdToken();
  currentLabelsArea.innerHTML = '';
  updateResultArea.innerHTML  = '';
  if (!idToken) {
    currentLabelsArea.innerHTML = '<div class="error">⚠️ 未获得 id_token，请先登录！</div>';
    return;
  }

  const rawUrls = urlsInput.value.trim();
  if (!rawUrls) {
    currentLabelsArea.innerHTML = '<div class="error">⚠️ 请先输入至少一个 URL，每行一个。</div>';
    return;
  }
  const urlList = rawUrls.split('
').map(l=>l.trim()).filter(l=>l);
  if (!urlList.length) { currentLabelsArea.innerHTML = '<div class="error">⚠️ 无效的 URL 列表，请检查输入。</div>'; return; }

  fetchLabelsBtn.disabled = true;
  fetchLabelsBtn.textContent = '查询中...';

  try {
    const qs = urlList.map(u => `url=${encodeURIComponent(u)}`).join('&');
    const resp = await fetch(`${API_ENDPOINT_GET_LABELS}?${qs}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (!resp.ok) throw new Error('后端返回状态：'+resp.status);
    const data = await resp.json();

    currentLabelsArea.innerHTML = '';
    urlList.forEach(u => {
      const labels = (data.results||{})[u]||{};
      const section = document.createElement('div');
      section.style.marginBottom = '16px';
      section.innerHTML = `<h3 style="font-size:0.95rem;color:#1e40af;">URL: ${u}</h3><pre>${JSON.stringify(labels,null,2)}</pre>`;
      currentLabelsArea.appendChild(section);
    });
  } catch (err) {
    console.error(err);
    currentLabelsArea.innerHTML = `<div class="error">❌ 查询失败：${err.message}</div>`;
  } finally {
    fetchLabelsBtn.disabled = false;
    fetchLabelsBtn.textContent = '获取当前标签';
  }
});

// —— 提交更新标签 ——
const submitUpdateBtn = document.getElementById('submitUpdateBtn');
submitUpdateBtn.addEventListener('click', async () => {
  const idToken = getIdToken();
  updateResultArea.innerHTML = '';
  if (!idToken) {
    updateResultArea.innerHTML = '<div class="error">⚠️ 未获得 id_token，请先登录！</div>';
    return;
  }

  const rawUrls = urlsInput.value.trim();
  if (!rawUrls) {
    updateResultArea.innerHTML = '<div class="error">⚠️ 请先在上方输入 URL 列表并获取当前标签。</div>';
    return;
  }
  const urlList = rawUrls.split('\n').map(l=>l.trim()).filter(l=>l);
  if (!urlList.length) { updateResultArea.innerHTML = '<div class="error">⚠️ 无效的 URL 列表，请检查输入。</div>'; return; }

  let tagsObj;
  try {
    tagsObj = JSON.parse(tagsInput.value.trim());
    if (typeof tagsObj !== 'object' || Array.isArray(tagsObj)) throw new Error('必须是一个 {"tag":number, ...} 对象');
    Object.entries(tagsObj).forEach(([k,v]) => { if (typeof v !== 'number') throw new Error(`标签 \"${k}\" 的值必须是 number`); });
  } catch (err) {
    updateResultArea.innerHTML = `<div class="error">⚠️ 标签字典 JSON 错误：${err.message}</div>`;
    return;
  }

  const operation = parseInt(document.querySelector('input[name="opType"]:checked').value,10);
  submitUpdateBtn.disabled = true;
  submitUpdateBtn.textContent = '提交中...';

  try {
    const resp = await fetch(API_ENDPOINT_UPDATE_TAGS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ url: urlList, operation, tags: tagsObj })
    });
    if (!resp.ok) throw new Error(resp.statusText||resp.status);
    const text = await resp.text();
    updateResultArea.innerHTML = `<div class="result">✅ 操作成功，后端返回：<br>${text}</div>`;
  } catch (err) {
    console.error(err);
    updateResultArea.innerHTML = `<div class="error">❌ 更新失败：${err.message}</div>`;
  } finally {
    submitUpdateBtn.disabled = false;
    submitUpdateBtn.textContent = '提交更新标签';
  }
});

// —— 删除文件 ——
const deleteUrlsInput  = document.getElementById('deleteUrlsInput');
const deleteFilesBtn   = document.getElementById('deleteFilesBtn');
const deleteResultArea = document.getElementById('deleteResultArea');

deleteFilesBtn.addEventListener('click', async () => {
  const idToken = getIdToken();
  deleteResultArea.innerHTML = '';
  if (!idToken) {
    deleteResultArea.innerHTML = '<p class="error">⚠️ 未获得 id_token，请先登录！</p>';
    return;
  }

  const raw = deleteUrlsInput.value.trim();
  if (!raw) { deleteResultArea.innerHTML = '<p class="error">⚠️ 请先输入至少一个 URL</p>'; return; }
  const urlList = raw.split('\n').map(u=>u.trim()).filter(u=>u);
  if (!urlList.length) { deleteResultArea.innerHTML = '<p class="error">⚠️ 无效的 URL 列表</p>'; return; }

  deleteFilesBtn.disabled = true;
  deleteFilesBtn.textContent = '删除中…';

  try {
    const resp = await fetch(API_ENDPOINT_DELETE_FILES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ urls: urlList })
    });
    const data = await resp.json();
    if (resp.ok) {
      deleteResultArea.innerHTML = `<p class="success">✅ 删除成功：${data.message}</p>`;
    } else {
      deleteResultArea.innerHTML = `<p class="error">❌ 删除失败：${data.message||resp.status}</p>`;
    }
  } catch (err) {
    console.error(err);
    deleteResultArea.innerHTML = `<p class="error">🚨 异常：${err.message}</p>`;
  } finally {
    deleteFilesBtn.disabled = false;
    deleteFilesBtn.textContent = '删除选中文件';
  }
});

// —— 按标签查询文件 ——
const queryTagInput   = document.getElementById('queryTagInput');
const queryCountInput = document.getElementById('queryCountInput');
const queryFilesBtn   = document.getElementById('queryFilesBtn');
const queryResultArea = document.getElementById('queryResultArea');

queryFilesBtn.addEventListener('click', async () => {
  const idToken = getIdToken();
  queryResultArea.innerHTML = '';
  if (!idToken) {
    queryResultArea.innerHTML = '<p class="error">⚠️ 未获得 id_token，请先登录！</p>';
    return;
  }

  const tag   = queryTagInput.value.trim();
  const count = parseInt(queryCountInput.value,10);
  if (!tag || isNaN(count)||count<1) {
    queryResultArea.innerHTML = '<p class="error">⚠️ 请填写有效的标签名和最小次数</p>';
    return;
  }

  queryFilesBtn.disabled   = true;
  queryFilesBtn.textContent = '查询中…';

  try {
    const resp = await fetch(API_QUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ tags: { [tag]: count } })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message||resp.statusText);

    if (!data.links || data.links.length===0) {
      queryResultArea.innerHTML = '<p>ℹ️ 未找到满足条件的文件。</p>';
    } else {
      const list = document.createElement('ul');
      data.links.forEach(url => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
        list.appendChild(li);
      });
      queryResultArea.appendChild(list);
    }
  } catch (err) {
    console.error(err);
    queryResultArea.innerHTML = `<p class="error">🚨 查询失败：${err.message}</p>`;
  } finally {
    queryFilesBtn.disabled   = false;
    queryFilesBtn.textContent = '查询文件';
  }
});
