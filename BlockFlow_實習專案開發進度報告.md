# BlockFlow 實習專案開發進度報告

**報告日期：** 2026年7月23日  
**專案版本：** v4.0.0  
**報告人：** Brian Yang

---

## 一、本週進度

本週完成了多項新功能開發、Bug 修復和響應式設計優化。

### 功能區塊與簡報講稿

**1. Materials 分頁**
- 讓使用者可以上傳和管理各種學習材料
- 支援格式：TXT, MD, CSV, JSON, PNG, JPG, JPEG, PDF, MP4, WebM
- 上傳後自動進行 AI 分析
- 在設定頁面可以切換顯示/隱藏

**2. 日曆 – Google Calendar 同步**
- 可與 Google Calendar 自動同步
- 使用 OAuth 2.0 認證，無需儲存密碼
- 自動跳過重複事件
- 支援離線佇列和增量同步

**3. AI Assistant（語音）**
- STT（語音輸入）+ TTS（語音輸出）
- 4 種 TTS 供應商：Browser Voice、Kokoro Local AI、tts.ai Cloud、ElevenLabs
- 即時波形視覺化（Canvas 動畫）
- 語音錄製功能（Voice Clone 預留介面）

**4. AI Assistant（記憶點）**
- 手動新增、自動記憶、釘選、編輯、刪除
- 重要性標籤（High / Medium / Low）和分類
- 語音對話後自動詢問「🧠 Remember this?」
- Firebase Firestore 同步

### 產品畫面截圖

- 截圖 1：Materials 分頁 – 上傳區域和材料卡片列表
- 截圖 2：日曆頁面 – Google Calendar 同步狀態
- 截圖 3：AI Assistant – 語音按鈕和波形動畫
- 截圖 4：AI Assistant – 記憶點列表和「🧠 Remember this?」確認對話框

---

## 二、Mr. Rickey 的建議

### 優化項目

| # | 建議 | 說明 | 狀態 |
|---|------|------|------|
| 1 | 先釐清 BlockFlow 最終想做成什麼產品 | 定義產品的核心目標與定位。避免想到什麼就加入什麼功能。規劃完整的產品 Roadmap，建立開發時程 | ⏳ 待討論 |
| 2 | 研究 NVIDIA API 能力 | 整理目前已研究過的 API。分享哪些 API 最有趣、最有潛力。思考哪些 API 能真正提升 BlockFlow | ✅ 已研究 |
| 3 | 發展具有市場價值的功能 | 思考學生、上班族等族群的實際需求。發展能真正解決問題的功能。以未來能上架 App Store 為目標設計產品 | ⏳ 持續進行 |

### 筆記備忘

1. **產品定位**：BlockFlow 目前是一個結合 AI 的個人生產力工具，核心是「3 區塊生活管理」（Focus / Personal / Recovery）
2. **NVIDIA API**：目前已使用 LLM API 進行自然語言處理和事件分析，未來可探索更多 API 整合
3. **市場價值**：已開發的功能（Daily Briefing、Heatmap、NL Scheduling、語音助手）都針對學生和上班族的日常需求

---

**報告完成日期：** 2026年7月23日  
**下次報告日期：** 2026年7月30日
