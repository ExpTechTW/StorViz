# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

[繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

モダンなストレージ容量視覚化・分析ツールです。

## 📥 ダウンロードとインストール

### クイックダウンロード

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)

</div>

### インストール手順

<div style="margin: 20px 0;">
  <div style="display: flex; border-bottom: 2px solid var(--color-border-default); margin-bottom: 20px;">
    <button onclick="showTab('macos')" id="macos-tab" style="flex: 1; padding: 12px 20px; border: none; background: var(--color-accent-emphasis); color: var(--color-fg-on-emphasis); cursor: pointer; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; margin-right: 5px;">🍎 macOS</button>
    <button onclick="showTab('windows')" id="windows-tab" style="flex: 1; padding: 12px 20px; border: none; background: var(--color-btn-bg); color: var(--color-fg-default); cursor: pointer; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; margin-left: 5px;">🪟 Windows</button>
  </div>
  
  <div id="macos-content" style="display: block; padding: 20px; background: var(--color-canvas-subtle); border-radius: 0 0 8px 8px; border: 1px solid var(--color-border-default);">
    <h4 style="margin-top: 0; color: var(--color-fg-default);">macOS インストール手順</h4>
    <ol style="line-height: 1.6; color: var(--color-fg-default);">
      <li><strong>ファイルダウンロード</strong>：上の「Download for macOS」ボタンをクリックして <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">.app.tar.gz</code> ファイルをダウンロード</li>
      <li><strong>展開</strong>：ダウンロードしたファイルをダブルクリック、macOS が自動展開</li>
      <li><strong>インストール</strong>：<code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">StorViz.app</code> を Applications フォルダにドラッグ</li>
      <li><strong>起動</strong>：Applications で StorViz アイコンをダブルクリックしてアプリを起動</li>
    </ol>
    <div style="background: var(--color-accent-subtle); padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid var(--color-accent-emphasis);">
      <strong style="color: var(--color-fg-default);">💡 ヒント</strong><span style="color: var(--color-fg-muted);">：「開発元を確認できません」の警告が表示された場合、「システム環境設定」→「セキュリティとプライバシー」で実行を許可してください。</span>
    </div>
    
    <h4 style="margin-top: 20px; color: var(--color-fg-default);">macOS システム要件</h4>
    <ul style="color: var(--color-fg-default);">
      <li><strong>オペレーティングシステム</strong>：macOS 10.13 以上</li>
      <li><strong>プロセッサ</strong>：Intel または Apple Silicon (M1/M2)</li>
      <li><strong>メモリ</strong>：最低 4GB RAM</li>
      <li><strong>ストレージ</strong>：最低 100MB の空き容量</li>
    </ul>
  </div>
  
  <div id="windows-content" style="display: none; padding: 20px; background: var(--color-canvas-subtle); border-radius: 0 0 8px 8px; border: 1px solid var(--color-border-default);">
    <h4 style="margin-top: 0; color: var(--color-fg-default);">Windows インストール手順</h4>
    <ol style="line-height: 1.6; color: var(--color-fg-default);">
      <li><strong>ファイルダウンロード</strong>：上の「Download for Windows」ボタンをクリックして <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">.exe</code> インストーラーをダウンロード</li>
      <li><strong>インストーラー実行</strong>：ダウンロードしたインストーラーをダブルクリック</li>
      <li><strong>インストールウィザード</strong>：インストールウィザードの指示に従う</li>
      <li><strong>起動</strong>：スタートメニューまたはデスクトップショートカットから StorViz を起動</li>
    </ol>
    <div style="background: var(--color-success-subtle); padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid var(--color-success-emphasis);">
      <strong style="color: var(--color-fg-default);">💡 ヒント</strong><span style="color: var(--color-fg-muted);">：Windows Defender が警告を表示した場合、「詳細情報」→「実行」を選択してください。</span>
    </div>
    
    <h4 style="margin-top: 20px; color: var(--color-fg-default);">Windows システム要件</h4>
    <ul style="color: var(--color-fg-default);">
      <li><strong>オペレーティングシステム</strong>：Windows 10 以上</li>
      <li><strong>アーキテクチャ</strong>：x64 (64-bit)</li>
      <li><strong>メモリ</strong>：最低 4GB RAM</li>
      <li><strong>ストレージ</strong>：最低 100MB の空き容量</li>
    </ul>
  </div>
</div>

<script>
function showTab(tabName) {
  // すべてのコンテンツを非表示
  document.getElementById('macos-content').style.display = 'none';
  document.getElementById('windows-content').style.display = 'none';
  
  // すべてのボタンスタイルをリセット
  document.getElementById('macos-tab').style.background = 'var(--color-btn-bg)';
  document.getElementById('macos-tab').style.color = 'var(--color-fg-default)';
  document.getElementById('windows-tab').style.background = 'var(--color-btn-bg)';
  document.getElementById('windows-tab').style.color = 'var(--color-fg-default)';
  
  // 選択されたコンテンツを表示
  document.getElementById(tabName + '-content').style.display = 'block';
  
  // 選択されたボタンをハイライト
  document.getElementById(tabName + '-tab').style.background = 'var(--color-accent-emphasis)';
  document.getElementById(tabName + '-tab').style.color = 'var(--color-fg-on-emphasis)';
}
</script>

## 主な機能

- **ビジュアルストレージ分析**：インタラクティブなチャートによる直感的なディスク使用状況の可視化
- **高速スキャン**：並列処理を使用した Rust バックエンドによる高性能なディレクトリスキャン
- **ファイルタイプ統計**：ファイルタイプと拡張子による詳細なストレージ分析
- **多言語対応**：英語、繁体字中国語、日本語に対応
- **ダークモード**：美しいダーク/ライトテーマの切り替え
- **クロスプラットフォーム**：macOS と Windows で動作

## スクリーンショット

<div align="center">

<img src="images/zh/image1.png" alt="メインインターフェース" width="45%" style="margin: 5px;">
<img src="images/zh/image2.png" alt="ファイルタイプ統計" width="45%" style="margin: 5px;">

<img src="images/zh/image3.png" alt="ディレクトリ構造" width="45%" style="margin: 5px;">
<img src="images/zh/image4.png" alt="ダークモード" width="45%" style="margin: 5px;">

<img src="images/zh/image5.png" alt="多言語サポート" width="45%" style="margin: 5px;">
<img src="images/zh/image6.png" alt="高度な分析" width="45%" style="margin: 5px;">

</div>

## ライセンス

このプロジェクトはオープンソースであり、AGPL-3.0 ライセンスの下で利用可能です。

## コントリビューション

- コントリビューションを歓迎します！プルリクエストをお気軽に送信してください。
  <a href="https://github.com/exptechtw/StorViz/graphs/contributors"><img src="https://contrib.rocks/image?repo=exptechtw/StorViz" ></a>
