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

// 改行や既存の <br> を綺麗にHTMLの改行に変換する関数
function convertNewlines(text) {
    if (!text) return '';
    if (text.includes('<br>')) {
        return text;
    }
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

        const liStyle = 'padding: 15px 0; border-bottom: 1px solid #eee;';
        const dateStyle = 'color: #666; font-size: 0.9rem; margin-right: 15px; font-weight: bold;';
        const tagStyle = 'background: #f2b842; color: white; padding: 3px 10px; border-radius: 3px; font-size: 0.8rem; margin-right: 15px; font-weight: bold; display: inline-block;';
        const titleStyle = 'color: #333; font-weight: bold; font-size: 1.05rem; text-decoration: none;';

        if (linkUrl) {
            html += `
            <li style="${liStyle}">
                <a href="${linkUrl}" style="text-decoration: none; display: flex; flex-wrap: wrap; align-items: center;" ${linkUrl.startsWith('http') ? 'target="_blank"' : ''}>
                    <div style="margin-bottom: 5px;"><span style="${dateStyle}">${date}</span><span style="${tagStyle}">${tag}</span></div>
                    <span style="${titleStyle}">${title}</span>
                </a>
            </li>`;
        } else {
            html += `
            <li style="${liStyle}">
                <div style="display: flex; flex-wrap: wrap; align-items: center;">
                    <div style="margin-bottom: 5px;"><span style="${dateStyle}">${date}</span><span style="${tagStyle}">${tag}</span></div>
                    <span style="${titleStyle}">${title}</span>
                </div>
            </li>`;
        }
    });
    target.innerHTML = `<ul style="list-style: none; padding: 0; margin: 0;">${html || '<li style="padding: 20px; text-align: center; color: #999;">現在、お知らせはありません。</li>'}</ul>`;
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
    const content = convertNewlines(cols[4] || '');
    const imgUrl = formatImg(cols[5]);

    let imgHtml = '';
    if (imgUrl) {
        imgHtml = `<div style="text-align: center; margin: 30px 0;"><img src="${imgUrl}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" alt=""></div>`;
    }

    container.innerHTML = `
        <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 3px solid #f2b842;">
            <div style="margin-bottom: 12px;">
                <span style="background: #f2b842; color: white; font-weight: bold; padding: 5px 12px; border-radius: 3px; font-size: 0.9rem;">${tag}</span>
                <span style="margin-left: 15px; color: #666; font-weight: bold;">${date}</span>
            </div>
            <h1 style="font-size: 1.8rem; color: #333; line-height: 1.4; margin: 0;">${title}</h1>
        </div>
        ${imgHtml}
        <div style="font-size: 1.1rem; line-height: 2.0; color: #444; padding: 10px 0;">${content}</div>
        <div style="text-align: center; margin-top: 60px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
            <a href="index.html" style="display: inline-block; padding: 12px 30px; background: #004098; color: white; text-decoration: none; border-radius: 30px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">← ホームに戻る</a>
            <a href="news.html" style="display: inline-block; padding: 12px 30px; background: #f2b842; color: white; text-decoration: none; border-radius: 30px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">一覧を見る</a>
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
        
        const date = convertNewlines(cols[3]?.trim() || '');
        const place = convertNewlines(cols[4]?.trim() || '');
        const script = convertNewlines(cols[5]?.trim() || '');
        const img1 = formatImg(cols[6]);
        const img2 = formatImg(cols[7]);
        const reserveUrl = cols[8]?.trim() || '';
        const castText = convertNewlines(cols[9]?.trim() || '');
        const staffText = convertNewlines(cols[10]?.trim() || '');
        const price = convertNewlines(cols[11]?.trim() || '');
        
        let imgHtml = '';
        if (img1 || img2) {
            imgHtml = `
            <div style="display: flex; gap: 15px; margin-bottom: 30px; justify-content: center; flex-wrap: wrap;">
                ${img1 ? `<img src="${img1}" style="max-width: 100%; height: auto; max-height: 400px; border-radius: 8px; cursor: zoom-in; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onclick="openModal(this.src)">` : ''}
                ${img2 ? `<img src="${img2}" style="max-width: 100%; height: auto; max-height: 400px; border-radius: 8px; cursor: zoom-in; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onclick="openModal(this.src)">` : ''}
            </div>`;
        }
        
        let infoHtml = '';
        if (date) infoHtml += `<div style="margin-bottom: 12px; display: flex;"><b style="min-width: 60px;">日時：</b><div>${date}</div></div>`;
        if (place) infoHtml += `<div style="margin-bottom: 12px; display: flex;"><b style="min-width: 60px;">会場：</b><div>${place}</div></div>`;
        if (script) infoHtml += `<div style="margin-bottom: 12px; display: flex;"><b style="min-width: 60px;">脚本：</b><div>${script}</div></div>`;
        if (price) infoHtml += `<div style="margin-bottom: 12px; display: flex;"><b style="min-width: 60px;">料金：</b><div>${price}</div></div>`;
        
        if (reserveUrl && reserveUrl.startsWith('http')) {
            infoHtml += `<div style="margin-top: 25px;"><a href="${reserveUrl}" target="_blank" style="display: inline-block; padding: 12px 35px; background: #f2b842; color: #fff; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(242, 184, 66, 0.3);">チケット予約はこちら</a></div>`;
        }
        
        let contentHtml = '';
        if (infoHtml) {
            contentHtml += `<div style="font-size: 1.1rem; line-height: 1.8; color: #333; padding: 25px; background: #fff; border-radius: 8px; border: 1px solid #eee; margin-bottom: 30px;">${infoHtml}</div>`;
        }
        
        if (castText || staffText) {
            if (castText) {
                contentHtml += `<div style="margin-bottom: 30px; line-height: 1.8;"><b style="font-size: 1.2rem; color: #004098; display: block; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 15px;">役者</b><div style="padding: 0 10px;">${castText}</div></div>`;
            }
            if (staffText) {
                contentHtml += `<div style="margin-bottom: 30px; line-height: 1.8;"><b style="font-size: 1.2rem; color: #004098; display: block; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 15px;">スタッフ</b><div style="padding: 0 10px;">${staffText}</div></div>`;
            }
        }
        
        container.innerHTML = `
            <h2 style="color:#004098; font-size: 1.8rem; line-height: 1.4; margin-bottom: 25px; text-align: center;">${groupName}<br><span style="font-size: 2.2rem; color: #333;">${titleText}</span></h2>
            <div style="background:#fafafa; padding:40px 20px; border-radius:12px; margin-top:20px;">
                ${imgHtml}
                ${contentHtml}
            </div>`;
        setupModal();
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
        html += `<div style="margin-bottom: 40px; border-bottom: 1px solid #ddd; padding-bottom: 30px;">
            <h3 style="color: #004098; font-size: 1.4rem; margin: 0 0 10px 0;">${cols[1]}『${cols[2]}』</h3>
            <p style="color: #555; font-weight: bold; margin: 0 0 20px 0;">${cols[3]} @${cols[4]}</p>
            <div style="display: flex; gap: 15px; overflow-x: auto;">
                ${img1 ? `<img src="${img1}" loading="lazy" onclick="openModal(this.src)" style="height: 180px; border-radius: 6px; cursor: zoom-in; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">` : ''}
                ${img2 ? `<img src="${img2}" loading="lazy" onclick="openModal(this.src)" style="height: 180px; border-radius: 6px; cursor: zoom-in; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">` : ''}
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
        html += `<div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
            <button onclick="toggleAccordion(this)" style="width: 100%; text-align: left; background: #fafafa; padding: 18px 20px; border: none; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #333;">${term} <span class="icon" style="color: #004098; font-size: 1.5rem; line-height: 1;">+</span></button>
            <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease; background: #fff;">
                <ul style="list-style: none; padding: 20px; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;">
                    ${groups[term].map(m => `<li><b style="color: #004098; font-size: 1.1rem;">${m.name}</b><br><small style="color: #666; font-weight: bold;">${m.role}</small></li>`).join('')}
                </ul>
            </div>
        </div>`;
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
        const detail = convertNewlines(cols[4] || '');
        const img1 = formatImg(cols[5]);
        const img2 = formatImg(cols[6]);
        const link = cols[7];
        html += `<div style="padding: 30px; border-left: 6px solid #f2b842; background: #fff; margin-bottom: 30px; border-radius: 0 8px 8px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.05);">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 1.4rem;">${title}</h3>
            <span style="color: #666; display: block; margin-bottom: 20px; font-weight: bold; background: #f4f4f4; padding: 5px 12px; border-radius: 4px; display: inline-block;">${date}</span>
            <div style="display: flex; gap: 15px; overflow-x: auto; margin-bottom: 20px;">
                ${img1 ? `<img src="${img1}" loading="lazy" onclick="openModal(this.src)" style="height: 140px; border-radius: 6px; cursor: zoom-in;">` : ''}
                ${img2 ? `<img src="${img2}" loading="lazy" onclick="openModal(this.src)" style="height: 140px; border-radius: 6px; cursor: zoom-in;">` : ''}
            </div>
            ${place ? `<p style="margin: 0 0 15px 0; font-weight: bold; color: #004098;">📍 会場：${place}</p>` : ''}
            <div style="margin-bottom: 25px; line-height: 1.9; color: #444;">${detail}</div>
            ${link && link.trim() !== '#' && link.trim() !== '' ? `<a href="${link}" target="_blank" style="display: inline-block; padding: 10px 25px; background: #f2b842; color: #fff; text-decoration: none; border-radius: 30px; font-weight: bold; box-shadow: 0 3px 6px rgba(242, 184, 66, 0.3);">詳細を見る →</a>` : ''}
        </div>`;
    });
    container.innerHTML = html || '<p style="text-align:center; padding: 50px 0; color:#999; font-weight:bold;">現在、外部参加情報はありません。</p>';
}

function setupModal() {
    if (document.getElementById('js-image-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="js-image-modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.85); display:none; justify-content:center; align-items:center; cursor:zoom-out;" onclick="this.style.display='none'"><img id="js-modal-image" style="max-width:90%; max-height:90%; border-radius:8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"></div>`);
}
window.openModal = function(src) {
    const modal = document.getElementById('js-image-modal');
    const img = document.getElementById('js-modal-image');
    if(modal && img) { 
        img.src = src; 
        modal.style.display = 'flex'; 
    }
};
window.toggleAccordion = function(el) {
    const content = el.nextElementSibling;
    const icon = el.querySelector('.icon');
    if (content.style.maxHeight && content.style.maxHeight !== '0px') { 
        content.style.maxHeight = '0px'; 
        if(icon) icon.innerText = '+'; 
    } else { 
        content.style.maxHeight = content.scrollHeight + "px"; 
        if(icon) icon.innerText = '-'; 
    }
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
