/**
 * Controller 類別：負責監聽使用者的動作（如點擊、滑鼠移入），
 * 捕獲動作後呼叫 Model 改變內部資料，再命令 View 重新整理畫面。
 */
class BirthdayController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.bindEvents();
    }

    /**
     * 綁定監聽按鈕的各種滑鼠與點擊事件
     */
    bindEvents() {
        // 1. 當點擊「願意 😍」
        this.view.yesButton.addEventListener('click', () => {
            this.model.accept();
            this.view.render(this.model);
        });

        // 2. 當點擊「不願意 😢」
        this.view.noButton.addEventListener('click', () => {
            this.handleNoAction();
        });

        // 3. 重點：滑鼠懸停（靠近）「不願意」按鈕的閃躲核心
        this.view.noButton.addEventListener('mouseover', () => {
            // 檢查 Model 的條件，如果點擊次數達標，滑鼠只要一靠近，按鈕就立刻飛走！
            if (this.model.shouldDodge()) {
                this.view.moveNoButtonRandomly();
            }
        });
    }

    /**
     * 處理點擊不願意時的整合流程
     */
    handleNoAction() {
        // 更新 Model 資料狀態
        this.model.reject();
        
        // 如果已經在閃躲階段卻還是用奇特方式點到了，點擊瞬間也再度讓它飛走
        if (this.model.shouldDodge()) {
            this.view.moveNoButtonRandomly();
        }
        
        // 通知 View 依照最新資料重新繪製畫面
        this.view.render(this.model);
    }
}
