# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

<p align="center">
  <strong>現代化儲存空間視覺化分析工具</strong>
</p>

<p align="center">
  [繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)
</p>

---

StorViz 是一款功能強大的磁碟空間分析工具，幫助您快速了解儲存空間的使用情況。透過直觀的視覺化介面，輕鬆找出佔用空間的檔案和資料夾，優化您的儲存管理。

## 📥 下載與安裝

### 快速下載

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)

</div>

### 安裝步驟

<details open>
<summary><strong>🍎 macOS 安裝指南</strong></summary>

<br>

**安裝步驟：**

1. **下載檔案**：點擊上方「Download for macOS」按鈕下載 `.app.tar.gz` 檔案
2. **解壓縮**：雙擊下載的檔案，macOS 會自動解壓縮
3. **安裝**：將 `StorViz.app` 拖拽到 Applications 資料夾
4. **啟動**：在 Applications 中雙擊 StorViz 圖示啟動應用程式

> **💡 提示**：如果出現「無法驗證開發者」的警告，請在「系統偏好設定」→「安全性與隱私」中允許執行。

**系統需求：**
- **作業系統**：macOS 10.13 或更高版本
- **處理器**：Intel 或 Apple Silicon (M1/M2/M3)
- **記憶體**：至少 4GB RAM
- **儲存空間**：至少 100MB 可用空間

</details>

<details>
<summary><strong>🪟 Windows 安裝指南</strong></summary>

<br>

**安裝步驟：**

1. **下載檔案**：點擊上方「Download for Windows」按鈕下載 `.exe` 安裝程式
2. **執行安裝**：雙擊下載的安裝程式
3. **安裝精靈**：按照安裝精靈的指示完成安裝
4. **啟動**：從開始選單或桌面捷徑啟動 StorViz

> **💡 提示**：如果 Windows Defender 顯示警告，請選擇「更多資訊」→「仍要執行」。

**系統需求：**
- **作業系統**：Windows 10 或更高版本
- **架構**：x64 (64-bit)
- **記憶體**：至少 4GB RAM
- **儲存空間**：至少 100MB 可用空間

</details>

## ✨ 功能特色

- 📊 **視覺化儲存分析**：使用互動式圖表直觀地呈現磁碟空間使用情況
- ⚡ **快速掃描**：使用 Rust 後端搭配平行處理技術，提供高效能的目錄掃描
- 📁 **檔案類型統計**：詳細的檔案類型和副檔名儲存空間分析
- 🌍 **多語言支援**：支援英文、繁體中文和日文
- 🌓 **深色模式**：美觀的深色/淺色主題切換
- 💻 **跨平台**：可在 macOS 和 Windows 上運行

## 📸 螢幕截圖

<div align="center">

<table>
  <tr>
    <td width="50%">
      <img src="images/zh/image1.png" alt="主介面" />
      <p align="center"><em>主介面</em></p>
    </td>
    <td width="50%">
      <img src="images/zh/image2.png" alt="檔案類型統計" />
      <p align="center"><em>檔案類型統計</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image3.png" alt="目錄結構" />
      <p align="center"><em>目錄結構</em></p>
    </td>
    <td width="50%">
      <img src="images/zh/image4.png" alt="深色模式" />
      <p align="center"><em>深色模式</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image5.png" alt="多語言支援" />
      <p align="center"><em>多語言支援</em></p>
    </td>
    <td width="50%">
      <img src="images/zh/image6.png" alt="進階分析" />
      <p align="center"><em>進階分析</em></p>
    </td>
  </tr>
</table>

</div>

## 📄 授權條款

本專案為開源專案，採用 [AGPL-3.0](LICENSE) 授權條款。

## 🤝 貢獻

歡迎貢獻！如果您想為此專案做出貢獻，請隨時提交 Pull Request 或開啟 Issue。

### 貢獻者

感謝所有為此專案做出貢獻的開發者！

<a href="https://github.com/exptechtw/StorViz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=exptechtw/StorViz" alt="Contributors" />
</a>

---

<p align="center">
  如果這個專案對您有幫助，請給我們一個 ⭐️ Star！
</p>
