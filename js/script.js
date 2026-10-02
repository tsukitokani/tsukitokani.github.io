const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5QLlQgNmSFgE5kkuVnO6KrhfFItewNcij6760LQQ5V7Z5UIrzTkd05e49RNU0cGB3sLonmaeB4TBp/pub?';

const formatImg = url => {
    if (!url || typeof url !== 'string') return '';
    const m = url.trim().match(/\/d\/(.+?)\//);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : url;
};

function parseTSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === '\t' && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && text[i + 1] === '\n') {
                i++;
            }
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += c;
        }
    }
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    return rows;
}

// 改行文字を <br> に整える関数（余計な装飾は一切入れない）
function formatText(text) {
    if (!text) return '';
    return text.replace(/\r?\n/g, '<br>');
}

async function loadNews() {
    const list = document.getElementById('js-news-list');
    const pageList = document.getElementById('js-news-page-list');
    const target = list || pageList;
    if (!target) return;

    const res = await fetch(`${BASE_URL}gid=0&single=true&output=tsv&t=${new Date().getTime()}`);
    const text = await res.text();
    const parsedRows = parseTSV(text).slice(1);

    let rows = parsedRows.map((cols, index) => ({ data: cols, id: index })).reverse();
    rows = rows.filter(item => item.data[0] === '公開');

    if (list) { rows = rows.slice(0, 5); }

    let html = '';
    rows.forEach(item => {
        const cols = item.data;
        if (cols.length < 4) return;
        const date = cols[1] || '';
        const tag = cols[2] || '';
        const title = cols[3] || '';
        const contentOrUrl = cols[4]?.trim() || '';

        let linkUrl = '';
        if (contentOrUrl.startsWith('http')) {
            linkUrl = contentOrUrl;
        } else if (contentOrUrl !== '') {
            linkUrl = `article.html?id=${item.id}`;
        }

        if (linkUrl) {
            html += `
            <li>
                <a href="${linkUrl}" ${linkUrl.startsWith('http') ? 'target="_blank"' : ''}>
                    <span class="news-date">${date}</span>
                    <span class="news-tag">${tag}</span>
                    <span class="news-title">${title}</span>
                </a>
            </li>`;
        } else {
            html += `
            <li>
                <div class="news-content">
                    <span class="news-date">${date}</span>
                    <span class="news-tag">${tag}</span>
                    <span class="news-title">${title}</span>
                </div>
            </li>`;
        }
    });
    target.innerHTML = html || '<li>現在、お知らせはありません。</li>';
}

async function loadArticle() {
    const container = document.getElementById('js-article-content');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');
    if (articleId === null) return;

    const res = await fetch(`${BASE_URL}gid=0&single=true&output=tsv&t=${new Date().getTime()}`);
    const text = await res.text();
    const rows = parseTSV(text).slice(1);

    const cols = rows[articleId];
    if (!cols || cols[0] !== '公開') return;

    const date = cols[1] || '';
    const tag = cols[2] || '';
    const title = cols[3] || '';
    const content = formatText(cols[4] || '');
    const imgUrl = formatImg(cols[5]);

    let imgHtml = '';
    if (imgUrl) {
        imgHtml = `<div class="article-image"><img src="${imgUrl}" alt=""></div>`;
    }

    container.innerHTML = `
        <div class="article-header">
            <span class="news-tag">${tag}</span>
            <span class="news-date">${date}</span>
            <h1 class="article-title">${title}</h1>
        </div>
        ${imgHtml}
        <div class="article-body">${content}</div>
        <div class="article-footer-links">
            <a href="index.html" class="btn-back">← ホームに戻る</a>
            <a href="news.html" class="btn-list">一覧を見る</a>
        </div>
    `;
}

async function loadNextStage() {
    const container = document.getElementById('js-stage-detail');
    if (!container) return;
    
    const res = await fetch(`${BASE_URL}gid=2122620919&single=true&output=tsv&t=${new Date().getTime()}`);
    const text = await res.text();
    const rows = parseTSV(text);
    const cols = rows[1];
    
    if (cols && cols[0] === '公開') {
        const groupName = cols[1] || '愛知淑徳大学演劇研究会「月とカニ」';
        const titleText = cols[2]?.trim() ? `『${cols[2]}』` : '';
        
        const date = formatText(cols[3]?.trim() || '');
        const place = formatText(cols[4]?.trim() || '');
        const script = formatText(cols[5]?.trim() || '');
        const img1 = formatImg(cols[6]);
        const img2 = formatImg(cols[7]);
        const reserveUrl = cols[8]?.trim() || '';
        const castText = formatText(cols[9]?.trim() || '');
        const staffText = formatText(cols[10]?.trim() || '');
        const price = formatText(cols[11]?.trim() || '');
        
        let imgHtml = '';
        if (img1 || img2) {
            imgHtml = `
            <div class="stage-image-container">
                ${img1 ? `<img src="${img1}" onclick="openModal(this.src)">` : ''}
                ${img2 ? `<img src="${img2}" onclick="openModal(this.src)">` : ''}
            </div>`;
        }
        
        let infoHtml = '';
        if (date) infoHtml += `<div><b>日時：</b>${date}</div>`;
        if (place) infoHtml += `<div><b>会場：</b>${place}</div>`;
        if (script) infoHtml += `<div><b>脚本：</b>${script}</div>`;
        if (price) infoHtml += `<div><b>料金：</b>${price}</div>`;
        if (reserveUrl && reserveUrl.startsWith('http')) {
            infoHtml += `<div><b>予約：</b><a href="${reserveUrl}" target="_blank">こちらから</a></div>`;
        }
        
        let contentHtml = '';
        if (infoHtml) contentHtml += `<div class="stage-info">${infoHtml}</div>`;
        
        if (castText || staffText) {
            if (castText) contentHtml += `<div class="stage-cast"><b>役者：</b><div>${castText}</div></div>`;
            if (staffText) contentHtml += `<div class="stage-staff"><b>スタッフ：</b><div>${staffText}</div></div>`;
        }
        
        container.innerHTML = `
            <h2>${groupName}${titleText}</h2>
            <div class="stage-box">
                ${imgHtml}
                ${contentHtml}
            </div>`;
        setupModal();
    } else { 
        container.innerHTML = '<p class="coming-soon">COMING SOON...</p>'; 
    }
}

