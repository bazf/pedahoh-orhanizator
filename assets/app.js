// Shared Gemini integration and content persistence
(function(){
  // Load bootstrap icons
  var icon = document.createElement('link');
  icon.rel = 'stylesheet';
  icon.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css';
  document.head.appendChild(icon);

  document.addEventListener('DOMContentLoaded', function(){
    const params = new URLSearchParams(location.search);
    const keyParam = params.get('apiKey');
    const modelParam = params.get('model');
    if (keyParam) localStorage.setItem('geminiApiKey', keyParam);
    if (modelParam) localStorage.setItem('geminiModel', modelParam);
    const apiKey = localStorage.getItem('geminiApiKey') || '';
    const model = localStorage.getItem('geminiModel') || 'gemini-pro';

    const storageKey = 'generated:' + location.pathname;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

    // Add modal
    const modalHtml = `
<div class="modal fade" id="geminiModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Згенерувати контент</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрити"></button>
      </div>
      <div class="modal-body">
        <textarea id="geminiPrompt" class="form-control" rows="4" placeholder="Опишіть, який контент потрібен"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрити</button>
        <button type="button" class="btn btn-primary" id="geminiGenerate">Згенерувати</button>
      </div>
    </div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('geminiModal');
    const bsModal = new bootstrap.Modal(modalEl);
    let targetSection = null;

    // Add buttons to sections
    const sections = document.querySelectorAll('section');
    sections.forEach((section, idx) => {
      section.dataset.sectionId = 's'+idx;
      const h = section.querySelector('h1, h2, h3, h4, h5, h6');
      if (!h) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline-secondary ms-2 gemini-btn';
      btn.innerHTML = '<i class="bi bi-stars"></i>';
      h.appendChild(btn);
      btn.addEventListener('click', () => {
        targetSection = section;
        document.getElementById('geminiPrompt').value = '';
        bsModal.show();
      });
      // Restore saved content
      const html = saved[section.dataset.sectionId];
      if (html) section.insertAdjacentHTML('beforeend', html);
    });

    async function generateContent(section, prompt){
      if (!apiKey) {
        alert('Будь ласка, вкажіть apiKey у параметрі URL: ?apiKey=YOUR_KEY');
        return;
      }
      const context = section.innerText.trim();
      const fullPrompt = `${prompt}\n\nКонтекст сторінки: ${document.title}. Поточний вміст секції:\n${context}\n\nПоверни HTML, який можна додати до сторінки.`;
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({contents: [{parts: [{text: fullPrompt}]}]})
        });
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
        if (text) {
          section.insertAdjacentHTML('beforeend', `<div class="generated mt-2">${text}</div>`);
          save();
        }
      } catch(err){
        console.error(err);
        alert('Не вдалося отримати відповідь від Gemini');
      }
    }

    function save(){
      const obj = {};
      sections.forEach(sec => {
        const gen = Array.from(sec.querySelectorAll('.generated')).map(d=>d.outerHTML).join('');
        if (gen) obj[sec.dataset.sectionId] = gen;
      });
      localStorage.setItem(storageKey, JSON.stringify(obj));
    }

    document.getElementById('geminiGenerate').addEventListener('click', async () => {
      const prompt = document.getElementById('geminiPrompt').value.trim();
      bsModal.hide();
      if (prompt && targetSection) {
        await generateContent(targetSection, prompt);
      }
    });
  });
})();
