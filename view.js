/**
 * View 類別：專門負責操縱 DOM 節點，
 * 將 Model 提供的新狀態轉化為螢幕上的實際畫面。
 */
class BirthdayView {
    constructor() {
        // 快取（Cache）所有需要用到的 DOM 元素
        this.titleElement = document.getElementById('title');
        this.yesButton = document.getElementById('yesBtn');
        this.noButton = document.getElementById('noBtn');
        this.celebrationElement = document.getElementById('celebration');
    }

    /**
     * 主要渲染函式：根據傳入的最新 Model 狀態重新繪製 UI
     */
    render(model) {
        // 更新大標題文字
        this.titleElement.innerText = model.currentText;

        if (model.isAccepted) {
            // 情境 A：答應了 -> 隱藏雙方按鈕，顯示表白成功特效
            this.yesButton.style.display = 'none';
            this.noButton.style.display = 'none';
            this.celebrationElement.classList.remove('hidden');
            this.triggerConfetti(); // 啟動豐富的灑花功能
        } else {
            // 情境 B：持續互動中 -> 更新兩顆按鈕的即時大小與內邊距
            this.yesButton.style.fontSize = `${model.yesButtonSize}px`;
            this.yesButton.style.padding = `${model.yesButtonSize / 2}px ${model.yesButtonSize}px`;
            
            this.noButton.style.fontSize = `${model.noButtonSize}px`;
            this.noButton.style.padding = `${model.noButtonSize / 2}px ${model.noButtonSize}px`;
        }
    }

    /**
     * 瘋狂閃躲邏輯：計算隨機坐報並強行把「不願意」按鈕瞬移走
     */
    moveNoButtonRandomly() {
        const padding = 60; // 邊緣安全邊距，防止按鈕飛出瀏覽器邊界之外
        
        // 計算可移動的最大寬度與高度空間
        const maxX = window.innerWidth - this.noButton.offsetWidth - padding;
        const maxY = window.innerHeight - this.noButton.offsetHeight - padding;

        // 在安全空間內產生隨機 X, Y 軸座標
        const randomX = Math.max(padding, Math.floor(Math.random() * maxX));
        const randomY = Math.max(padding, Math.floor(Math.random() * maxY));

        // 變更按鈕定位屬性，使其隨機漂移
        this.noButton.style.position = 'fixed';
        this.noButton.style.left = `${randomX}px`;
        this.noButton.style.top = `${randomY}px`;
    }

    /**
     * 慶祝灑花特效：動態在畫面上隨機降下色彩繽紛的小紙片
     */
    triggerConfetti() {
        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            // 隨機分布在螢幕水平寬度
            confetti.style.left = Math.random() * 100 + 'vw';
            // 隨機落下的延遲時間，造成參差不齊的浪漫效果
            confetti.style.animationDelay = Math.random() * 2 + 's';
            // 隨機繽紛色彩
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 75%)`;
            
            document.body.appendChild(confetti);
            
            // 3.5秒後自動清除節點，維護瀏覽器記憶體效能
            setTimeout(() => confetti.remove(), 3500);
        }
    }
}
