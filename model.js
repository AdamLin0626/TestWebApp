/**
 * Model 類別：純粹負責記錄資料狀態與核心商業邏輯，
 * 完全不涉及任何網頁 DOM 節點的修改。
 */
class BirthdayModel {
    constructor() {
        // --- 核心內部狀態 ---
        this.noCount = 0;         // 點擊「不願意」的累積次數
        this.yesButtonSize = 18;  // 「願意」按鈕的初始字型大小 (px)
        this.noButtonSize = 18;   // 「不願意」按鈕的初始字型大小 (px)
        this.isAccepted = false;  // 是否已經答應
        
        // --- 可自由修改的喊話劇本 ---
        // 當每點一次「不願意」，就會依序換成下一句求情的話
        this.noTexts = [
            "再考慮一下嘛... 🥺",
            "真的不要嗎？我會很傷心喔... 😭",
            "求求妳湘湘～帶妳去吃好吃的！ 🍓",
            "滑鼠壞掉了嗎？再選一次試試看嘛！ 👀",
            "哼！沒辦法了，妳按不到我囉！ 😜" 
        ];
        
        // 畫面上目前顯示的動態標題文字
        this.currentText = "親愛的湘湘，你願意幫我過生日嗎？ 🎂";
    }

    /**
     * 當點擊「不願意」時的狀態更新邏輯
     */
    reject() {
        this.noCount++;
        
        // 1. 讓願意按鈕逐次大幅度變大
        this.yesButtonSize += 16; 
        
        // 2. 讓不願意按鈕逐次變小，但設定最小極限值為 8px，避免完全消失
        this.noButtonSize = Math.max(8, this.noButtonSize - 2);
        
        // 3. 根據點擊次數切換劇本台詞
        if (this.noCount <= this.noTexts.length) {
            this.currentText = this.noTexts[this.noCount - 1];
        } else {
            this.currentText = "妳真的忍心一直拒絕我嗎... 💔";
        }
    }

    /**
     * 當點擊「願意」時的狀態更新邏輯
     */
    accept() {
        this.isAccepted = true;
    }

    /**
     * 判斷目前是否應該啟動「瘋狂閃躲模式」
     * 這裡設定點擊第 4 次（對應陣列最後一句台詞前夕）就開啟滑鼠靠近就飛走的特效
     */
    shouldDodge() {
        return this.noCount >= 4;
    }
}
