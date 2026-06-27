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
        
        return await fetch(proxyUrl, config);
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