async function loadPastStages() {
    const container = document.getElementById('js-past-list');
    if (!container) return;
    const res = await fetch(`${BASE_URL}gid=1827377121&single=true&output=tsv&t=${new Date().getTime()}`);
    const text = await res.text();
    const rows = parseTSV(text).slice(1).reverse();
    let html = '';
    rows.forEach(cols => {
        if (cols.length < 3 || cols[0] !== '公開') return;
        const img1 = formatImg(cols[7]);
        const img2 = formatImg(cols[8]);
        html += `<div class="past-item">
            <h3>${cols[1]}『${cols[2]}』</h3><p>${cols[3]} @${cols[4]}</p>
            <div class="past-images">
                ${img1 ? `<img src="${img1}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)">` : ''}
                ${img2 ? `<img src="${img2}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)">` : ''}
            </div></div>`;
    });
    container.innerHTML = html;
    setupModal();
}

async function loadMembers() {
    const container = document.getElementById('js-member-accordion');
    if (!container) return;
    const res = await fetch(`${BASE_URL}gid=900532729&single=true&output=tsv&t=${new Date().getTime()}`);
    const text = await res.text();
    const rows = parseTSV(text).slice(1);
    const groups = {};
    rows.forEach(cols => {
        if (cols.length < 3 || cols[0] !== '公開') return;
        const term = cols[1].trim();
        if (!groups[term]) groups[term] = [];
        groups[term].push({ name: cols[2], role: cols[3] || '' });
    });
    let html = '';
    Object.keys(groups).sort().reverse().forEach(term => {
        html += `<div class="accordion-item">
            <button class="accordion-header" onclick="toggleAccordion(this)">${term} <span class="icon">+</span></button>
            <div class="accordion-content"><ul class="member-list-mini">
                ${groups[term].map(m => `<li><b>${m.name}</b><br><small>${m.role}</small></li>`).join('')}
            </ul></div></div>`;
    });
    container.innerHTML = html;
}

async function loadExternal() {
    const container = document.getElementById('js-external-list');
    if (!container) return;
    const res = await fetch(`${BASE_URL}gid=1726086050&single=true&output=tsv&t=${new Date().getTime()}`);
    const text = await res.text();
    const rows = parseTSV(text).slice(1).reverse();
    let html = '';
    rows.forEach(cols => {
        if (cols.length < 3 || cols[0] !== '公開') return;
        const title = cols[1] || '';
        const date = cols[2] || '';
        const place = cols[3] || '';
        const detail = formatText(cols[4] || '');
        const img1 = formatImg(cols[5]);
        const img2 = formatImg(cols[6]);
        const link = cols[7];
        html += `<div class="external-item">
            <h3>${title}</h3>
            <small>${date}</small>
            <div class="external-images">
                ${img1 ? `<img src="${img1}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)">` : ''}
                ${img2 ? `<img src="${img2}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)">` : ''}
            </div>
            ${place ? `<p>会場：${place}</p>` : ''}
            <div class="external-detail">${detail}</div>
            ${link && link.trim() !== '#' && link.trim() !== '' ? `<a href="${link}" target="_blank" class="external-link">詳細へ →</a>` : ''}
        </div>`;
    });
    container.innerHTML = html || '<p class="no-data">現在、外部参加情報はありません。</p>';
}

function setupModal() {
    if (document.getElementById('js-image-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="js-image-modal" class="image-modal-overlay" onclick="this.style.display='none'"><img class="image-modal-content" id="js-modal-image"></div>`);
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

document.addEventListener('DOMContentLoaded', () => {
    loadNews(); loadNextStage(); loadPastStages(); loadMembers(); loadExternal(); loadArticle(); setupModal();
    const hamBtn = document.getElementById('js-hamburger');
    const nav = document.getElementById('js-nav');
    if(hamBtn && nav) {
        hamBtn.addEventListener('click', () => { hamBtn.classList.toggle('active'); nav.classList.toggle('active'); });
        nav.querySelectorAll('a').forEach(a => { a.addEventListener('click', () => { hamBtn.classList.remove('active'); nav.classList.remove('active'); }); });
    }
});
