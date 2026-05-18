/**
 * 校园拼单助理 - 主逻辑文件
 * Campus Group-Buy Assistant
 */

// ==================== 配置常量 ====================
const CONFIG = {
    STORAGE_KEY: 'campus_groupbuys',
    USER_KEY: 'campus_user_data',
    API_BASE: window.location.origin + '/api',  // 使用相对路径，自动适配部署环境
    USE_API: false,  // 是否使用后端 API，设为 false 则使用本地存储
    CATEGORY_MAP: {
        'food': { 
            name: '外卖', 
            icon: '🍔', 
            api: '美食',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop'
        },
        'drink': { 
            name: '奶茶', 
            icon: '🧋', 
            api: '美食',
            image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=300&fit=crop'
        },
        'supermarket': { 
            name: '超市', 
            icon: '🛒', 
            api: '日用品',
            image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop'
        },
        'other': { 
            name: '其他', 
            icon: '📦', 
            api: '其他',
            image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop'
        }
    },
    DEFAULT_IMAGE: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
    CAMPUS_MAP: {
        // 南区
        'south-1-3': '南区1-3栋',
        'south-4-6': '南区4-6栋',
        'south-7-9': '南区7-9栋',
        'south-10-12': '南区10-12栋',
        'south-13-14': '南区13-14栋',
        // 北区
        'north-17-21': '北区17-21栋',
        'north-24-28': '北区24-28栋',
        'north-29': '北区29栋',
        'north-zhuanjia': '北区专家楼'
    },
    AREA_MAP: {
        'south': '南区',
        'north': '北区'
    },
    CAMPUS_COORDS: {
        // 示例坐标（实际使用时需要根据真实校园调整）
        'south-1-3': { lat: 39.97, lng: 116.31 },
        'south-4-6': { lat: 39.97, lng: 116.32 },
        'south-7-9': { lat: 39.97, lng: 116.33 },
        'south-10-12': { lat: 39.96, lng: 116.31 },
        'south-13-14': { lat: 39.96, lng: 116.32 },
        'north-17-21': { lat: 40.00, lng: 116.31 },
        'north-24-28': { lat: 40.00, lng: 116.32 },
        'north-29': { lat: 40.01, lng: 116.31 },
        'north-zhuanjia': { lat: 40.01, lng: 116.33 }
    }
};

// ==================== 工具函数 ====================

/**
 * 生成唯一ID
 */
function generateId() {
    return 'GB_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 生成浏览器指纹ID
 */
function getBrowserId() {
    let browserId = localStorage.getItem('browser_id');
    if (!browserId) {
        browserId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('browser_id', browserId);
    }
    return browserId;
}

/**
 * 格式化金额（保留两位小数）
 */
function formatPrice(price) {
    return parseFloat(price).toFixed(2);
}

/**
 * 格式化时间
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 计算倒计时
 */
function getCountdown(endTime) {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) {
        return { text: '已结束', isUrgent: false, isEnded: true };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
        return { 
            text: `剩余 ${hours}小时${minutes}分`, 
            isUrgent: false, 
            isEnded: false 
        };
    } else if (minutes > 0) {
        return { 
            text: `剩余 ${minutes}分${seconds}秒`, 
            isUrgent: true, 
            isEnded: false 
        };
    } else {
        return { 
            text: `剩余 ${seconds}秒`, 
            isUrgent: true, 
            isEnded: false 
        };
    }
}

/**
 * 计算AA费用
 */
function calculateAA(totalAmount, participantCount) {
    if (!totalAmount || !participantCount || participantCount === 0) {
        return 0;
    }
    return formatPrice(totalAmount / participantCount);
}

/**
 * 显示Toast提示
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    
    toast.className = 'toast';
    if (type === 'success') toast.classList.add('success');
    if (type === 'error') toast.classList.add('error');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        return result;
    }
}

// ==================== API 调用 ====================

/**
 * 调用后端 API
 */
async function apiCall(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'x-user-id': getBrowserId()
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });
        const data = await response.json();
        
        if (data.code !== 0 && data.code !== undefined) {
            throw new Error(data.message || '请求失败');
        }
        
        return data;
    } catch (error) {
        console.error('API 调用失败:', error);
        throw error;
    }
}

