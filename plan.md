# Playroom 遊戲擴充計畫

## 實作方向

沿用目前原生 HTML、CSS 與 JavaScript ES modules，不改用框架、不覆蓋既有遊戲。延續首頁遊戲卡片、1P／2P 模式選擇、房間邀請碼、共用遊戲標題列及既有介面配色與 UI 語彙。2P 使用目前房間與 MQTT 傳輸；1P 在瀏覽器本機與電腦對戰。新增程式只放在各自的遊戲模組及必要的首頁、應用接線與共用樣式中。

新增四款完整遊戲：

- **空氣曲棍球**：球拍／球碰撞、反彈、進球計分與開球重置；1P 對電腦，2P 透過朋友房間連線。即時對戰採主房間端權威模擬，另一方傳送球拍操作，接收同步狀態。
- **四子棋**：7 × 6 棋盤、輪流落子、四子連線判勝；1P 提供電腦對手，2P 使用朋友房間。
- **黑白棋**：8 × 8 棋盤、合法翻子、無合法棋步時略過回合及終局計子；1P 對電腦，2P 使用朋友房間。
- **記憶配對**：翻牌配對、配對得分與回合管理；1P 對電腦，2P 使用朋友房間。

每款新增遊戲各自設置 Model、View、Controller；共用現有房間、玩家身份、傳輸、離開與重新開始流程。新增遊戲入口整合進既有遊戲列表；新增介面沿用現有卡片與響應式版面。翻譯字串補齊 `en`、`ja`、`zh-Hans`、`zh-Hant` 四份 JSON。

## 專案結構

- `index.html`：既有首頁與遊戲 shell；新增四個遊戲入口及獨立遊戲掛載區。
- `styles.css`：新增遊戲元件樣式並配合既有桌面／窄螢幕斷點。
- `js/controller.js`、`js/view.js`：共用應用啟動、房間與導覽；補上新遊戲 registry、模式切換、標題和必要視圖資訊。
- `js/games/airhockey/`、`js/games/connectfour/`、`js/games/reversi/`、`js/games/memory/`：各自包含 `model.js`、`view.js`、`controller.js`，封裝該款遊戲規則、呈現、輸入、AI 與同步訊息。
- `Lanuage/*.json`：延續現有資料夾名稱與 JSON 翻譯機制，補足四種既有語系。
- `manus-routes.json`：宣告目前單頁應用的 `/` 路由，供本機 Preview 使用。

## 依賴與執行

不新增前端套件或產品後端；保留既有靜態前端與 MQTT WebSocket 房間傳輸。Manus Web 專案目前的 server、database 均為關閉。專案沒有既有 `package.json`／建置命令；若需要本機 Preview，會使用不改動產品架構的輕量靜態檔案服務，並沿用平台宣告的 Session port。
