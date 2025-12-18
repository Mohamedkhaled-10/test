// ad-embed.js
// usage: import initAdEmbed from '/ad-embed.js'; initAdEmbed({ containerId:'AD_CONTAINER', templateId:'preset_leaderboard' });

const firebaseConfig = {
  apiKey: "AIzaSyDMMu-QNPL6RlGYdGGQVJLzqCC_hsLa8I",
  authDomain: "night-ac2a0.firebaseapp.com",
  databaseURL: "https://night-ac2a0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "night-ac2a0",
  storageBucket: "night-ac2a0.firebasestorage.app",
  messagingSenderId: "202751732517",
  appId: "1:202751732517:web:5d458d19aac8d7135848cc"
};

let inited = false;
async function initFirebase() {
  if (inited) return;
  inited = true;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js');
  const { getDatabase, ref, onValue, get, runTransaction } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js');
  const app = initializeApp(firebaseConfig);
  initFirebase.db = getDatabase(app);
  initFirebase.ref = ref;
  initFirebase.onValue = onValue;
  initFirebase.get = get;
  initFirebase.runTransaction = runTransaction;
}

function buildAdDom(template) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ad-slot';
  if (template.width && template.height) {
    wrapper.style.maxWidth = template.width + 'px';
    wrapper.style.aspectRatio = `${template.width} / ${template.height}`;
  } else {
    wrapper.style.width = '100%';
    wrapper.style.aspectRatio = '16/9';
  }
  wrapper.style.borderRadius = (template.borderRadius || 0) + 'px';
  wrapper.style.overflow = 'hidden';
  wrapper.style.position = 'relative';
  wrapper.style.cursor = 'pointer';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.background = template.backgroundColor || '#f6f6f6';

  if (template.showLabel) {
    const label = document.createElement('div');
    label.textContent = 'Ad';
    label.className = 'ad-label';
    wrapper.appendChild(label);
  }

  const img = document.createElement('img');
  img.alt = template.alt || (template.name || 'ad image');
  img.loading = 'lazy';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = template.objectFit || 'cover';
  img.src = template.imageUrl || '';

  if (!template.imageUrl) {
    img.style.objectFit = 'contain';
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="18">No Image</text></svg>';
  }

  const anchor = document.createElement('a');
  anchor.href = template.targetUrl || '#';
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'block';
  anchor.style.width = '100%';
  anchor.style.height = '100%';
  anchor.style.textDecoration = 'none';
  anchor.appendChild(img);

  wrapper.appendChild(anchor);

  return wrapper;
}

async function incrementStat(templateId, key) {
  const ref = initFirebase.ref(initFirebase.db, `templates/${templateId}/stats/${key}`);
  try {
    await initFirebase.runTransaction(ref, cur => (cur || 0) + 1);
  } catch (err) {
    console.warn('stat tx failed', err);
  }
}

export default async function initAdEmbed({ containerId, templateId }) {
  if (!containerId || !templateId) {
    console.error('initAdEmbed requires containerId and templateId');
    return;
  }
  await initFirebase();
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('container not found', containerId);
    return;
  }

  const templateRef = initFirebase.ref(initFirebase.db, `templates/${templateId}`);
  initFirebase.onValue(templateRef, (snap) => {
    const val = snap.val();
    container.innerHTML = '';
    if (!val) {
      container.innerHTML = '<div class="ad-slot placeholder">Template not found</div>';
      return;
    }
    const adDom = buildAdDom(val);
    container.appendChild(adDom);

    // increment impression once per page load (store key in sessionStorage to avoid duplicates)
    try {
      const key = `impr_${templateId}`;
      if (!sessionStorage.getItem(key)) {
        incrementStat(templateId, 'impressions');
        sessionStorage.setItem(key, '1');
      }
    } catch (e) { incrementStat(templateId, 'impressions'); }

    // handle clicks and count
    container.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        incrementStat(templateId, 'clicks');
        // default opens link in new tab
      });
    });
  });
}