/**
 * 从后端获取拼单列表
 */
async function fetchGroupBuysFromAPI(campus, category) {
    const params = new URLSearchParams();
    if (campus && campus !== 'all') params.append('campus', campus);
    if (category && category !== 'all') {
        // 转换分类名称
        const catMap = { 'food': '美食', 'drink': '美食', 'supermarket': '日用品', 'other': '其他' };
        params.append('category', catMap[category] || category);
    }
    const query = params.toString() ? '?' + params.toString() : '';
    const result = await apiCall('/groupbuys' + query);
    return result.data?.list || [];
}

/**
 * 创建拼单到后端
 */
async function createGroupBuyToAPI(groupBuy) {
    // 转换分类名称
    const catMap = { 'food': '美食', 'drink': '美食', 'supermarket': '日用品', 'other': '其他' };
    const apiData = {
        ...groupBuy,
        category: catMap[groupBuy.category] || groupBuy.category
    };
    const result = await apiCall('/groupbuys', {
        method: 'POST',
        body: JSON.stringify(apiData)
    });
    return result.data;
}

/**
 * 参与拼单
 */
async function joinGroupBuyToAPI(groupBuyId) {
    const result = await apiCall(`/groupbuys/${groupBuyId}/join`, {
        method: 'POST'
    });
    return result.data;
}

// ==================== 数据管理 ====================

/**
 * 获取所有拼单
 */
function getGroupBuys() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('获取拼单数据失败:', e);
        return [];
    }
}

/**
 * 保存拼单列表
 */
function saveGroupBuys(groupBuys) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(groupBuys));
        return true;
    } catch (e) {
        console.error('保存拼单数据失败:', e);
        showToast('存储空间不足，请清理后重试', 'error');
        return false;
    }
}

/**
 * 添加新拼单
 */
function addGroupBuy(groupBuy) {
    const groupBuys = getGroupBuys();
    groupBuys.unshift(groupBuy);
    return saveGroupBuys(groupBuys);
}

/**
 * 更新拼单状态
 */
function updateGroupBuyStatus(groupBuyId, status) {
    const groupBuys = getGroupBuys();
    const index = groupBuys.findIndex(gb => gb.id === groupBuyId);
    if (index !== -1) {
        groupBuys[index].status = status;
        saveGroupBuys(groupBuys);
    }
}

/**
 * 获取用户数据
 */
function getUserData() {
    try {
        const data = localStorage.getItem(CONFIG.USER_KEY);
        return data ? JSON.parse(data) : {
            browserId: getBrowserId(),
            history: [],
            preferences: {
                defaultCampus: null
            }
        };
    } catch (e) {
        return {
            browserId: getBrowserId(),
            history: [],
            preferences: {}
        };
    }
}

/**
 * 更新用户历史
 */
function updateUserHistory(campus, category) {
    const userData = getUserData();
    const existingIndex = userData.history.findIndex(
        h => h.campus === campus && h.category === category
    );
    
    if (existingIndex !== -1) {
        userData.history[existingIndex].count = 
            (userData.history[existingIndex].count || 1) + 1;
    } else {
        userData.history.push({ campus, category, count: 1 });
    }
    
    // 限制历史记录数量
    if (userData.history.length > 50) {
        userData.history = userData.history.slice(-50);
    }
    
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(userData));
}

/**
 * 检查并更新过期拼单
 */
function checkExpiredGroupBuys() {
    const groupBuys = getGroupBuys();
    const now = new Date();
    let updated = false;
    
    groupBuys.forEach(gb => {
        if (gb.status === 'active' && new Date(gb.deadline) <= now) {
            gb.status = 'ended';
            updated = true;
        }
    });
    
    if (updated) {
        saveGroupBuys(groupBuys);
    }
}

// ==================== UI渲染 ====================

/**
 * 获取拼单图片
 */
function getGroupBuyImage(groupBuy) {
    if (groupBuy.image) return groupBuy.image;
    const categoryInfo = CONFIG.CATEGORY_MAP[groupBuy.category];
    return categoryInfo?.image || CONFIG.DEFAULT_IMAGE;
}

/**
 * 渲染拼单卡片（图片背景风格）
 */
