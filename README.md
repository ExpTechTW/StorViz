# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

[繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

現代化儲存空間視覺化分析工具。

## 📥 下載與安裝

### 快速下載

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)

</div>

### 安裝步驟

<div style="margin: 20px 0;">
  <div style="display: flex; border-bottom: 2px solid var(--color-border-default); margin-bottom: 20px;">
    <button onclick="showTab('macos')" id="macos-tab" style="flex: 1; padding: 12px 20px; border: none; background: var(--color-accent-emphasis); color: var(--color-fg-on-emphasis); cursor: pointer; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; margin-right: 5px;">🍎 macOS</button>
    <button onclick="showTab('windows')" id="windows-tab" style="flex: 1; padding: 12px 20px; border: none; background: var(--color-btn-bg); color: var(--color-fg-default); cursor: pointer; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; margin-left: 5px;">🪟 Windows</button>
  </div>
  
  <div id="macos-content" style="display: block; padding: 20px; background: var(--color-canvas-subtle); border-radius: 0 0 8px 8px; border: 1px solid var(--color-border-default);">
    <h4 style="margin-top: 0; color: var(--color-fg-default);">macOS 安裝步驟</h4>
    <ol style="line-height: 1.6; color: var(--color-fg-default);">
      <li><strong>下載檔案</strong>：點擊上方「Download for macOS」按鈕下載 <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">.app.tar.gz</code> 檔案</li>
      <li><strong>解壓縮</strong>：雙擊下載的檔案，macOS 會自動解壓縮</li>
      <li><strong>安裝</strong>：將 <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">StorViz.app</code> 拖拽到 Applications 資料夾</li>
      <li><strong>啟動</strong>：在 Applications 中雙擊 StorViz 圖示啟動應用程式</li>
    </ol>
    <div style="background: var(--color-accent-subtle); padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid var(--color-accent-emphasis);">
      <strong style="color: var(--color-fg-default);">💡 提示</strong><span style="color: var(--color-fg-muted);">：如果出現「無法驗證開發者」的警告，請在「系統偏好設定」→「安全性與隱私」中允許執行。</span>
    </div>
    
    <h4 style="margin-top: 20px; color: var(--color-fg-default);">macOS 系統需求</h4>
    <ul style="color: var(--color-fg-default);">
      <li><strong>作業系統</strong>：macOS 10.13 或更高版本</li>
      <li><strong>處理器</strong>：Intel 或 Apple Silicon (M1/M2)</li>
      <li><strong>記憶體</strong>：至少 4GB RAM</li>
      <li><strong>儲存空間</strong>：至少 100MB 可用空間</li>
    </ul>
  </div>
  
  <div id="windows-content" style="display: none; padding: 20px; background: var(--color-canvas-subtle); border-radius: 0 0 8px 8px; border: 1px solid var(--color-border-default);">
    <h4 style="margin-top: 0; color: var(--color-fg-default);">Windows 安裝步驟</h4>
    <ol style="line-height: 1.6; color: var(--color-fg-default);">
      <li><strong>下載檔案</strong>：點擊上方「Download for Windows」按鈕下載 <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">.exe</code> 安裝程式</li>
      <li><strong>執行安裝</strong>：雙擊下載的安裝程式</li>
      <li><strong>安裝精靈</strong>：按照安裝精靈的指示完成安裝</li>
      <li><strong>啟動</strong>：從開始選單或桌面捷徑啟動 StorViz</li>
    </ol>
    <div style="background: var(--color-success-subtle); padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid var(--color-success-emphasis);">
      <strong style="color: var(--color-fg-default);">💡 提示</strong><span style="color: var(--color-fg-muted);">：如果 Windows Defender 顯示警告，請選擇「更多資訊」→「仍要執行」。</span>
    </div>
    
    <h4 style="margin-top: 20px; color: var(--color-fg-default);">Windows 系統需求</h4>
    <ul style="color: var(--color-fg-default);">
      <li><strong>作業系統</strong>：Windows 10 或更高版本</li>
      <li><strong>架構</strong>：x64 (64-bit)</li>
      <li><strong>記憶體</strong>：至少 4GB RAM</li>
      <li><strong>儲存空間</strong>：至少 100MB 可用空間</li>
    </ul>
  </div>
</div>

<script>
function showTab(tabName) {
  // 隱藏所有內容
  document.getElementById('macos-content').style.display = 'none';
  document.getElementById('windows-content').style.display = 'none';
  
  // 重置所有按鈕樣式
  document.getElementById('macos-tab').style.background = 'var(--color-btn-bg)';
  document.getElementById('macos-tab').style.color = 'var(--color-fg-default)';
  document.getElementById('windows-tab').style.background = 'var(--color-btn-bg)';
  document.getElementById('windows-tab').style.color = 'var(--color-fg-default)';
  
  // 顯示選中的內容
  document.getElementById(tabName + '-content').style.display = 'block';
  
  // 高亮選中的按鈕
  document.getElementById(tabName + '-tab').style.background = 'var(--color-accent-emphasis)';
  document.getElementById(tabName + '-tab').style.color = 'var(--color-fg-on-emphasis)';
}
</script>

## 功能特色

- **視覺化儲存分析**：使用互動式圖表直觀地呈現磁碟空間使用情況
- **快速掃描**：使用 Rust 後端搭配平行處理技術，提供高效能的目錄掃描
- **檔案類型統計**：詳細的檔案類型和副檔名儲存空間分析
- **多語言支援**：支援英文、繁體中文和日文
- **深色模式**：美觀的深色/淺色主題切換
- **跨平台**：可在 macOS 和 Windows 上運行

## 螢幕截圖

<div align="center">

<img src="images/zh/image1.png" alt="主介面" width="45%" style="margin: 5px;">
<img src="images/zh/image2.png" alt="檔案類型統計" width="45%" style="margin: 5px;">

<img src="images/zh/image3.png" alt="目錄結構" width="45%" style="margin: 5px;">
<img src="images/zh/image4.png" alt="深色模式" width="45%" style="margin: 5px;">

<img src="images/zh/image5.png" alt="多語言支援" width="45%" style="margin: 5px;">
<img src="images/zh/image6.png" alt="進階分析" width="45%" style="margin: 5px;">

</div>

## 授權條款

本專案為開源專案，採用 AGPL-3.0 授權條款。

## 貢獻

- 歡迎貢獻！請隨時提交 Pull Request。
  <a href="https://github.com/exptechtw/StorViz/graphs/contributors"><img src="https://contrib.rocks/image?repo=exptechtw/StorViz" ></a>
