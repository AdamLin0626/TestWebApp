// 當整個網頁的 HTML DOM 樹結構加載完畢後，立即初始化 MVC 應用程式
document.addEventListener('DOMContentLoaded', () => {
    // 1. 宣告實例化模型 (Model)
    const model = new BirthdayModel();
    
    // 2. 宣告實例化視圖 (View)
    const view = new BirthdayView();
    
    // 3. 透過控制器 (Controller) 將兩者注入綁定，串聯起整套互動流程
    const controller = new BirthdayController(model, view);
    
    // 4. 初始化首次畫面渲染
    view.render(model);
});
