# StorViz

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Version](https://img.shields.io/badge/version-1.0.0--rc.3-green.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](https://github.com/ExpTechTW/StorViz/releases)
[![Build Status](https://github.com/ExpTechTW/StorViz/workflows/CI%20Build%20Check/badge.svg)](https://github.com/ExpTechTW/StorViz/actions)
[![Stars](https://img.shields.io/github/stars/ExpTechTW/StorViz?style=social)](https://github.com/ExpTechTW/StorViz)

[繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

A modern storage space visualization and analysis tool.

## 📥 Download & Installation

### Quick Download

<div align="center">

[![Download for macOS](https://img.shields.io/badge/Download-macOS-black?style=for-the-badge&logo=apple)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_universal.app.tar.gz)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/ExpTechTW/StorViz/releases/latest/download/StorViz_1.0.0-rc.3_x64-setup.exe)

</div>

### Installation Steps

<div style="margin: 20px 0;">
  <div style="display: flex; border-bottom: 2px solid var(--color-border-default); margin-bottom: 20px;">
    <button onclick="showTab('macos')" id="macos-tab" style="flex: 1; padding: 12px 20px; border: none; background: var(--color-accent-emphasis); color: var(--color-fg-on-emphasis); cursor: pointer; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; margin-right: 5px;">🍎 macOS</button>
    <button onclick="showTab('windows')" id="windows-tab" style="flex: 1; padding: 12px 20px; border: none; background: var(--color-btn-bg); color: var(--color-fg-default); cursor: pointer; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; margin-left: 5px;">🪟 Windows</button>
  </div>
  
  <div id="macos-content" style="display: block; padding: 20px; background: var(--color-canvas-subtle); border-radius: 0 0 8px 8px; border: 1px solid var(--color-border-default);">
    <h4 style="margin-top: 0; color: var(--color-fg-default);">macOS Installation Steps</h4>
    <ol style="line-height: 1.6; color: var(--color-fg-default);">
      <li><strong>Download File</strong>: Click the "Download for macOS" button above to download the <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">.app.tar.gz</code> file</li>
      <li><strong>Extract</strong>: Double-click the downloaded file, macOS will auto-extract it</li>
      <li><strong>Install</strong>: Drag <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">StorViz.app</code> to the Applications folder</li>
      <li><strong>Launch</strong>: Double-click the StorViz icon in Applications to start the app</li>
    </ol>
    <div style="background: var(--color-accent-subtle); padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid var(--color-accent-emphasis);">
      <strong style="color: var(--color-fg-default);">💡 Tip</strong><span style="color: var(--color-fg-muted);">: If you see a "Cannot verify developer" warning, go to "System Preferences" → "Security & Privacy" to allow execution.</span>
    </div>
    
    <h4 style="margin-top: 20px; color: var(--color-fg-default);">macOS System Requirements</h4>
    <ul style="color: var(--color-fg-default);">
      <li><strong>Operating System</strong>: macOS 10.13 or higher</li>
      <li><strong>Processor</strong>: Intel or Apple Silicon (M1/M2)</li>
      <li><strong>Memory</strong>: At least 4GB RAM</li>
      <li><strong>Storage</strong>: At least 100MB available space</li>
    </ul>
  </div>
  
  <div id="windows-content" style="display: none; padding: 20px; background: var(--color-canvas-subtle); border-radius: 0 0 8px 8px; border: 1px solid var(--color-border-default);">
    <h4 style="margin-top: 0; color: var(--color-fg-default);">Windows Installation Steps</h4>
    <ol style="line-height: 1.6; color: var(--color-fg-default);">
      <li><strong>Download File</strong>: Click the "Download for Windows" button above to download the <code style="background: var(--color-neutral-muted); color: var(--color-fg-default); padding: 2px 6px; border-radius: 4px;">.exe</code> installer</li>
      <li><strong>Run Installer</strong>: Double-click the downloaded installer</li>
      <li><strong>Installation Wizard</strong>: Follow the installation wizard instructions</li>
      <li><strong>Launch</strong>: Start StorViz from the Start menu or desktop shortcut</li>
    </ol>
    <div style="background: var(--color-success-subtle); padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid var(--color-success-emphasis);">
      <strong style="color: var(--color-fg-default);">💡 Tip</strong><span style="color: var(--color-fg-muted);">: If Windows Defender shows a warning, select "More info" → "Run anyway".</span>
    </div>
    
    <h4 style="margin-top: 20px; color: var(--color-fg-default);">Windows System Requirements</h4>
    <ul style="color: var(--color-fg-default);">
      <li><strong>Operating System</strong>: Windows 10 or higher</li>
      <li><strong>Architecture</strong>: x64 (64-bit)</li>
      <li><strong>Memory</strong>: At least 4GB RAM</li>
      <li><strong>Storage</strong>: At least 100MB available space</li>
    </ul>
  </div>
</div>

<script>
function showTab(tabName) {
  // Hide all content
  document.getElementById('macos-content').style.display = 'none';
  document.getElementById('windows-content').style.display = 'none';
  
  // Reset all button styles
  document.getElementById('macos-tab').style.background = 'var(--color-btn-bg)';
  document.getElementById('macos-tab').style.color = 'var(--color-fg-default)';
  document.getElementById('windows-tab').style.background = 'var(--color-btn-bg)';
  document.getElementById('windows-tab').style.color = 'var(--color-fg-default)';
  
  // Show selected content
  document.getElementById(tabName + '-content').style.display = 'block';
  
  // Highlight selected button
  document.getElementById(tabName + '-tab').style.background = 'var(--color-accent-emphasis)';
  document.getElementById(tabName + '-tab').style.color = 'var(--color-fg-on-emphasis)';
}
</script>

## Features

- **Visual Storage Analysis**: Intuitive visualization of disk space usage with interactive charts
- **Fast Scanning**: High-performance directory scanning using Rust backend with parallel processing
- **File Type Statistics**: Detailed breakdown of storage by file types and extensions
- **Multi-language Support**: Available in English, Traditional Chinese, and Japanese
- **Dark Mode**: Beautiful dark/light theme support
- **Cross-platform**: Works on macOS and Windows

## Screenshots

<div align="center">

<img src="images/zh/image1.png" alt="Main Interface" width="45%" style="margin: 5px;">
<img src="images/zh/image2.png" alt="File Type Statistics" width="45%" style="margin: 5px;">

<img src="images/zh/image3.png" alt="Directory Structure" width="45%" style="margin: 5px;">
<img src="images/zh/image4.png" alt="Dark Mode" width="45%" style="margin: 5px;">

<img src="images/zh/image5.png" alt="Multi-language Support" width="45%" style="margin: 5px;">
<img src="images/zh/image6.png" alt="Advanced Analysis" width="45%" style="margin: 5px;">

</div>

## License

This project is open source and available under the AGPL-3.0 License.

## Contributing

- Contributions are welcome! Please feel free to submit a Pull Request.
  <a href="https://github.com/exptechtw/StorViz/graphs/contributors"><img src="https://contrib.rocks/image?repo=exptechtw/StorViz" ></a>
