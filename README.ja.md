# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

<p align="center">
  <strong>モダンなストレージ容量視覚化・分析ツール</strong>
</p>

<p align="center">
  <a href="README.md">繁體中文</a> | <a href="README.en.md">English</a> | <a href="README.ja.md">日本語</a>
</p>

---

StorViz は、ストレージの使用状況を素早く把握できる強力なディスク容量分析ツールです。直感的なビジュアルインターフェースで、容量を占めているファイルやフォルダを簡単に特定し、ストレージ管理を最適化できます。

## 📥 ダウンロードとインストール

### クイックダウンロード

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-orange?style=for-the-badge&logo=linux)](https://github.com/ExpTechTW/StorViz/releases/latest/download/storviz_1.0.0-rc.3_amd64.AppImage)

</div>

### インストール手順

<details>
<summary>🍎 macOS - インストール手順を表示</summary>

<br>

1. **ファイルダウンロード** - 上のボタンをクリックして `.app.tar.gz` ファイルをダウンロード
2. **展開** - ダウンロードしたファイルをダブルクリック、macOS が自動展開
3. **インストール** - `StorViz.app` を Applications フォルダにドラッグ
4. **起動** - Applications で StorViz アイコンをダブルクリックしてアプリを起動

> **💡 ヒント**
> 「開発元を確認できません」の警告が表示された場合、「システム環境設定」→「セキュリティとプライバシー」で実行を許可してください。

</details>

<details>
<summary>🪟 Windows - インストール手順を表示</summary>

<br>

1. **ファイルダウンロード** - 上のボタンをクリックして `.exe` インストーラーをダウンロード
2. **インストーラー実行** - ダウンロードしたインストーラーをダブルクリック
3. **インストールウィザード** - インストールウィザードの指示に従う
4. **起動** - スタートメニューまたはデスクトップショートカットから StorViz を起動

> **💡 ヒント**
> Windows Defender が警告を表示した場合、「詳細情報」→「実行」を選択してください。

</details>

<details>
<summary>🐧 Linux - インストール手順を表示</summary>

<br>

1. **ファイルダウンロード** - 上のボタンをクリックして `.AppImage` ファイルをダウンロード
2. **権限設定** - ターミナルを開いて以下を実行：
   ```bash
   chmod +x storviz_*.AppImage
   ```
3. **実行** - ダブルクリックで実行、またはターミナルで実行：
   ```bash
   ./storviz_*.AppImage
   ```

> **💡 ヒント**
> AppImage はインストール不要で実行できるポータブルアプリケーションです。

</details>

## 📋 サポート対象 OS バージョン

### 🍎 macOS

<details>
<summary>サポート対象バージョンを表示</summary>

<br>

| OS バージョン         | StorViz バージョン | ステータス |
| --------------------- | ------------------ | ---------- |
| **10.12 Sierra 以前** | `-`                | ❌         |
| **10.13 High Sierra** | `-`                | ❔         |
| **10.14 Mojave**      | `-`                | ❔         |
| **10.15 Catalina**    | `-`                | ❔         |
| **11 Big Sur**        | `-`                | ❔         |
| **12 Monterey**       | `-`                | ❔         |
| **13 Ventura**        | `-`                | ❔         |
| **14 Sonoma**         | `-`                | ❔         |
| **15 Sequoia**        | `-`                | ❔         |
| **26 Tahoe**          | `1.0.0-rc.3`       | ✅         |

**アーキテクチャ対応**: Intel (x86_64) / Apple Silicon (ARM64)

</details>

### 🪟 Windows

<details>
<summary>サポート対象バージョンを表示</summary>

<br>

| OS バージョン | StorViz バージョン | ステータス |
| ------------- | ------------------ | ---------- |
| **XP**        | `-`                | ❌         |
| **Vista**     | `-`                | ❌         |
| **7**         | `-`                | ❔         |
| **7 SP1**     | `-`                | ❔         |
| **8**         | `-`                | ❔         |
| **8.1**       | `-`                | ❔         |
| **10**        | `1.0.0-rc.3`       | ✅         |
| **11**        | `1.0.0-rc.3`       | ✅         |

**アーキテクチャ対応**: x64 (64-bit)
**追加要件**: WebView2 ランタイム（インストーラーが自動的にインストール）

</details>

### 🐧 Linux

<details>
<summary>サポート対象バージョンを表示</summary>

<br>

**Ubuntu**

| OS バージョン        | StorViz バージョン | ステータス |
| -------------------- | ------------------ | ---------- |
| **18.04 LTS Bionic** | `-`                | ❌         |
| **20.04 LTS Focal**  | `-`                | ❌         |
| **22.04 LTS Jammy**  | `1.0.0-rc.3`       | ✅         |
| **23.10 Mantic**     | `1.0.0-rc.3`       | ✅         |
| **24.04 LTS Noble**  | `1.0.0-rc.3`       | ✅         |
| **24.10 Oracular**   | `1.0.0-rc.3`       | ✅         |

**Debian**

| OS バージョン   | StorViz バージョン | ステータス |
| --------------- | ------------------ | ---------- |
| **10 Buster**   | `-`                | ❌         |
| **11 Bullseye** | `-`                | ❌         |
| **12 Bookworm** | `1.0.0-rc.3`       | ✅         |
| **13 Trixie**   | `1.0.0-rc.3`       | ✅         |

**Fedora**

| OS バージョン | StorViz バージョン | ステータス |
| ------------- | ------------------ | ---------- |
| **34**        | `-`                | ❌         |
| **35**        | `-`                | ❌         |
| **36**        | `-`                | ❔         |
| **37+**       | `-`                | ❔         |

**RHEL / Rocky Linux / AlmaLinux**

| OS バージョン | StorViz バージョン | ステータス |
| ------------- | ------------------ | ---------- |
| **7**         | `-`                | ❌         |
| **8**         | `-`                | ❌         |
| **9**         | `-`                | ❔         |

**Arch Linux**

| OS バージョン          | StorViz バージョン | ステータス |
| ---------------------- | ------------------ | ---------- |
| **ローリングリリース** | `-`                | ❌         |

**アーキテクチャ対応**: x64 (64-bit)
**追加要件**: GLib >= 2.70, WebKitGTK 4.1

> **⚠️ 注意**
>
> Linux 版は新しいシステムライブラリが必要です（GLIBC 2.35+）。
> Ubuntu 20.04 と Debian 11 のユーザーは、新しいバージョンへのアップグレードを推奨します。

</details>

## ✨ 主な機能

- 📊 **ビジュアルストレージ分析**：インタラクティブなチャートによる直感的なディスク使用状況の可視化
- ⚡ **高速スキャン**：並列処理を使用した Rust バックエンドによる高性能なディレクトリスキャン
- 📁 **ファイルタイプ統計**：ファイルタイプと拡張子による詳細なストレージ分析
- 🌍 **多言語対応**：英語、繁体字中国語、日本語に対応
- 🌓 **ダークモード**：美しいダーク/ライトテーマの切り替え
- 💻 **クロスプラットフォーム**：macOS、Windows、Linux で動作

## 📸 スクリーンショット

<div align="center">

<table>
  <tr>
    <td width="50%">
      <img src="images/zh/image1.png" alt="メインインターフェース" />
    </td>
    <td width="50%">
      <img src="images/zh/image2.png" alt="ファイルタイプ統計" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image3.png" alt="ディレクトリ構造" />
    </td>
    <td width="50%">
      <img src="images/zh/image4.png" alt="ダークモード" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="images/zh/image5.png" alt="多言語サポート" />
    </td>
    <td width="50%">
      <img src="images/zh/image6.png" alt="高度な分析" />
    </td>
  </tr>
</table>

</div>

## 📄 ライセンス

このプロジェクトはオープンソースであり、[AGPL-3.0](LICENSE) ライセンスの下で利用可能です。

## 🤝 コントリビューション

コントリビューションを歓迎します！このプロジェクトに貢献したい方は、プルリクエストの送信または Issue の作成をお気軽にどうぞ。

### コントリビューター

このプロジェクトに貢献してくださったすべての開発者に感謝します！

<a href="https://github.com/exptechtw/StorViz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=exptechtw/StorViz" alt="Contributors" />
</a>

---

<p align="center">
  このプロジェクトがお役に立ちましたら、⭐️ Star をお願いします！
</p>