function renderGroupBuyCard(groupBuy, index) {
    const categoryInfo = CONFIG.CATEGORY_MAP[groupBuy.category] || CONFIG.CATEGORY_MAP['other'];
    const campusName = CONFIG.CAMPUS_MAP[groupBuy.campus] || groupBuy.campus;
    const perPerson = calculateAA(groupBuy.totalAmount, groupBuy.currentCount);
    const progress = (groupBuy.currentCount / groupBuy.targetCount) * 100;
    const countdown = getCountdown(groupBuy.deadline);
    const isEnded = groupBuy.status === 'ended' || countdown.isEnded;
    const imageUrl = getGroupBuyImage(groupBuy);
    
    const card = document.createElement('div');
    card.className = `groupbuy-card card-animation-delay-${(index % 5) + 1}${isEnded ? ' ended' : ''}`;
    card.dataset.id = groupBuy.id;
    
    card.innerHTML = `
        <div class="card-image" style="background-image: url('${imageUrl}')">
            <div class="card-overlay"></div>
            <div class="card-badges">
                <span class="category-badge">${categoryInfo.icon} ${categoryInfo.name}</span>
                ${isEnded ? '<span class="status-badge ended">已结束</span>' : ''}
            </div>
        </div>
        <div class="card-content">
            <div class="card-merchant">
                <span class="merchant-name">${escapeHtml(groupBuy.merchant)}</span>
                <span class="campus-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${campusName}
                </span>
            </div>
            <p class="card-description">${escapeHtml(groupBuy.description)}</p>
            <div class="card-footer">
                <div class="price-section">
                    <span class="price-current">¥${perPerson}</span>
                    <span class="price-label">/人</span>
                </div>
                <div class="progress-section">
                    <div class="progress-bar-container">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <span class="progress-text">${groupBuy.currentCount}/${groupBuy.targetCount}人</span>
                </div>
                <div class="deadline-section ${countdown.isUrgent ? 'urgent' : ''}" id="countdown-${groupBuy.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${countdown.text}</span>
                </div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openDetailModal(groupBuy.id));
    
    return card;
}

/**
 * 渲染推荐卡片（图片背景风格）
 */
function renderRecommendationCard(groupBuy, index) {
    const campusName = CONFIG.CAMPUS_MAP[groupBuy.campus] || groupBuy.campus;
    const perPerson = calculateAA(groupBuy.totalAmount, groupBuy.currentCount);
    
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.dataset.id = groupBuy.id;
    
    // 本地图片路径
    const localImages = ['images/rec1.png', 'images/rec2.png', 'images/rec3.png', 'images/rec4.png'];
    const bgImage = localImages[index % localImages.length];
    
    card.innerHTML = `
        <div class="rec-image" style="background-image: url('${bgImage}')">
            <div class="rec-overlay"></div>
            <div class="rec-content">
                <div class="rec-merchant">${escapeHtml(groupBuy.merchant)}</div>
                <div class="rec-description">${escapeHtml(groupBuy.description)}</div>
            </div>
        </div>
        <div class="rec-bottom">
            <div class="rec-footer">
                <span class="rec-price">¥${perPerson}/人</span>
                <span class="rec-campus">${campusName}</span>
            </div>
            <div class="rec-deadline" id="rec-countdown-${groupBuy.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>${getCountdown(groupBuy.deadline).text}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openDetailModal(groupBuy.id));
    
    return card;
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 渲染拼单列表
 */
async function renderGroupBuyList() {
    const listContainer = document.getElementById('groupbuyList');
    const emptyState = document.getElementById('emptyState');
    const countBadge = document.getElementById('groupbuyCount');
    
    const campusFilter = document.querySelector('.filter-chip.active')?.dataset.campus || 'all';
    const categoryFilter = document.getElementById('categorySelect').value;
    
    let groupBuys = [];
    
    try {
        if (CONFIG.USE_API) {
            // 从后端获取数据
            groupBuys = await fetchGroupBuysFromAPI(campusFilter, categoryFilter);
        } else {
            // 从本地存储获取
            checkExpiredGroupBuys();
            groupBuys = getGroupBuys();
            
            // 应用筛选
            if (campusFilter !== 'all') {
                groupBuys = groupBuys.filter(gb => gb.campus === campusFilter);
            }
            if (categoryFilter !== 'all') {
                groupBuys = groupBuys.filter(gb => gb.category === categoryFilter);
            }
        }
    } catch (error) {
        console.error('获取拼单列表失败:', error);
        showToast('获取数据失败', 'error');
        // 降级到本地存储
        groupBuys = getGroupBuys();
    }
    
    // 按状态和截止时间排序
    groupBuys.sort((a, b) => {
        if (a.status === 'active' && b.status === 'ended') return -1;
        if (a.status === 'ended' && b.status === 'active') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    listContainer.innerHTML = '';
    
    if (groupBuys.length === 0) {
        emptyState.style.display = 'block';
        countBadge.textContent = '0个拼单';
    } else {
        emptyState.style.display = 'none';
        countBadge.textContent = `${groupBuys.length}个拼单`;
        
        groupBuys.forEach((gb, index) => {
            listContainer.appendChild(renderGroupBuyCard(gb, index));
        });
    }
}

/**
 * 渲染推荐列表
 */
function renderRecommendations() {
    const recommendationSection = document.getElementById('recommendationSection');
    const recommendationList = document.getElementById('recommendationList');
    const recommendationCount = document.getElementById('recommendationCount');
    
    const groupBuys = getGroupBuys().filter(gb => gb.status === 'active');
    
    if (groupBuys.length === 0) {
        recommendationSection.style.display = 'none';
        return;
    }
    
    // 始终显示4个推荐：优先使用匹配用户偏好的拼单，其次使用最新的活跃拼单
    let recommendations = [];
    
    // 获取用户数据
    const userData = getUserData();
    
    // 如果有历史偏好，优先匹配
    if (userData.history && userData.history.length > 0) {
        const topHistory = userData.history
            .sort((a, b) => (b.count || 1) - (a.count || 1))
            .slice(0, 3);
        
        topHistory.forEach(h => {
            const matches = groupBuys.filter(gb => 
                gb.campus === h.campus && gb.category === h.category
            );
            recommendations.push(...matches);
        });
    }
    
    // 如果推荐不够4个，补充最新的拼单
    if (recommendations.length < 4) {
        const seen = new Set(recommendations.map(r => r.id));
        const latestGroupBuys = groupBuys
            .filter(gb => !seen.has(gb.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const needed = 4 - recommendations.length;
        recommendations.push(...latestGroupBuys.slice(0, needed));
    }
    
    // 去重并限制为4个
    const seen = new Set();
    recommendations = recommendations.filter(rb => {
        if (seen.has(rb.id)) return false;
        seen.add(rb.id);
        return true;
    }).slice(0, 4);
    
    // 确保至少显示4个推荐（如果活跃拼单足够）
    if (recommendations.length < 4 && groupBuys.length >= 4) {
        const existingIds = new Set(recommendations.map(r => r.id));
        const additionalNeeded = 4 - recommendations.length;
        const additionalGroupBuys = groupBuys
            .filter(gb => !existingIds.has(gb.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, additionalNeeded);
        recommendations.push(...additionalGroupBuys);
    }
    
    // 始终显示推荐区域
    if (recommendations.length > 0) {
        recommendationSection.style.display = 'block';
        recommendationCount.textContent = `${recommendations.length}个推荐`;
        recommendationList.innerHTML = '';
        recommendations.forEach((rb, index) => {
            recommendationList.appendChild(renderRecommendationCard(rb, index));
        });
    } else {
        recommendationSection.style.display = 'none';
    }
}

/**
 * 渲染拼单详情
 */
async function renderDetailContent(groupBuyId) {
    const detailContent = document.getElementById('detailContent');
    const detailModal = document.getElementById('detailModal');
    detailContent.innerHTML = '<p>加载中...</p>';
    
    let groupBuy = null;
    
    try {
        if (CONFIG.USE_API) {
            // 从后端获取详情
            const result = await apiCall(`/groupbuys/${groupBuyId}`);
            groupBuy = result.data;
        } else {
            groupBuy = getGroupBuys().find(gb => gb.id === groupBuyId);
        }
    } catch (error) {
        // 降级到本地存储
        groupBuy = getGroupBuys().find(gb => gb.id === groupBuyId);
    }
    
    if (!groupBuy) {
        detailContent.innerHTML = '<p>拼单不存在或已删除</p>';
        return;
    }
    
    const categoryInfo = CONFIG.CATEGORY_MAP[groupBuy.category] || CONFIG.CATEGORY_MAP['other'];
    const campusName = CONFIG.CAMPUS_MAP[groupBuy.campus] || groupBuy.campus;
    const perPerson = calculateAA(groupBuy.totalAmount, groupBuy.currentCount);
    const progress = (groupBuy.currentCount / groupBuy.targetCount) * 100;
    const countdown = getCountdown(groupBuy.deadline);
    const isEnded = groupBuy.status === 'ended' || countdown.isEnded;
    const imageUrl = getGroupBuyImage(groupBuy);
    
    // 设置详情模态框背景图片
    detailModal.style.setProperty('--detail-bg-image', `url('${imageUrl}')`);
    
    // 更新用户历史
    updateUserHistory(groupBuy.campus, groupBuy.category);
    
    detailContent.innerHTML = `
        <div class="detail-header">
            <div class="detail-merchant">${escapeHtml(groupBuy.merchant)}</div>
            <span class="detail-category">${categoryInfo.icon} ${categoryInfo.name}</span>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">商品描述</div>
            <div class="detail-description">${escapeHtml(groupBuy.description)}</div>
        </div>
        
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-item-label">总金额</div>
                <div class="detail-item-value highlight">¥${formatPrice(groupBuy.totalAmount)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">人均费用</div>
                <div class="detail-item-value success">¥${perPerson}</div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">校区位置</div>
                <div class="detail-item-value">${campusName}</div>
            </div>
            ${groupBuy.dormitory ? `
            <div class="detail-item">
                <div class="detail-item-label">宿舍楼</div>
                <div class="detail-item-value">${escapeHtml(groupBuy.dormitory)}</div>
            </div>
            ` : ''}
        </div>
        
        <div class="progress-section">
            <div class="progress-header">
                <span class="progress-label">参与进度</span>
                <span class="progress-value">${groupBuy.currentCount} / ${groupBuy.targetCount} 人</span>
            </div>
            <div class="detail-progress-bar">
                <div class="detail-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
        </div>
        
        <div class="deadline-section">
            <div class="deadline-label">截止时间</div>
            <div class="deadline-value">${formatDateTime(groupBuy.deadline)}</div>
            <div class="deadline-countdown ${countdown.isEnded ? 'ended' : ''}" id="detailCountdown">
                ${countdown.text}
            </div>
        </div>
        
        <div class="join-section">
            <div class="wechat-display">
                <div class="wechat-label">发起人微信号</div>
                <div class="wechat-value" id="detailWechatId">${escapeHtml(groupBuy.wechatId)}</div>
            </div>
            <button class="btn btn-join ${isEnded ? 'btn-secondary' : 'btn-success'}" 
                    id="joinBtn" 
                    ${isEnded ? 'disabled' : ''}
                    data-wechat="${escapeHtml(groupBuy.wechatId)}">
                ${isEnded ? '拼单已结束' : '📋 复制微信号联系发起人'}
            </button>
        </div>
    `;
    
    // 绑定加入按钮事件
    const joinBtn = document.getElementById('joinBtn');
    if (joinBtn && !isEnded) {
        joinBtn.addEventListener('click', async () => {
            const wechatId = joinBtn.dataset.wechat;
            const success = await copyToClipboard(wechatId);
            if (success) {
                showToast('微信号已复制到剪贴板，快去联系发起人吧！', 'success');
            } else {
                showToast('复制失败，请长按微信号手动复制', 'error');
            }
        });
    }
    
    // 更新倒计时
    startDetailCountdown(groupBuy.deadline);
}

/**
 * 开始详情页倒计时
 */
function startDetailCountdown(deadline) {
    const countdownEl = document.getElementById('detailCountdown');
    if (!countdownEl) return;
    
    const update = () => {
        const countdown = getCountdown(deadline);
        countdownEl.textContent = countdown.text;
        countdownEl.className = `deadline-countdown ${countdown.isEnded ? 'ended' : ''}`;
        
        if (!countdown.isEnded) {
            requestAnimationFrame(() => {
                setTimeout(update, 1000);
            });
        }
    };
    
    update();
}

/**
 * 更新列表页所有卡片的倒计时
 */
function updateListCountdowns() {
    const groupBuys = getGroupBuys();
    const listContainer = document.getElementById('groupbuyList');
    if (!listContainer) return;
    
    groupBuys.forEach(gb => {
        const countdownEl = document.getElementById(`countdown-${gb.id}`);
        if (!countdownEl) return;
        
        const countdown = getCountdown(gb.deadline);
        const spanEl = countdownEl.querySelector('span');
        if (spanEl) {
            spanEl.textContent = countdown.text;
        }
        
        // 更新紧迫状态
        if (countdown.isUrgent) {
            countdownEl.classList.add('urgent');
        } else {
            countdownEl.classList.remove('urgent');
        }
        
        // 检查是否已结束，如果已结束则更新卡片状态
        if (countdown.isEnded && gb.status === 'active') {
            const card = listContainer.querySelector(`[data-id="${gb.id}"]`);
            if (card) {
                card.classList.add('ended');
                // 添加已结束标签
                const badges = card.querySelector('.card-badges');
                if (badges && !badges.querySelector('.status-badge.ended')) {
                    const endedBadge = document.createElement('span');
                    endedBadge.className = 'status-badge ended';
                    endedBadge.textContent = '已结束';
                    badges.appendChild(endedBadge);
                }
            }
        }
    });
    
    // 更新推荐区域的倒计时
    updateRecommendationCountdowns();
}

/**
 * 更新推荐区域的倒计时
 */
function updateRecommendationCountdowns() {
    const groupBuys = getGroupBuys();
    const recList = document.getElementById('recommendationList');
    if (!recList) return;
    
    groupBuys.forEach(gb => {
        const deadlineEl = document.getElementById(`rec-countdown-${gb.id}`);
        if (!deadlineEl) return;
        
        const countdown = getCountdown(gb.deadline);
        const spanEl = deadlineEl.querySelector('span');
        if (spanEl) {
            spanEl.textContent = countdown.text;
        }
    });
}

// ==================== 模态框管理 ====================

/**
 * 打开发布模态框
 */
function openPublishModal() {
    const modal = document.getElementById('publishModal');
    const form = document.getElementById('publishForm');
    
    // 设置默认截止时间（1小时后）
    const defaultDeadline = new Date();
    defaultDeadline.setHours(defaultDeadline.getHours() + 1);
    defaultDeadline.setMinutes(0);
    document.getElementById('deadline').value = defaultDeadline.toISOString().slice(0, 16);
    
    modal.classList.add('show');
    form.reset();
    document.getElementById('deadline').value = defaultDeadline.toISOString().slice(0, 16);
}

/**
 * 关闭发布模态框
 */
function closePublishModal() {
    const modal = document.getElementById('publishModal');
    modal.classList.remove('show');
}

/**
 * 打开详情模态框
 */
async function openDetailModal(groupBuyId) {
    const modal = document.getElementById('detailModal');
    modal.classList.add('show');
    await renderDetailContent(groupBuyId);
}

/**
 * 关闭详情模态框
 */
function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('show');
}

// ==================== 地理位置 ====================

/**
 * 获取用户位置
 */
function getUserLocation() {
    if (!navigator.geolocation) {
        showToast('您的浏览器不支持地理定位功能，请手动选择校区', 'error');
        return;
    }
    
    showToast('正在获取位置...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('获取到的坐标:', latitude, longitude);
            
            const campus = determineCampus(latitude, longitude);
            console.log('匹配的校区:', campus);
            
            const userData = getUserData();
            userData.preferences.defaultCampus = campus;
            userData.location = { lat: latitude, lng: longitude };
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(userData));
            
            showToast(`已定位到${CONFIG.CAMPUS_MAP[campus] || campus}`, 'success');
            
            // 更新筛选并高亮位置按钮
            const locationBtn = document.getElementById('locationBtn');
            locationBtn.classList.add('active');
            
            // 自动切换到对应校区
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.remove('active');
                if (chip.dataset.campus === campus) {
                    chip.classList.add('active');
                }
            });
            
            renderGroupBuyList();
            closeLocationModal();
        },
        (error) => {
            console.error('获取位置失败:', error);
            console.error('错误代码:', error.code);
            console.error('错误消息:', error.message);
            
            let errorMsg = '无法获取位置';
            switch(error.code) {
                case 1: // PERMISSION_DENIED
                    errorMsg = '请允许获取位置权限，或手动选择校区';
                    break;
                case 2: // POSITION_UNAVAILABLE
                    errorMsg = '无法获取当前位置，请手动选择校区';
                    break;
                case 3: // TIMEOUT
                    errorMsg = '获取位置超时，请手动选择校区';
                    break;
                default:
                    errorMsg = '获取位置失败，请手动选择校区';
            }
            showToast(errorMsg, 'error');
            closeLocationModal();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 600000
        }
    );
}

/**
 * 根据坐标判断校区
 */
function determineCampus(lat, lng) {
    let nearestCampus = 'south-1-3'; // 默认返回南区1-3栋
    let minDistance = Infinity;
    
    console.log('开始匹配校区，坐标:', lat, lng);
    console.log('可用校区坐标:', CONFIG.CAMPUS_COORDS);
    
    Object.entries(CONFIG.CAMPUS_COORDS).forEach(([campus, coords]) => {
        const distance = Math.sqrt(
            Math.pow(lat - coords.lat, 2) + 
            Math.pow(lng - coords.lng, 2)
        );
        console.log(`校区 ${campus} 距离: ${distance.toFixed(4)}`);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestCampus = campus;
        }
    });
    
    console.log('最近校区:', nearestCampus, '距离:', minDistance.toFixed(4));
    
    // 如果距离太远，返回默认校区
    if (minDistance > 0.1) { // 约10公里
        console.log('距离太远，使用默认校区');
        return 'south-1-3';
    }
    
    return nearestCampus;
}

