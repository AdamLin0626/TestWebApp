export default class Model {
    constructor() {}

    getCredentials() {
        const token = localStorage.getItem('NOTION_TOKEN');
        const dbId = localStorage.getItem('DATABASE_ID');
        return (token && dbId) ? { token, dbId } : null;
    }

    saveCredentials(token, dbId) {
        localStorage.setItem('NOTION_TOKEN', token);
        localStorage.setItem('DATABASE_ID', dbId);
    }

    clearCredentials() {
        localStorage.clear();
    }

    // 在 model.js 中，把 requestNotionProxy 改寫，讓它自行處理 HTTP 狀態
    async requestNotionProxy(url, method, bodyData = null) {
        const creds = this.getCredentials();
        if (!creds) throw new Error("NO_CREDENTIALS");  

        const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
        const config = {
            method: method,
            headers: {
                "Authorization": `Bearer ${creds.token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            }
        };
        if (bodyData) config.body = JSON.stringify(bodyData);

        const response = await fetch(proxyUrl, config);
        const data = await response.json(); 

        // 如果 Notion 回傳失敗，Model 負責拋出錯誤，把 HTTP 概念封裝起來
        if (!response.ok) {
            throw new Error(data.message || "請求失敗");
        }

        return data; // 只回傳乾淨的純資料給 Controller
    }
    
    async addPage(payload) {
        return await this.requestNotionProxy(`https://api.notion.com/v1/pages`, "POST", payload);
    }

    async queryDatabase() {
        const creds = this.getCredentials();
        return await this.requestNotionProxy(`https://api.notion.com/v1/databases/${creds.dbId}/query`, "POST");
    }

    async searchPageByTitle(title) {
        const creds = this.getCredentials();
        const payload = {
            "filter": { "property": "片名", "title": { "equals": title } }
        };
        return await this.requestNotionProxy(`https://api.notion.com/v1/databases/${creds.dbId}/query`, "POST", payload);
    }

    async updatePage(pageId, payload) {
        return await this.requestNotionProxy(`https://api.notion.com/v1/pages/${pageId}`, "PATCH", payload);
    }
}