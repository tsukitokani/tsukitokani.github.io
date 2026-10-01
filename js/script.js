const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5QLlQgNmSFgE5kkuVnO6KrhfFItewNcij6760LQQ5V7Z5UIrzTkd05e49RNU0cGB3sLonmaeB4TBp/pub?';

const formatImg = url => {
    if (!url || typeof url !== 'string') return '';
    const m = url.trim().match(/\/d\/(.+?)\//);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : url;
};

// TSVのセル内改行を保持して2次元配列に分割するパーサー
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

// 改行文字を <br> タグに置換する共通関数
function toBr(text) {
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

        const colorStyle = pageList ? 'style="color:#333; border-bottom:1px solid #ddd;"' : '';
        const tagStyle = pageList ? 'style="background:var(--main-yellow); color:white;"' : '';

        if (linkUrl) {
            html += `
            <li>
                <a href="${linkUrl}" ${colorStyle} ${linkUrl.startsWith('http') ? 'target="_blank"' : ''}>
                    <span class="news-date">${date}</span>
                    <span class="news-tag" ${tagStyle}>${tag}</span>
                    <span class="news-title">${title}</span>
                </a>
            </li>`;
        } else {
            html += `
            <li>
                <div class="news-content" ${colorStyle}>
                    <span class="news-date">${date}</span>
                    <span class="news-tag" ${tagStyle}>${tag}</span>
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
    const content = toBr(cols[4] || '');
    const imgUrl = formatImg(cols[5]);

    let imgHtml = '';
    if (imgUrl) {
        imgHtml = `<div style="text-align:center; margin-bottom: 30px;"><img src="${imgUrl}" style="max-height:400px; border-radius:8px;" alt=""></div>`;
    }

    container.innerHTML = `
        <div style="margin-bottom: 20px; border-bottom: 2px solid var(--main-yellow); padding-bottom: 15px;">
            <span class="news-tag" style="background:var(--main-yellow); color:white; display:inline-block; margin-bottom:10px; padding: 4px 12px; border-radius: 2px; font-weight: 800; font-size: 0.8rem;">${tag}</span>
            <span style="font-weight:bold; color:#666; margin-left:15px;">${date}</span>
            <h2 style="font-size: 1.8rem; margin: 10px 0 0 0; line-height: 1.4;">${title}</h2>
        </div>
        ${imgHtml}
        <div style="line-height: 2.0; font-size: 1.1rem;">${content}</div>
        <div style="text-align: center; margin-top: 50px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
            <a href="index.html" style="display:inline-block; padding: 10px 30px; background:var(--main-blue); color:white; border-radius:30px; font-weight:bold;">← ホームに戻る</a>
            <a href="news.html" style="display:inline-block; padding: 10px 30px; background:var(--main-yellow); color:white; border-radius:30px; font-weight:bold;">一覧を見る</a>
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
        
        const date = toBr(cols[3]?.trim() || '');
        const place = toBr(cols[4]?.trim() || '');
        const script = toBr(cols[5]?.trim() || '');
        const img1 = formatImg(cols[6]);
        const img2 = formatImg(cols[7]);
        const reserveUrl = cols[8]?.trim() || '';
        const castText = toBr(cols[9]?.trim() || '');
        const staffText = toBr(cols[10]?.trim() || '');
        const price = toBr(cols[11]?.trim() || '');
        
        let imgHtml = '';
        if (img1 || img2) {
            imgHtml = `
            <div class="stage-image-container" style="margin-bottom: 25px;">
                ${img1 ? `<img src="${img1}" onclick="openModal(this.src)">` : ''}
                ${img2 ? `<img src="${img2}" onclick="openModal(this.src)">` : ''}
            </div>`;
        }
        
        let infoHtml = '';
        if (date) infoHtml += `<div style="margin-bottom: 8px;"><b>日時：</b>${date}</div>`;
        if (place) infoHtml += `<div style="margin-bottom: 8px;"><b>会場：</b>${place}</div>`;
        if (script) infoHtml += `<div style="margin-bottom: 8px;"><b>脚本：</b>${script}</div>`;
        if (price) infoHtml += `<div style="margin-bottom: 8px;"><b>料金：</b>${price}</div>`;
        
        if (reserveUrl && reserveUrl.startsWith('http')) {
            infoHtml += `<div style="margin-bottom: 8px;"><b>予約：</b><a href="${reserveUrl}" target="_blank" style="color: var(--main-yellow); font-weight: 800; text-decoration: underline;">こちらから</a></div>`;
        }
        
        let contentHtml = '';
        if (infoHtml) {
            contentHtml += `<div style="font-size: 1.05rem; line-height: 1.8;">${infoHtml}</div>`;
        }
        
        if (castText || staffText) {
            if (infoHtml) {
                contentHtml += `<hr style="border: 0; border-top: 1px solid #ddd; margin: 25px 0;">`;
            }
            if (castText) {
                contentHtml += `<div style="margin-bottom: 25px; line-height: 1.8;"><b style="font-size: 1.1rem; color: var(--main-blue); display: block; margin-bottom: 8px;">役者：</b><div style="padding-left: 2px;">${castText}</div></div>`;
            }
            if (staffText) {
                contentHtml += `<div style="margin-bottom: 0; line-height: 1.8;"><b style="font-size: 1.1rem; color: var(--main-blue); display: block; margin-bottom: 8px;">スタッフ：</b><div style="padding-left: 2px;">${staffText}</div></div>`;
            }
        }
        
        if (titleText || imgHtml || contentHtml) {
            container.innerHTML = `
                <h2 style="color:var(--hero-blue); font-size: 1.8rem; line-height: 1.4; margin-bottom: 5px;">${groupName}${titleText ? `<br class="sp-only">${titleText}` : ''}</h2>
                <div style="background:#f9f9f9; padding:35px 30px; border-radius:10px; margin-top:20px; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                    ${imgHtml}
                    ${contentHtml}
                </div>`;
            setupModal();
        } else {
            container.innerHTML = '<p style="text-align:center; padding: 60px 0; font-size:1.2rem; color:#999; font-weight:bold;">COMING SOON...</p>';
        }
    } else { 
        container.innerHTML = '<p style="text-align:center; padding: 60px 0; font-size:1.2rem; color:#999; font-weight:bold;">COMING SOON...</p>'; 
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
        html += `<div style="margin-bottom:50px; border-bottom:1px solid #ddd; padding-bottom:30px;">
            <h3 style="color:var(--main-blue)">${cols[1]}『${cols[2]}』</h3><p>${cols[3]} @${cols[4]}</p>
            <div style="display:flex; gap:10px; overflow-x:auto; margin-top:10px;">
                ${img1 ? `<img src="${img1}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:150px; cursor:zoom-in;">` : ''}
                ${img2 ? `<img src="${img2}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:150px; cursor:zoom-in;">` : ''}
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
    Object.keys(groups).sort().forEach(term => {
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
        const detail = toBr(cols[4] || '');
        const img1 = formatImg(cols[5]);
        const img2 = formatImg(cols[6]);
        const link = cols[7];
        html += `<div style="padding:20px; border-left:5px solid var(--main-yellow); background:#f9f9f9; margin-bottom:20px;">
            <h3 style="margin:0 0 5px 0; color:var(--text-black);">${title}</h3>
            <small style="color:#666; display:block; margin-bottom:10px;">${date}</small>
            <div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:10px;">
                ${img1 ? `<img src="${img1}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:120px; cursor:zoom-in; border-radius:4px;">` : ''}
                ${img2 ? `<img src="${img2}" loading="lazy" class="zoomable-image" onclick="openModal(this.src)" style="height:120px; cursor:zoom-in; border-radius:4px;">` : ''}
            </div>
            ${place ? `<p style="margin:0 0 10px 0; font-weight:800; color:#555;">会場：${place}</p>` : ''}
            <p style="margin-bottom:15px; line-height:1.7;">${detail}</p>
            ${link && link.trim() !== '#' && link.trim() !== '' ? `<a href="${link}" target="_blank" style="color:var(--main-yellow); font-weight:800;">詳細へ →</a>` : ''}
        </div>`;
    });
    container.innerHTML = html || '<p style="text-align:center; padding: 40px 0; color:#666; font-size:1rem;">現在、外部参加情報はありません。</p>';
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
    const topBtn = document.getElementById('page-top-btn');
    if(topBtn) {
        window.addEventListener('scroll', () => { if (window.scrollY > 300) { topBtn.classList.add('show'); } else { topBtn.classList.remove('show'); } });
        topBtn.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
});
