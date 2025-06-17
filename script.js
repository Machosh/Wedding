// Google Apps Script 배포 URL을 여기에 입력하세요
const GET_URL = window.GAS_URL || 'https://script.google.com/macros/s/AKfycbyznoyN9PICbcIpkiV1QCe8g_B6-lSjuu72O9707wBlWAdGsqNhcUY82KED8004T6do/exec';
const POST_URL = GET_URL;

const form = document.getElementById('funding-form');
const itemsContainer = document.getElementById('items-container');
const statusEl = document.getElementById('status');

let fundingData = [];

const ITEMS_SHEET = 'item';
const HISTORY_SHEET = 'history';

function doGet() {
  try {
    const data = getFundingData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(HISTORY_SHEET);
    
    // 펀딩 기록 추가
    sheet.appendRow([
      new Date(),
      data.name,
      data.item,
      data.amount
    ]);
    
    // 현재 상태 업데이트
    updateFundingStatus(data.item, data.amount);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

function getFundingData() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ITEMS_SHEET);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const items = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // 빈 행 건너뛰기
      
      const goal = row[2] === '-' ? '-' : Number(row[2]) || 0;
      const funded = Number(row[3]) || 0;
      const remaining = goal === '-' ? '-' : (Number(goal) - funded);
      
      const item = {
        name: row[0],        // 상품명
        description: row[1], // 부가설명
        goal: goal,         // 목표액수
        funded: funded,     // 현재모금액
        remaining: remaining,
        complete: goal !== '-' && funded >= Number(goal)
      };
      items.push(item);
    }
    
    return items;
  } catch (error) {
    console.error('Error in getFundingData:', error);
    throw error;
  }
}

function updateFundingStatus(itemName, amount) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ITEMS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemName) {
        const currentFunded = Number(data[i][3]) || 0;
        sheet.getRange(i + 1, 4).setValue(currentFunded + Number(amount));
        break;
      }
    }
  } catch (error) {
    console.error('Error in updateFundingStatus:', error);
    throw error;
  }
}

// 계좌번호 복사 함수
function copyAccountNumber(accountNumber) {
  const accountElement = event.target;
  const originalText = accountElement.textContent;
  const originalBackground = accountElement.style.background;
  const originalColor = accountElement.style.color;
  
  navigator.clipboard.writeText(accountNumber).then(() => {
    accountElement.textContent = '복사됨!';
    accountElement.style.background = '#4CAF50';
    accountElement.style.color = '#fff';
    
    setTimeout(() => {
      accountElement.textContent = originalText;
      accountElement.style.background = originalBackground;
      accountElement.style.color = originalColor;
    }, 2000);
  }).catch(err => {
    console.error('계좌번호 복사 실패:', err);
    alert('계좌번호 복사에 실패했습니다. 직접 복사해주세요.');
  });
}

async function loadStatus() {
  try {
    statusEl.textContent = '⏳ 데이터를 불러오는 중...';
    const res = await fetch(GET_URL);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received');
    }
    
    console.log('Received data:', data); // 데이터 확인용 로그
    
    fundingData = data;
    renderItems(data);
    statusEl.textContent = '';
  } catch (err) {
    console.error('데이터 로딩 실패:', err);
    statusEl.textContent = `❌ 데이터를 불러오는데 실패했습니다: ${err.message}`;
  }
}

function renderItems(data) {
  try {
    itemsContainer.innerHTML = '';
    data.forEach(item => {
      if (!item.name) return;
      
      const div = document.createElement('div');
      div.className = 'item-card' + (item.complete ? ' disabled' : '');
      const progress = item.goal === '-' ? 0 : ((Number(item.funded) || 0) / (Number(item.goal) || 1)) * 100;
      
      div.innerHTML = `
        <div class="item-header">
          <h3>${item.name}</h3>
          ${item.description ? `<div class="item-description">(${item.description})</div>` : ''}
          <div class="item-status ${item.complete ? 'complete' : ''}">
            ${item.complete ? '🎉 목표 달성!' : '진행중'}
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${progress}%"></div>
        </div>
        <div class="item-details">
          <div class="detail-row">
            <span class="label">목표 금액:</span>
            <span class="value">${item.goal === '-' ? '-' : Number(item.goal).toLocaleString() + '만원'}</span>
          </div>
          <div class="detail-row">
            <span class="label">현재 모금액:</span>
            <span class="value">${Number(item.funded).toLocaleString()}만원</span>
          </div>
          <div class="detail-row">
            <span class="label">남은 금액:</span>
            <span class="value">${item.goal === '-' ? '-' : Number(item.remaining).toLocaleString() + '만원'}</span>
          </div>
        </div>
        <label class="select-item">
          <input type="radio" name="item" value="${item.name}" ${item.complete ? 'disabled' : ''} required>
          <span class="radio-label">이 항목 펀딩하기</span>
        </label>
      `;
      itemsContainer.appendChild(div);
    });
  } catch (err) {
    console.error('Items 렌더링 실패:', err);
    itemsContainer.innerHTML = '<div class="error">항목을 표시하는데 실패했습니다.</div>';
  }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = {
    name: fd.get('name'),
    item: fd.get('item'),
    amount: parseInt(fd.get('amount'))
  };

  try {
    statusEl.textContent = '⏳ 처리중...';
    const response = await fetch(POST_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    
    statusEl.textContent = '✅ 펀딩이 성공적으로 접수되었습니다!';
    form.reset();
    await loadStatus();
  } catch (err) {
    console.error('펀딩 실패:', err);
    statusEl.textContent = `❌ 에러가 발생했습니다: ${err.message}`;
  }
});

// 30초마다 상태 업데이트
loadStatus();
setInterval(loadStatus, 30000);
