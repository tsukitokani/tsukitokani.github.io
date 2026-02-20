/* --- 設定：スプレッドシートのURL --- */
const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5QLlQgNmSFgE5kkuVnO6KrhfFItewNcij6760LQQ5V7Z5UIrzTkd05e49RNU0cGB3sLonmaeB4TBp/pub?';

/* --- 共通：画像URL変換 --- */
const formatImg = url => {
    if (!url || typeof url !== 'string') return ''; 
    const m = url.trim().match(/\/d\/(.+?)\//);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : url;
};

/* --- 1. ニュース読み込み（修正版） --- */
async function loadNews() {
    const list = document.getElementById('js-news-list');
    if (!list) return;
    try {
        const res = await fetch(`${BASE_URL}gid=0&single=true&output=tsv&t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const text = await res.text();
        const rows = text.split('\n').slice(1).reverse().slice(0, 5);
        let html = '';
        rows.forEach(row => {
            const cols = row.split('\t');
            if (cols.length < 3) return;
            
            // A列:日付, B列:タグ, C列:タイトル, D列:リンク
            const date = cols[0] || '';
            const tag = cols[1] || 'お知らせ'; // 空欄なら「お知らせ」
            const title = cols[2] || 'タイトルなし';
            const link = cols[3]?.trim(); // リンクURL

            html += `
            <li>
                <span class="news-date">${date}</span>
                <span class="news-tag">${tag}</span>
                ${ link && link !== '#' 
                   ? `<a href="${link}" target="_blank" class="news-link">${title} <span style="font-size:0.8em; margin-left:5px;">🔗</span></a>` 
                   : `<span>${title}</span>` 
                }
            </li>`;
        });
        list.innerHTML = html || '<li>現在、お知らせはありません。</li>';
    } catch (e) { list.innerHTML = '<li>現在、お知らせはありません。</li>'; }
}

/* --- 2. 次回公演読み込み --- */
async function loadNextStage() {
    const container = document.getElementById('js-stage-detail');
    if (!container) return;
    try {
        const res = await fetch(`${BASE_URL}gid=2122620919&single=true&output=tsv&t=${new Date().getTime()}`);
        const text = await res.text();
        const cols = text.split('\n')[1].split('\t');
        if (cols && cols[0] === '公開') {
            const img1 = formatImg(cols[5]);
            const img2 = formatImg(cols[6]);
            container.innerHTML = `
                <h2 style="color:var(--hero-blue)">${cols[1]}『${cols[2]}』</h2>
                <div style="background:#f9f9f9; padding:30px; border-radius:10px; margin-top:20px;">
                    <div class="stage-image-container">
                        ${img1 ? `<img src="${img1}" onclick="openModal(this.src)">` : ''}
                        ${img2 ? `<img src="${img2}" onclick="openModal(this.src)">` : ''}
                    </div>
                    <p style="white-space:pre-wrap;"><b>日時：</b>${cols[3]}\n<b>会場：</b>${cols[4]}\n<b>料金：</b>${cols[10]}</p>
                    <p style="white-space:pre-wrap;"><b>キャスト/スタッフ：</b>\n${cols[8]}</p>
                </div>`;
            setupModal();
        } else { container.innerHTML = '<p style="text-align:center;">COMING SOON...</p>'; }
    } catch (e) { container.innerHTML = '<p style="text-align:center;">COMING SOON...</p>'; }
}

/* --- 3. 過去公演読み込み --- */
async function loadPastStages() {
    const container = document.getElementById('js-past-list');
    if (!container) return;
    try {
        const res = await fetch(`${BASE_URL}gid=1827377121&single=true&output=tsv&t=${new Date().getTime()}`);
        const text = await res.text();
        const rows = text.split('\n').slice(1).reverse();
        let html = '';
        rows.forEach(row => {
            const cols = row.split('\t');
            if (cols.length < 2) return;
            const img1 = formatImg(cols[6]);
            const img2 = formatImg(cols[7]);
            html += `<div style="margin-bottom:50px; border-bottom:1px solid #ddd; padding-bottom:30px;">
                <h3 style="color:var(--main-blue)">${cols[0]}『${cols[1]}』</h3><p>${cols[2]} @${cols[3]}</p>
                <div style="display:flex; gap:10px; overflow-x:auto; margin-top:10px;">
                    ${img1 ? `<img src="${img1}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:150px; cursor:zoom-in;">` : ''}
                    ${img2 ? `<img src="${img2}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:150px; cursor:zoom-in;">` : ''}
                </div></div>`;
        });
        container.innerHTML = html;
        setupModal();
    } catch (e) { }
}

/* --- 4. 劇団紹介読み込み --- */
async function loadMembers() {
    const container = document.getElementById('js-member-accordion');
    if (!container) return;
    try {
        const res = await fetch(`${BASE_URL}gid=900532729&single=true&output=tsv&t=${new Date().getTime()}`);
        const text = await res.text();
        const rows = text.split('\n').slice(1);
        const groups = {};
        rows.forEach(row => {
            const cols = row.split('\t');
            if (cols.length < 2) return;
            const term = cols[0].trim();
            if (!groups[term]) groups[term] = [];
            groups[term].push({ name: cols[1], role: cols[2] || '' });
        });
        let html = '';
        Object.keys(groups).sort().forEach(term => {
            html += `<div class="accordion-item">
                <button class="accordion-header" onclick="toggleAccordion(this)">${term} <span class="icon">+</span></button>
                <div class="accordion-content"><ul class="member-list-mini">
                    ${groups[term].map(m => `<li><b>${m.name}</b><br><small>${m.role}</small></li>`).join('')}
                </ul></div></div>`;
        });
        container.innerHTML = html;
    } catch (e) { }
}

/* --- 5. 外部参加情報 --- */
async function loadExternal() {
    const container = document.getElementById('js-external-list');
    if (!container) return;
    try {
        const res = await fetch(`${BASE_URL}gid=1726086050&single=true&output=tsv&t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Network error');
        const text = await res.text();
        const rows = text.split('\n').slice(1).reverse();
        let html = '';
        rows.forEach(row => {
            const cols = row.split('\t');
            if (cols.length < 2) return;
            const title = cols[0] || 'タイトル未定';
            const date = cols[1] || '';
            const place = cols[2] || '';
            const detail = cols[3] || '';
            const img1 = formatImg(cols[4]);
            const img2 = formatImg(cols[5]);
            const link = cols[6];

            html += `<div style="padding:20px; border-left:5px solid var(--main-yellow); background:#f9f9f9; margin-bottom:20px;">
                <h3 style="margin:0 0 5px 0; color:var(--text-black);">${title}</h3>
                <small style="color:#666; display:block; margin-bottom:10px;">${date}</small>
                <div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:10px;">
                    ${img1 ? `<img src="${img1}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:120px; cursor:zoom-in; border-radius:4px;">` : ''}
                    ${img2 ? `<img src="${img2}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:120px; cursor:zoom-in; border-radius:4px;">` : ''}
                </div>
                ${place ? `<p style="margin:0 0 10px 0; font-weight:800; color:#555;">会場：${place}</p>` : ''}
                <p style="margin-bottom:15px; white-space:pre-wrap;">${detail}</p>
                ${link && link.trim() !== '#' && link.trim() !== '' ? `<a href="${link}" target="_blank" style="color:var(--main-yellow); font-weight:800;">詳細へ →</a>` : ''}
            </div>`;
        });
        container.innerHTML = html || '<p style="text-align:center;">現在、情報はありません。</p>';
    } catch (e) { container.innerHTML = '<p style="text-align:center;">現在、情報はありません。</p>'; }
}

/* --- 補助機能・イベント設定 --- */
function setupModal() {
    if (document.getElementById('js-image-modal')) return;
    const modalHtml = `<div id="js-image-modal" class="image-modal-overlay" onclick="this.style.display='none'"><img class="image-modal-content" id="js-modal-image"></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.openModal = function(src) {
    const modal = document.getElementById('js-image-modal');
    const img = document.getElementById('js-modal-image');
    if(modal && img) { img.src = src; modal.style.display = 'block'; }
};
window.toggleAccordion = function(el) {
    const content = el.nextElementSibling;
    const icon = el.querySelector('.icon');
    if (content.style.maxHeight) { content.style.maxHeight = null; if(icon) icon.innerText = '+'; } 
    else { content.style.maxHeight = content.scrollHeight + "px"; if(icon) icon.innerText = '-'; }
};

/* --- 実行・イベントリスナ --- */
document.addEventListener('DOMContentLoaded', () => {
    loadNews(); loadNextStage(); loadPastStages(); loadMembers(); loadExternal(); setupModal();

    // ハンバーガーメニュー制御
    const hamBtn = document.getElementById('js-hamburger');
    const nav = document.getElementById('js-nav');
    if(hamBtn && nav) {
        hamBtn.addEventListener('click', () => {
            hamBtn.classList.toggle('active');
            nav.classList.toggle('active');
        });
        nav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                hamBtn.classList.remove('active');
                nav.classList.remove('active');
            });
        });
    }

    // トップへ戻るボタン制御
    const topBtn = document.getElementById('page-top-btn');
    if(topBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) { topBtn.classList.add('show'); }
            else { topBtn.classList.remove('show'); }
        });
        topBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});