# 目前已研究的 NVIDIA API

以下按照**模型能力**分類，而非傳統 API 分類：

---

## 📖 Read — 閱讀理解（文字/NLP）

這些模型擅長理解文字、摘要、對話、分析文件。

| 模型 | 已整合？ | 說明 |
|---|---|---|
| **Llama 3.1 8B Instruct** | ✅ **目前預設模型** | 快速通用的文字對話，所有 AI 功能的基礎 |
| **Llama 3.3 Nemotron Super 49B** | ✅ 可切換 | 更強的文字推理能力，適合複雜分析 |
| **Gemma 4 31B IT** | ✅ 可切換 | Google 出品，平衡型文字模型 |
| **Gemma 2 2B IT** | ✅ 可切換 | 輕量快速，適合簡單任務 |
| **Nemotron Nano 9B v2** 🆕 | ❌ 未整合 | **最新推薦** — 可控推理深度，128K 上下文 |
| **Llama 3.1 Nemotron Nano 8B v1** 🆕 | ❌ 未整合 | 單 GPU 可跑，具工具呼叫能力 |

---

## 👁️ See — 視覺辨識（圖片/影片）

這些模型可以「看」圖片、影片、講義、圖表。

| 模型 | 已整合？ | 能力 |
|---|---|---|
| **Llama 3.2 11B Vision Instruct** | ✅ **已用於 OCR** | 圖片理解、文字提取 |
| **Phi-4 Multimodal Instruct** 🆕 | ❌ 未整合 | 圖片+圖表+表格理解，輕量高效 |
| **Nemotron 3 Nano Omni 30B** 🆕 | ❌ 未整合 | **最強多模態** — 影片+圖片+音訊+文字全支援 |

---

## 👂 Listen — 聽覺理解（語音/音訊）

這些模型可以「聽」語音、錄音、課程內容。

| 模型/服務 | 已整合？ | 能力 |
|---|---|---|
| **Browser STT（Web Speech API）** | ✅ **Nova STT** | 瀏覽器原生語音轉文字（免費） |
| **Phi-4 Multimodal Instruct** 🆕 | ❌ 未整合 | 音訊理解 + 轉錄 |
| **Nemotron 3 Nano Omni** 🆕 | ❌ 未整合 | 音訊分析 + 語者辨識 |

---

## 🗣️ Speak — 語音輸出（文字轉語音）

這些模型可以「說」出回應。

| 模型/服務 | 已整合？ | 能力 |
|---|---|---|
| **Browser TTS** | ✅ **Nova TTS** | 瀏覽器原生語音合成（免費） |
| **Kokoro TTS** | ✅ **Nova TTS** | 本地端語音合成（免費） |
| **tts.ai** | ✅ **Nova TTS** | 雲端語音合成（需金鑰） |
| **ElevenLabs** | ✅ **Nova TTS** | 高品質雲端語音合成（需金鑰） |

---

## 🧠 Think — 推理思考（規劃/決策）

這些模型擅長邏輯推理、規劃、分析因果。

| 模型 | 已整合？ | 適合場景 |
|---|---|---|
| **Nemotron Nano 9B v2** 🆕 | ❌ 未整合 | **可控推理** → 可開關 reasoning mode |
| **Llama 3.3 Nemotron Super 49B** | ✅ 可選 | 深度推理 → 複雜排程分析 |
| **Nemotron 3 Nano Omni** 🆕 | ❌ 未整合 | 推理+多模態 → 全方位分析 |
| **cuOpt** 🆕 | ❌ 未整合 | 約束求解 → 課表最佳化（觀察中） |

---

## 💾 Remember — 記憶檢索（搜尋/嵌入）

這些模型可以「記住」和「找到」過去的資訊。

| 模型 | 已整合？ | 能力 |
|---|---|---|
| **NeMo Retriever Embeddings** 🆕 | ❌ 未整合 | 將文字轉為向量，語意搜尋 |
| **NeMo Retriever Rerank** 🆕 | ❌ 未整合 | 搜尋結果重新排序 |
| **AI Assistant Memory** | ✅ 已上線 | localStorage 記憶點，ChatGPT 式管理 |

---

## 架構圖

```
                 使用者
                    │
                    ▼
            ┌─────────────────┐
            │  BlockFlow App   │
            │  (PWA 前端)      │
            └──────┬──────────┘
                    │ Proxy 轉發
                    ▼
    ┌───────────────────────────────┐
    │     NVIDIA API Gateway        │
    │  integrate.api.nvidia.com     │
    ├───────────────────────────────┤
    │  📖 Read    — Chat Completions │
    │  👁️ See     — Vision/Multimodal│
    │  👂 Listen  — Audio理解      │
    │  🧠 Think   — Reasoning模型   │
    │  💾 Remember — Embeddings API  │
    └───────────────────────────────┘
```

---

## 價格摘要

| 項目 | 內容 |
|---|---|
| **免費開發** | NVIDIA Developer Program 提供免費存取 |
| **自架 NIM** | 最多 16 GPU 免費研究/開發/測試 |
| **生產環境** | NVIDIA AI Enterprise $4,500/GPU/年 |
| **Rate Limit** | 免費帳號約 40 RPM |
