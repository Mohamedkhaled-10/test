// dashboard.js
// Dashboard بدون تسجيل دخول. يحتوي presets مبدئية ويكتب مباشرة إلى Realtime Database.

const firebaseConfig = {
  apiKey: "AIzaSyDMMu-QNPL6RlGYdGGQVJLzqCC_hsLa8I",
  authDomain: "night-ac2a0.firebaseapp.com",
  databaseURL: "https://night-ac2a0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "night-ac2a0",
  storageBucket: "night-ac2a0.firebasestorage.app",
  messagingSenderId: "202751732517",
  appId: "1:202751732517:web:5d458d19aac8d7135848cc"
};

let firebaseApp, db, refFn, setFn, onValueFn, getFn, removeFn;

async function init() {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js');
  const { getDatabase, ref, set, onValue, get, child, remove } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js');

  firebaseApp = initializeApp(firebaseConfig);
  db = getDatabase(firebaseApp);
  refFn = ref; setFn = set; onValueFn = onValue; getFn = get; removeFn = remove;

  // DOM
  const presetSelect = document.getElementById('presetSelect');
  const templateIdEl = document.getElementById('templateId');
  const templateNameEl = document.getElementById('templateName');
  const imageUrlEl = document.getElementById('imageUrl');
  const targetUrlEl = document.getElementById('targetUrl');
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const showLabelEl = document.getElementById('showLabel');
  const borderRadiusEl = document.getElementById('borderRadius');
  const saveBtn = document.getElementById('saveTemplateBtn');
  const deleteBtn = document.getElementById('deleteTemplateBtn');
  const templatesList = document.getElementById('templatesList');
  const embedSnippet = document.getElementById('embedSnippet');

  // presets
  const PRESETS = {
    preset_leaderboard: {
      name: 'Leaderboard',
      width: 728, height: 90, imageUrl: '', targetUrl: '', showLabel: true, borderRadius: 6
    },
    preset_sidebar: {
      name: 'Sidebar Tall',
      width: 300, height: 600, imageUrl: '', targetUrl: '', showLabel: false, borderRadius: 6
    },
    preset_rect: {
      name: 'Medium Rectangle',
      width: 300, height: 250, imageUrl: '', targetUrl: '', showLabel: false, borderRadius: 6
    },
    preset_mobile: {
      name: 'Mobile Banner',
      width: 320, height: 50, imageUrl: '', targetUrl: '', showLabel: false, borderRadius: 6
    }
  };

  // seed presets in DB if not exist (keeps the default but only writes if missing)
  async function seedPresets() {
    for (const id of Object.keys(PRESETS)) {
      const r = refFn(db, `templates/${id}`);
      try {
        const snap = await getFn(r);
        if (!snap.exists()) {
          const payload = {
            name: PRESETS[id].name,
            imageUrl: PRESETS[id].imageUrl,
            targetUrl: PRESETS[id].targetUrl,
            width: PRESETS[id].width,
            height: PRESETS[id].height,
            showLabel: PRESETS[id].showLabel,
            borderRadius: PRESETS[id].borderRadius,
            stats: { impressions: 0, clicks: 0 },
            createdAt: Date.now()
          };
          await setFn(r, payload);
        }
      } catch (err) {
        console.warn('seed error', err);
      }
    }
  }

  await seedPresets();

  // listen to templates and show them
  const allRef = refFn(db, 'templates');
  onValueFn(allRef, (snap) => {
    const data = snap.val() || {};
    templatesList.innerHTML = '';
    Object.keys(data).forEach(id => {
      const t = data[id];
      const card = document.createElement('div');
      card.className = 'template-card';
      const preview = document.createElement('div');
      preview.className = 'template-preview';
      const img = document.createElement('img');
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src = t.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="18">No Image</text></svg>';
      preview.appendChild(img);

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<strong>${t.name || id}</strong><div class="small-muted">id: ${id}</div><div class="small-muted">size: ${t.width || '-'} x ${t.height || '-'}</div><div class="small-muted">impr: ${t.stats?.impressions||0} • clicks: ${t.stats?.clicks||0}</div>`;

      const actions = document.createElement('div');
      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'تحرير';
      loadBtn.addEventListener('click', () => {
        templateIdEl.value = id;
        templateNameEl.value = t.name || '';
        imageUrlEl.value = t.imageUrl || '';
        targetUrlEl.value = t.targetUrl || '';
        widthEl.value = t.width || '';
        heightEl.value = t.height || '';
        showLabelEl.value = String(!!t.showLabel);
        borderRadiusEl.value = t.borderRadius || 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'انسخ كود التضمين';
      copyBtn.style.background = '#00a86b';
      copyBtn.addEventListener('click', () => {
        const snippet = generateEmbedSnippet(id);
        navigator.clipboard.writeText(snippet).then(() => alert('تم نسخ كود التضمين'));
      });

      actions.appendChild(loadBtn);
      actions.appendChild(copyBtn);

      card.appendChild(preview);
      card.appendChild(info);
      card.appendChild(actions);
      templatesList.appendChild(card);
    });

    embedSnippet.textContent = generateEmbedSnippet('TEMPLATE_ID_HERE');
  });

  // when user picks a preset => fill the form
  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (!val) return;
    const p = PRESETS[val];
    templateIdEl.value = val; // use preset id as default id
    templateNameEl.value = p.name;
    imageUrlEl.value = p.imageUrl || '';
    targetUrlEl.value = p.targetUrl || '';
    widthEl.value = p.width;
    heightEl.value = p.height;
    showLabelEl.value = String(!!p.showLabel);
    borderRadiusEl.value = p.borderRadius;
  });

  // save / publish template
  saveBtn.addEventListener('click', async () => {
    let id = templateIdEl.value.trim();
    if (!id) {
      // generate id from name
      const slug = (templateNameEl.value || 'ad').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
      id = `ad_${slug}_${Date.now()}`;
      templateIdEl.value = id;
    }
    const payload = {
      name: templateNameEl.value.trim() || id,
      imageUrl: imageUrlEl.value.trim(),
      targetUrl: targetUrlEl.value.trim(),
      width: Number(widthEl.value) || null,
      height: Number(heightEl.value) || null,
      showLabel: showLabelEl.value === 'true',
      borderRadius: Number(borderRadiusEl.value) || 0,
      updatedAt: Date.now()
    };
    try {
      await setFn(refFn(db, `templates/${id}`), { ...payload, stats: { impressions: 0, clicks: 0 } });
      alert('تم الحفظ والنشر — الإعلان سيظهر فورًا في الصفحات التي تحتوي الكود');
    } catch (err) {
      alert('فشل الحفظ: ' + err.message);
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const id = templateIdEl.value.trim();
    if (!id) return alert('ضع معرف القالب للحذف');
    if (!confirm('متأكد تريد حذف القالب؟')) return;
    try {
      await removeFn(refFn(db, `templates/${id}`));
      alert('تم الحذف');
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    }
  });

  function generateEmbedSnippet(templateId) {
    // IMPORTANT: غيّر THIS_ASSETS_BASE إلى مسار الملفات عندك (domain أو CDN) لو مش بنفس المجلد
    const THIS_ASSETS_BASE = 'https://YOUR_DOMAIN_OR_CDN'; // <--- غيِّره
    return `<div id="AD_CONTAINER_ID"></div>\n<script type="module">\n  import initAdEmbed from '${THIS_ASSETS_BASE}/ad-embed.js';\n  initAdEmbed({ containerId: 'AD_CONTAINER_ID', templateId: '${templateId}' });\n</script>\n<!-- تأكد إن ad-embed.js متاح في نفس المسار أو غيّر THIS_ASSETS_BASE -->`;
  }
}

init().catch(err => {
  console.error(err);
  alert('خطأ تهيئة الداشبورد: ' + err.message);
});