/**
 * 打开位置提示模态框
 */
function openLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.classList.add('show');
}

/**
 * 关闭位置提示模态框
 */
function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.classList.remove('show');
}

// ==================== 表单处理 ====================

/**
 * 处理发布表单提交
 */
async function handlePublishSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submitPublish');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // 收集表单数据
    const formData = {
        merchant: form.merchant.value.trim(),
        description: form.description.value.trim(),
        totalAmount: parseFloat(form.totalAmount.value),
        targetCount: parseInt(form.targetCount.value),
        category: form.category.value,
        deadline: form.deadline.value,
        campus: form.dormitory.value,  // dormitory字段存储完整的宿舍区域ID
        dormitory: form.dormitory.options[form.dormitory.selectedIndex].text,  // 显示用文本
        wechatId: form.wechatId.value.trim(),
        image: form.groupBuyImage.value || null  // 商品图片
    };
    
    // 验证
    if (!validateForm(formData)) {
        return;
    }
    
    // 显示加载状态
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    try {
        const groupBuy = {
            id: generateId(),
            ...formData,
            currentCount: 1,
            creatorId: getBrowserId(),
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        if (CONFIG.USE_API) {
            // 使用后端 API
            await createGroupBuyToAPI(groupBuy);
        }
        
        // 同时保存到本地（备用）
        addGroupBuy(groupBuy);
        
        showToast('拼单发布成功！', 'success');
        closePublishModal();
        renderGroupBuyList();
        renderRecommendations();
        
        // 更新用户历史
        updateUserHistory(formData.campus, formData.category);
    } catch (error) {
        showToast('发布失败：' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

/**
 * 验证表单数据
 */
function validateForm(data) {
    // 商家名称
    if (!data.merchant) {
        showToast('请输入商家名称', 'error');
        highlightError('merchant');
        return false;
    }
    
    // 商品描述
    if (!data.description) {
        showToast('请输入商品描述', 'error');
        highlightError('description');
        return false;
    }
    
    // 总金额
    if (isNaN(data.totalAmount) || data.totalAmount <= 0) {
        showToast('请输入有效的金额', 'error');
        highlightError('totalAmount');
        return false;
    }
    
    // 目标人数
    if (isNaN(data.targetCount) || data.targetCount < 2 || data.targetCount > 20) {
        showToast('目标人数需在2-20之间', 'error');
        highlightError('targetCount');
        return false;
    }
    
    // 商品类型
    if (!data.category) {
        showToast('请选择商品类型', 'error');
        highlightError('category');
        return false;
    }
    
    // 截止时间
    if (!data.deadline || new Date(data.deadline) <= new Date()) {
        showToast('请选择有效的截止时间', 'error');
        highlightError('deadline');
        return false;
    }
    
    // 宿舍楼
    if (!data.campus) {
        showToast('请选择宿舍楼', 'error');
        highlightError('dormitory');
        return false;
    }
    
    // 微信号
    if (!data.wechatId) {
        showToast('请输入微信号', 'error');
        highlightError('wechatId');
        return false;
    }
    
    return true;
}

/**
 * 高亮错误字段
 */
function highlightError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        field.focus();
        setTimeout(() => {
            field.classList.remove('error');
        }, 3000);
    }
}

// ==================== 事件绑定 ====================

/**
 * 绑定所有事件
 */
function bindEvents() {
    // 发布按钮
    document.getElementById('publishBtn').addEventListener('click', openPublishModal);
    document.getElementById('closePublishModal').addEventListener('click', closePublishModal);
    document.getElementById('cancelPublish').addEventListener('click', closePublishModal);
    document.getElementById('publishForm').addEventListener('submit', handlePublishSubmit);
    
    // 图片选择器
    document.querySelectorAll('.image-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            document.getElementById('groupBuyImage').value = option.dataset.image || '';
            // 清除自定义上传预览
            document.getElementById('uploadPreview').style.display = 'none';
            document.querySelector('.upload-btn').style.display = 'flex';
        });
    });
    
    // 自定义图片上传
    const customImageUpload = document.getElementById('customImageUpload');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const removeUpload = document.getElementById('removeUpload');
    
    if (customImageUpload) {
        customImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 验证文件类型
                if (!file.type.startsWith('image/')) {
                    showToast('请上传图片文件', 'error');
                    return;
                }
                
                // 验证文件大小 (最大 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showToast('图片大小不能超过5MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;
                    previewImage.src = imageData;
                    uploadPreview.style.display = 'flex';
                    document.querySelector('.upload-btn').style.display = 'none';
                    
                    // 清除预设图片选择
                    document.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
                    document.getElementById('groupBuyImage').value = imageData;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // 移除上传的图片
    if (removeUpload) {
        removeUpload.addEventListener('click', (e) => {
            e.stopPropagation();
            customImageUpload.value = '';
            uploadPreview.style.display = 'none';
            document.querySelector('.upload-btn').style.display = 'flex';
            document.getElementById('groupBuyImage').value = '';
        });
    }
    
    // 详情模态框
    document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);
    
    // 模态框遮罩点击关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        });
    });
    
    // 筛选按钮
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderGroupBuyList();
        });
    });
    
    // 分类筛选
    document.getElementById('categorySelect').addEventListener('change', renderGroupBuyList);
    
    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
        renderGroupBuyList();
        renderRecommendations();
        showToast('已刷新', 'success');
    });
    
    // 位置按钮
    document.getElementById('locationBtn').addEventListener('click', openLocationModal);
    document.getElementById('closeLocationModal').addEventListener('click', closeLocationModal);
    document.getElementById('allowLocation').addEventListener('click', getUserLocation);
    document.getElementById('declineLocation').addEventListener('click', closeLocationModal);
    
    // 表单输入清除错误状态
    document.querySelectorAll('.publish-form input, .publish-form textarea, .publish-form select').forEach(field => {
        field.addEventListener('input', () => {
            field.classList.remove('error');
        });
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
}

// ==================== 初始化 ====================

/**
 * 应用初始化
 */
async function init() {
    try {
        // 渲染列表
        await renderGroupBuyList();
        
        // 渲染推荐
        renderRecommendations();
    } catch (error) {
        console.error('初始化失败:', error);
    }
    
    // 绑定事件
    bindEvents();
    
    // 首次访问显示位置提示
    const userData = getUserData();
    if (!userData.location && !sessionStorage.getItem('locationPromptShown')) {
        sessionStorage.setItem('locationPromptShown', 'true');
        setTimeout(() => {
            openLocationModal();
        }, 1000);
    }
    
    // 定期检查过期拼单（每分钟）
    setInterval(checkExpiredGroupBuys, 60000);
    
    // 启动列表页倒计时实时更新（每秒）
    setInterval(updateListCountdowns, 1000);
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
