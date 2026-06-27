export default class View {
    constructor() {
        // 取得介面元素
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // 功能一 DOM
        this.addTitle = document.getElementById('add-title');
        this.addCountry = document.getElementById('add-country');
        this.addType = document.getElementById('add-type');
        this.addStatus = document.getElementById('add-status');
        this.addEpisode = document.getElementById('add-episode');
        
        // 功能三 DOM
        this.updateTitle = document.getElementById('update-title');
        this.updateStatus = document.getElementById('update-status');
        this.updateRemark = document.getElementById('update-remark');

        // 設定 DOM
        this.cfgToken = document.getElementById('cfg-token');
        this.cfgDbid = document.getElementById('cfg-dbid');

        this.initEventListeners();
    }

    initEventListeners() {
        // 頁籤切換
        // view.js 中的頁籤切換邏輯
    this.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 改用 e.currentTarget 避免點到按鈕內部的字或圖示而報錯
            const targetBtn = e.currentTarget; 
            
            this.tabBtns.forEach(b => b.classList.remove('active'));
            this.tabContents.forEach(c => c.classList.remove('active'));
            
            targetBtn.classList.add('active');
            document.getElementById(targetBtn.dataset.target).classList.add('active');
        });
    });

        // 集數輸入框顯示邏輯
        this.addStatus.addEventListener('change', () => {
            this.addEpisode.style.display = (this.addStatus.value === '進行中') ? 'block' : 'none';
        });
    }

    // 將事件綁定提供給 Controller 呼叫
    bindAddMovie(handler) {
        document.getElementById('btn-add').addEventListener('click', () => {
            handler({
                title: this.addTitle.value.trim(),
                country: this.addCountry.value,
                type: this.addType.value,
                status: this.addStatus.value,
                episode: this.addEpisode.value.trim()
            });
        });
    }

    bindQueryMovies(handler) {
        document.getElementById('btn-query').addEventListener('click', handler);
    }

    bindUpdateMovie(handler) {
        document.getElementById('btn-update').addEventListener('click', () => {
            handler({
                title: this.updateTitle.value.trim(),
                status: this.updateStatus.value,
                remark: this.updateRemark.value.trim()
            });
        });
    }

    bindSaveSettings(handler) {
        document.getElementById('btn-save-settings').addEventListener('click', () => {
            handler(this.cfgToken.value.trim(), this.cfgDbid.value.trim());
        });
    }

    bindClearSettings(handler) {
        document.getElementById('btn-clear-settings').addEventListener('click', handler);
    }

    // 畫面更新與提示方法
    renderSettings(token, dbId) {
        if(token) this.cfgToken.value = token;
        if(dbId) this.cfgDbid.value = dbId;
    }

    clearAddInputs() {
        this.addTitle.value = "";
        this.addEpisode.value = "";
    }

    clearUpdateInputs() {
        this.updateTitle.value = "";
        this.updateRemark.value = "";
    }

    clearSettingsInputs() {
        this.cfgToken.value = "";
        this.cfgDbid.value = "";
    }

    switchTabTo(tabId) {
        const targetBtn = document.querySelector(`[data-target="${tabId}"]`);
        if (targetBtn) targetBtn.click();
    }

    showAlert(msg) { alert(msg); }
    showPrompt(msg) { return prompt(msg); }
    showConfirm(msg) { return confirm(msg); }
    openUrl(url) { window.open(url, '_blank'); }
}