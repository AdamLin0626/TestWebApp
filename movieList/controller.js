export default class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        // 初始化設定載入
        const creds = this.model.getCredentials();
        if (creds) {
            this.view.renderSettings(creds.token, creds.dbId);
        }

        // 綁定 View 的觸發事件到 Controller 處理函式
        this.view.bindAddMovie(this.handleAddMovie.bind(this));
        this.view.bindQueryMovies(this.handleQueryMovies.bind(this));
        this.view.bindUpdateMovie(this.handleUpdateMovie.bind(this));
        this.view.bindSaveSettings(this.handleSaveSettings.bind(this));
        this.view.bindClearSettings(this.handleClearSettings.bind(this));
    }

    checkCredentials() {
        if (!this.model.getCredentials()) {
            this.view.showAlert("⚠️ 偵測到您尚未設定密鑰！\n請先前往「⚙️ 系統設定」分頁填寫您的 Notion 憑證。");
            this.view.switchTabTo('tab-settings');
            return false;
        }
        return true;
    }

    // 在 controller.js 中，以 handleAddMovie 為例：
    async handleAddMovie(data) {
        if (!this.checkCredentials()) return;
        if (!data.title) return this.view.showAlert("請填寫片名！");    

        const creds = this.model.getCredentials();
        let remark = (data.status === "進行中" && data.episode) ? `第${data.episode}集` : (data.status === "進行中" ? "進行中" : "");   

        const payload = {
            "parent": { "database_id": creds.dbId },
            "properties": {
                /* ...原本的 payload 設定... */
            }
        };  

        try {
            // Controller 只需要呼叫 Model，不用再管 HTTP Response 了！
            await this.model.addPage(payload); 
            this.view.showAlert(`新增成功！\n名稱：${data.title}\n進度：${data.status}`);
            this.view.clearAddInputs();
        } catch (e) {
            // 所有錯誤（包含 API 失敗）都在這裡被 View 攔截並顯示
            this.view.showAlert(`處理失敗: ${e.message}`);
        }
    }

    async handleQueryMovies() {
        if (!this.checkCredentials()) return;

        try {
            const res = await this.model.queryDatabase();
            if (!res.ok) throw new Error("無法獲取數據，請檢查密鑰或ID是否正確。");
            
            const data = await res.json();
            if (data.results.length === 0) return this.view.showAlert("目前沒有片單數據。");

            let listString = "📋 當前片單與連結：\n\n";
            let urlMap = {}; 

            data.results.forEach((item, index) => {
                let titleText = "未命名";
                if(item.properties["片名"] && item.properties["片名"].title.length > 0) {
                    titleText = item.properties["片名"].title[0].plain_text;
                }
                listString += `${index + 1}. ${titleText}\n`;
                urlMap[index + 1] = item.url;
            });

            const choice = this.view.showPrompt(`${listString}\n請輸入數字打開 Notion 連結：`);
            if (choice && urlMap[choice]) {
                this.view.openUrl(urlMap[choice]);
            }
        } catch (e) {
            this.view.showAlert(`查詢失敗：${e.message}`);
        }
    }

    async handleUpdateMovie(data) {
        if (!this.checkCredentials()) return;
        if (!data.title) return this.view.showAlert("請輸入要更新的片名！");

        try {
            const queryRes = await this.model.searchPageByTitle(data.title);
            const queryData = await queryRes.json();
            
            if (queryData.results.length === 0) {
                return this.view.showAlert(`找不到名為「${data.title}」的影片。`);
            }

            const pageId = queryData.results[0].id;
            let remark = (data.status === "進行中") ? data.remark : "";

            const payload = {
                "properties": {
                    "進度": { "status": { "name": data.status } },
                    "備註": { "rich_text": [{ "text": { "content": remark } }] }
                }
            };

            const res = await this.model.updatePage(pageId, payload);
            if (res.ok) {
                this.view.showAlert(`[ ${data.title} ] 已成功更新為：${data.status}`);
                this.view.clearUpdateInputs();
            } else {
                this.view.showAlert("更新失敗，請檢查權限。");
            }
        } catch (e) {
            this.view.showAlert(`發生錯誤：${e.message}`);
        }
    }

    handleSaveSettings(token, dbId) {
        if (!token || !dbId) {
            return this.view.showAlert("請完整填寫兩項密鑰欄位！");
        }
        this.model.saveCredentials(token, dbId);
        this.view.showAlert("🎉 設定已安全儲存至本地端！");
        this.view.switchTabTo('tab-main');
    }

    handleClearSettings() {
        if (this.view.showConfirm("確定要清除手機本地端保存的所有設定嗎？")) {
            this.model.clearCredentials();
            this.view.clearSettingsInputs();
            this.view.showAlert("已清除完成。");
        }
    }
}