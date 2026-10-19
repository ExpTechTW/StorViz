import {
  Folder,
  FileVideo,
  Archive,
  FileCode,
  Globe,
  FileText,
  Sheet,
  Database,
  Settings,
  Zap,
  File,
  HardDrive,
  Package,
  FileJson,
  FileType,
  Braces,
  Binary,
  Lock,
  FileKey,
  Blocks,
  Palette,
  BookOpen,
  FileSpreadsheet,
  Presentation,
  Mail,
  Server,
  FolderGit2,
  Box,
  Code2,
  Terminal,
  Cpu,
  Container,
  GitBranch,
  Workflow,
  Package2,
  PackageOpen,
  FileStack,
  Puzzle,
  Shapes,
  Pen,
  Image,
  Camera,
  Video,
  Music2,
  Mic,
  Film,
  Volume2,
  type LucideIcon
} from 'lucide-react'

export interface FileTypeInfo {
  icon: LucideIcon
  label: string
  color: string
}

const DIRECTORY_TYPES = new Map<string, FileTypeInfo>()
const NAME_TYPES = new Map<string, FileTypeInfo>()
const EXTENSION_TYPES = new Map<string, FileTypeInfo>()

function addTypes(map: Map<string, FileTypeInfo>, keys: readonly string[], value: FileTypeInfo) {
  for (const key of keys) {
    if (!map.has(key)) map.set(key, value)
  }
}

addTypes(DIRECTORY_TYPES, ['.git'], { icon: FolderGit2, label: 'Git Repository', color: '#f05033' })
addTypes(DIRECTORY_TYPES, ['node_modules', 'vendor', 'packages', 'bower_components', '.venv', 'venv', '__pycache__'], { icon: Box, label: 'Dependencies', color: '#8b5cf6' })
addTypes(DIRECTORY_TYPES, ['.vscode', '.idea', '.vs'], { icon: Settings, label: 'IDE Config', color: '#0078d7' })
addTypes(DIRECTORY_TYPES, ['.github', '.gitlab', '.circleci'], { icon: Workflow, label: 'CI/CD', color: '#2088ff' })
addTypes(DIRECTORY_TYPES, ['dist', 'build', 'out', 'target', 'bin'], { icon: Package2, label: 'Build Output', color: '#f59e0b' })
addTypes(DIRECTORY_TYPES, ['src', 'source', 'app', 'lib', 'components'], { icon: Code2, label: 'Source', color: '#3b82f6' })
addTypes(DIRECTORY_TYPES, ['test', 'tests', '__tests__', 'spec', 'specs'], { icon: FileStack, label: 'Tests', color: '#10b981' })
addTypes(DIRECTORY_TYPES, ['docs', 'doc', 'documentation'], { icon: BookOpen, label: 'Documentation', color: '#6366f1' })
addTypes(DIRECTORY_TYPES, ['assets', 'static', 'public', 'resources'], { icon: Image, label: 'Assets', color: '#ec4899' })

addTypes(NAME_TYPES, ['dockerfile', 'containerfile'], { icon: Container, label: 'Docker', color: '#2496ed' })
addTypes(NAME_TYPES, ['makefile', 'rakefile', 'gemfile', 'podfile', 'vagrantfile', 'gruntfile', 'gulpfile'], { icon: Settings, label: 'Build Config', color: '#2496ed' })
addTypes(NAME_TYPES, ['license', 'licence', 'readme', 'changelog', 'contributing', 'authors', 'notice'], { icon: FileText, label: 'Documentation', color: '#6b7280' })
addTypes(NAME_TYPES, ['.gitignore', '.dockerignore', '.npmignore', '.eslintignore', '.prettierignore'], { icon: GitBranch, label: 'Ignore File', color: '#6b7280' })
addTypes(NAME_TYPES, ['.env', '.env.local', '.env.development', '.env.production', '.env.test'], { icon: Lock, label: 'Environment', color: '#eab308' })
addTypes(NAME_TYPES, ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'], { icon: Package, label: 'Package Config', color: '#10b981' })
addTypes(NAME_TYPES, ['tsconfig.json', 'jsconfig.json'], { icon: Settings, label: 'TS Config', color: '#3178c6' })
addTypes(NAME_TYPES, ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.prettierrc'], { icon: Settings, label: 'Linter Config', color: '#4b32c3' })
addTypes(NAME_TYPES, ['dockerfile', 'containerfile', '.dockerignore'], { icon: Container, label: 'Docker', color: '#2496ed' })

addTypes(EXTENSION_TYPES, ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'bmp', 'dib', 'webp', 'ico', 'cur', 'tiff', 'tif', 'ppm', 'pgm', 'pbm', 'pnm'], { icon: Image, label: 'Image', color: '#f472b6' })
addTypes(EXTENSION_TYPES, ['svg', 'svgz', 'ai', 'eps', 'ps', 'cdr', 'cgm', 'wmf', 'emf'], { icon: Pen, label: 'Vector', color: '#ec4899' })
addTypes(EXTENSION_TYPES, ['psd', 'psb', 'xcf', 'kra', 'sketch', 'xd', 'fig', 'figma', 'afdesign', 'afphoto', 'clip'], { icon: Palette, label: 'Design', color: '#ec4899' })
addTypes(EXTENSION_TYPES, ['raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'pef', 'raf', 'dcr', 'mrw', 'nrw', 'rwl', 'srw', 'x3f'], { icon: Camera, label: 'RAW Image', color: '#f59e0b' })
addTypes(EXTENSION_TYPES, ['mp4', 'm4v', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpg', 'mpeg', 'mpe', 'mpv', 'm2v', '3gp', '3g2', 'ogv', 'ogg', 'vob', 'divx'], { icon: Video, label: 'Video', color: '#8b5cf6' })
addTypes(EXTENSION_TYPES, ['mxf', 'ts', 'm2ts', 'mts', 'f4v', 'swf', 'rm', 'rmvb', 'asf', 'qt', 'yuv', 'y4m', 'amv'], { icon: FileVideo, label: 'Video', color: '#8b5cf6' })
addTypes(EXTENSION_TYPES, ['prproj', 'aep', 'veg', 'fcpx', 'motn', 'imovieproj', 'davinci'], { icon: Film, label: 'Video Project', color: '#7c3aed' })
addTypes(EXTENSION_TYPES, ['flac', 'ape', 'alac', 'wav', 'aiff', 'aif', 'aifc', 'au', 'snd', 'pcm', 'dsd', 'dsf', 'dff'], { icon: Volume2, label: 'Audio', color: '#a855f7' })
addTypes(EXTENSION_TYPES, ['mp3', 'aac', 'm4a', 'ogg', 'oga', 'opus', 'wma', 'mka', 'ra', 'ram', 'voc', 'amr', 'awb'], { icon: Music2, label: 'Audio', color: '#a855f7' })
addTypes(EXTENSION_TYPES, ['mid', 'midi', 'kar', 'rmi', 'mus', 'syx'], { icon: Music2, label: 'MIDI', color: '#c084fc' })
addTypes(EXTENSION_TYPES, ['flp', 'als', 'ptx', 'logic', 'band', 'reason', 'cpr', 'cwp', 'sesx', 'aup', 'aup3'], { icon: Mic, label: 'Audio Project', color: '#9333ea' })
addTypes(EXTENSION_TYPES, ['zip', 'rar', '7z', 'tar', 'gz', 'gzip', 'bz2', 'bzip2', 'xz', 'lz', 'lzma', 'z', 'tgz', 'tbz', 'tbz2', 'txz', 'tlz'], { icon: Archive, label: 'Archive', color: '#f59e0b' })
addTypes(EXTENSION_TYPES, ['iso', 'img', 'dmg', 'toast', 'vcd', 'cue', 'bin', 'mdf', 'mds', 'nrg', 'cdi', 'b5t', 'b6t', 'bwt', 'ccd', 'isz', 'uif'], { icon: HardDrive, label: 'Disk Image', color: '#fb923c' })
addTypes(EXTENSION_TYPES, ['pkg', 'deb', 'rpm', 'apk', 'msi', 'msix', 'appx', 'snap', 'flatpak', 'appimage'], { icon: PackageOpen, label: 'Package', color: '#f59e0b' })
addTypes(EXTENSION_TYPES, ['cab', 'arj', 'lzh', 'ace', 'zoo', 'arc', 'pak', 'sit', 'sitx', 'sea', 'uue', 'uu'], { icon: Archive, label: 'Archive', color: '#f59e0b' })
addTypes(EXTENSION_TYPES, ['js', 'jsx', 'mjs', 'cjs', 'es6', 'es'], { icon: FileCode, label: 'JavaScript', color: '#f7df1e' })
addTypes(EXTENSION_TYPES, ['ts', 'tsx', 'mts', 'cts'], { icon: FileCode, label: 'TypeScript', color: '#3178c6' })
addTypes(EXTENSION_TYPES, ['vue', 'svelte', 'astro'], { icon: Puzzle, label: 'Component', color: '#42b883' })
addTypes(EXTENSION_TYPES, ['html', 'htm', 'xhtml', 'shtml', 'dhtml', 'hta'], { icon: Globe, label: 'HTML', color: '#e34c26' })
addTypes(EXTENSION_TYPES, ['css', 'scss', 'sass', 'less', 'styl', 'stylus', 'pcss', 'postcss'], { icon: Palette, label: 'Stylesheet', color: '#264de4' })
addTypes(EXTENSION_TYPES, ['wasm', 'wat'], { icon: Cpu, label: 'WebAssembly', color: '#654ff0' })
addTypes(EXTENSION_TYPES, ['py', 'pyw', 'pyx', 'pyd', 'pyi', 'pyc', 'pyo', 'pyz', 'pyzw'], { icon: FileCode, label: 'Python', color: '#3776ab' })
addTypes(EXTENSION_TYPES, ['ipynb', 'jupyter'], { icon: FileStack, label: 'Jupyter', color: '#f37726' })
addTypes(EXTENSION_TYPES, ['java', 'jsp', 'jspx'], { icon: FileCode, label: 'Java', color: '#f89820' })
addTypes(EXTENSION_TYPES, ['class', 'jar', 'war', 'ear', 'jad'], { icon: Archive, label: 'Java Binary', color: '#f89820' })
addTypes(EXTENSION_TYPES, ['kt', 'kts', 'ktm'], { icon: FileCode, label: 'Kotlin', color: '#7f52ff' })
addTypes(EXTENSION_TYPES, ['scala', 'sc'], { icon: FileCode, label: 'Scala', color: '#dc322f' })
addTypes(EXTENSION_TYPES, ['groovy', 'gvy', 'gradle'], { icon: FileCode, label: 'Groovy', color: '#4298b8' })
addTypes(EXTENSION_TYPES, ['c', 'h', 'i'], { icon: FileCode, label: 'C', color: '#555555' })
addTypes(EXTENSION_TYPES, ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'ii', 'ipp', 'tcc', 'tpp'], { icon: FileCode, label: 'C++', color: '#f34b7d' })
addTypes(EXTENSION_TYPES, ['m', 'mm'], { icon: FileCode, label: 'Objective-C', color: '#438eff' })
addTypes(EXTENSION_TYPES, ['cs', 'csx', 'cshtml', 'razor'], { icon: FileCode, label: 'C#', color: '#239120' })
addTypes(EXTENSION_TYPES, ['vb', 'vbs', 'vba', 'bas'], { icon: FileCode, label: 'Visual Basic', color: '#945db7' })
addTypes(EXTENSION_TYPES, ['fs', 'fsi', 'fsx', 'fsscript'], { icon: FileCode, label: 'F#', color: '#b845fc' })
addTypes(EXTENSION_TYPES, ['dll', 'pdb', 'winmd'], { icon: Binary, label: '.NET Binary', color: '#512bd4' })
addTypes(EXTENSION_TYPES, ['rs', 'rlib'], { icon: FileCode, label: 'Rust', color: '#ce422b' })
addTypes(EXTENSION_TYPES, ['go', 'mod', 'sum'], { icon: FileCode, label: 'Go', color: '#00add8' })
addTypes(EXTENSION_TYPES, ['zig'], { icon: FileCode, label: 'Zig', color: '#f7a41d' })
addTypes(EXTENSION_TYPES, ['v'], { icon: FileCode, label: 'V', color: '#5d87bd' })
addTypes(EXTENSION_TYPES, ['nim', 'nims', 'nimble'], { icon: FileCode, label: 'Nim', color: '#ffe953' })
addTypes(EXTENSION_TYPES, ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'phar'], { icon: FileCode, label: 'PHP', color: '#777bb4' })
addTypes(EXTENSION_TYPES, ['rb', 'rbw', 'rake', 'erb', 'gemspec', 'ru'], { icon: FileCode, label: 'Ruby', color: '#cc342d' })
addTypes(EXTENSION_TYPES, ['pl', 'pm', 'pod', 'perl'], { icon: FileCode, label: 'Perl', color: '#0298c3' })
addTypes(EXTENSION_TYPES, ['lua'], { icon: FileCode, label: 'Lua', color: '#000080' })
addTypes(EXTENSION_TYPES, ['r', 'rdata', 'rds', 'rmd'], { icon: FileCode, label: 'R', color: '#198ce7' })
addTypes(EXTENSION_TYPES, ['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh'], { icon: Terminal, label: 'Shell', color: '#4eaa25' })
addTypes(EXTENSION_TYPES, ['bat', 'cmd', 'btm'], { icon: Terminal, label: 'Batch', color: '#c1f12e' })
addTypes(EXTENSION_TYPES, ['ps1', 'psm1', 'psd1', 'ps1xml'], { icon: Terminal, label: 'PowerShell', color: '#012456' })
addTypes(EXTENSION_TYPES, ['hs', 'lhs'], { icon: FileCode, label: 'Haskell', color: '#5e5086' })
addTypes(EXTENSION_TYPES, ['ml', 'mli', 'mll', 'mly'], { icon: FileCode, label: 'OCaml', color: '#3be133' })
addTypes(EXTENSION_TYPES, ['ex', 'exs', 'eex', 'leex'], { icon: FileCode, label: 'Elixir', color: '#6e4a7e' })
addTypes(EXTENSION_TYPES, ['erl', 'hrl'], { icon: FileCode, label: 'Erlang', color: '#b83998' })
addTypes(EXTENSION_TYPES, ['clj', 'cljs', 'cljc', 'edn'], { icon: FileCode, label: 'Clojure', color: '#db5855' })
addTypes(EXTENSION_TYPES, ['lisp', 'lsp', 'l', 'cl', 'el'], { icon: FileCode, label: 'Lisp', color: '#3fb68b' })
addTypes(EXTENSION_TYPES, ['scm', 'ss', 'rkt'], { icon: FileCode, label: 'Scheme', color: '#1e4aec' })
addTypes(EXTENSION_TYPES, ['swift'], { icon: FileCode, label: 'Swift', color: '#f05138' })
addTypes(EXTENSION_TYPES, ['dart'], { icon: FileCode, label: 'Dart', color: '#00b4ab' })
addTypes(EXTENSION_TYPES, ['jl'], { icon: FileCode, label: 'Julia', color: '#9558b2' })
addTypes(EXTENSION_TYPES, ['d', 'di'], { icon: FileCode, label: 'D', color: '#ba595e' })
addTypes(EXTENSION_TYPES, ['pas', 'pp', 'dpr'], { icon: FileCode, label: 'Pascal', color: '#e3f171' })
addTypes(EXTENSION_TYPES, ['f', 'f90', 'f95', 'f03', 'f08', 'for', 'ftn', 'fpp'], { icon: FileCode, label: 'Fortran', color: '#734f96' })
addTypes(EXTENSION_TYPES, ['cob', 'cbl', 'cpy'], { icon: FileCode, label: 'COBOL', color: '#555555' })
addTypes(EXTENSION_TYPES, ['ada', 'adb', 'ads'], { icon: FileCode, label: 'Ada', color: '#02f88c' })
addTypes(EXTENSION_TYPES, ['asm', 's', 'nasm'], { icon: Cpu, label: 'Assembly', color: '#6e4c13' })
addTypes(EXTENSION_TYPES, ['json', 'jsonc', 'json5', 'geojson', 'topojson'], { icon: FileJson, label: 'JSON', color: '#10b981' })
addTypes(EXTENSION_TYPES, ['xml', 'xsl', 'xslt', 'xsd', 'dtd', 'rss', 'atom', 'plist', 'xaml', 'xul', 'xbl'], { icon: Braces, label: 'XML', color: '#f97316' })
addTypes(EXTENSION_TYPES, ['yaml', 'yml'], { icon: FileType, label: 'YAML', color: '#ef4444' })
addTypes(EXTENSION_TYPES, ['toml'], { icon: Settings, label: 'TOML', color: '#9c4221' })
addTypes(EXTENSION_TYPES, ['ini', 'inf', 'conf', 'config', 'cfg', 'properties', 'prop'], { icon: Settings, label: 'Config', color: '#6b7280' })
addTypes(EXTENSION_TYPES, ['csv', 'tsv', 'tab', 'psv'], { icon: Sheet, label: 'Data', color: '#059669' })
addTypes(EXTENSION_TYPES, ['parquet', 'avro', 'orc', 'arrow'], { icon: Database, label: 'Big Data', color: '#0891b2' })
addTypes(EXTENSION_TYPES, ['txt', 'text', 'log', 'out', 'err'], { icon: FileText, label: 'Text', color: '#6b7280' })
addTypes(EXTENSION_TYPES, ['md', 'markdown', 'mdown', 'mkd', 'mdwn', 'mdtxt', 'mdtext', 'mdx'], { icon: BookOpen, label: 'Markdown', color: '#083344' })
addTypes(EXTENSION_TYPES, ['rst', 'rest'], { icon: BookOpen, label: 'reStructuredText', color: '#141414' })
addTypes(EXTENSION_TYPES, ['tex', 'latex', 'ltx', 'bib', 'sty', 'cls'], { icon: FileText, label: 'LaTeX', color: '#008080' })
addTypes(EXTENSION_TYPES, ['adoc', 'asciidoc', 'asc'], { icon: BookOpen, label: 'AsciiDoc', color: '#e40046' })
addTypes(EXTENSION_TYPES, ['org'], { icon: BookOpen, label: 'Org Mode', color: '#77aa99' })
addTypes(EXTENSION_TYPES, ['pdf'], { icon: FileText, label: 'PDF', color: '#dc2626' })
addTypes(EXTENSION_TYPES, ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'ott', 'rtf', 'wps'], { icon: FileText, label: 'Document', color: '#2563eb' })
addTypes(EXTENSION_TYPES, ['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'xltm', 'ods', 'ots', 'numbers'], { icon: FileSpreadsheet, label: 'Spreadsheet', color: '#16a34a' })
addTypes(EXTENSION_TYPES, ['ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'pps', 'ppsx', 'ppsm', 'odp', 'otp', 'key'], { icon: Presentation, label: 'Presentation', color: '#ea580c' })
addTypes(EXTENSION_TYPES, ['epub', 'mobi', 'azw', 'azw3', 'fb2', 'djvu'], { icon: BookOpen, label: 'eBook', color: '#7c3aed' })
addTypes(EXTENSION_TYPES, ['db', 'sqlite', 'sqlite3', 'db3', 's3db', 'sl3'], { icon: Database, label: 'SQLite', color: '#0ea5e9' })
addTypes(EXTENSION_TYPES, ['sql', 'mysql', 'pgsql', 'psql', 'plsql'], { icon: Database, label: 'SQL', color: '#0891b2' })
addTypes(EXTENSION_TYPES, ['mdb', 'accdb', 'accde', 'accdt', 'accdr'], { icon: Database, label: 'Access', color: '#a50e0e' })
addTypes(EXTENSION_TYPES, ['dbf', 'dbc', 'fpt'], { icon: Database, label: 'dBASE', color: '#0369a1' })
addTypes(EXTENSION_TYPES, ['eml', 'msg', 'emlx', 'mbx', 'mbox'], { icon: Mail, label: 'Email', color: '#3b82f6' })
addTypes(EXTENSION_TYPES, ['pst', 'ost', 'olm'], { icon: Mail, label: 'Outlook', color: '#0078d4' })
addTypes(EXTENSION_TYPES, ['vcf', 'vcard'], { icon: Mail, label: 'Contact', color: '#10b981' })
addTypes(EXTENSION_TYPES, ['ics', 'ical', 'ifb', 'icalendar'], { icon: FileText, label: 'Calendar', color: '#f59e0b' })
addTypes(EXTENSION_TYPES, ['exe', 'msi', 'msix', 'appx', 'app', 'run', 'out', 'com'], { icon: Zap, label: 'Executable', color: '#dc2626' })
addTypes(EXTENSION_TYPES, ['so', 'dylib', 'framework', 'lib', 'a', 'o', 'obj', 'ko'], { icon: Binary, label: 'Library', color: '#9333ea' })
addTypes(EXTENSION_TYPES, ['sys', 'drv', 'vxd'], { icon: Binary, label: 'Driver', color: '#7c3aed' })
addTypes(EXTENSION_TYPES, ['bin', 'dat', 'dump', 'core', 'dmp'], { icon: Binary, label: 'Binary', color: '#6b7280' })
addTypes(EXTENSION_TYPES, ['pem', 'crt', 'cer', 'ca-bundle', 'p7b', 'p7c', 'p7s', 'pfx', 'p12', 'der'], { icon: Lock, label: 'Certificate', color: '#15803d' })
addTypes(EXTENSION_TYPES, ['key', 'pub', 'priv', 'private'], { icon: FileKey, label: 'Key', color: '#b91c1c' })
addTypes(EXTENSION_TYPES, ['gpg', 'pgp', 'asc', 'sig', 'sign'], { icon: Lock, label: 'Encryption', color: '#166534' })
addTypes(EXTENSION_TYPES, ['csr', 'crl', 'spc', 'keystore', 'jks', 'truststore'], { icon: Lock, label: 'Security', color: '#15803d' })
addTypes(EXTENSION_TYPES, ['whl', 'egg', 'pyz', 'pex'], { icon: Package, label: 'Python Package', color: '#3776ab' })
addTypes(EXTENSION_TYPES, ['gem', 'gemfile'], { icon: Package, label: 'Ruby Gem', color: '#cc342d' })
addTypes(EXTENSION_TYPES, ['nupkg', 'snupkg'], { icon: Package, label: 'NuGet', color: '#004880' })
addTypes(EXTENSION_TYPES, ['vsix'], { icon: Package, label: 'VS Extension', color: '#68217a' })
addTypes(EXTENSION_TYPES, ['crx', 'xpi'], { icon: Package, label: 'Browser Ext', color: '#4285f4' })
addTypes(EXTENSION_TYPES, ['vmdk', 'vdi', 'vhd', 'vhdx', 'hdd', 'qcow', 'qcow2', 'vbox'], { icon: HardDrive, label: 'Virtual Disk', color: '#7c3aed' })
addTypes(EXTENSION_TYPES, ['ova', 'ovf', 'vbox-extpack', 'vbox-prev'], { icon: Server, label: 'VM', color: '#6366f1' })
addTypes(EXTENSION_TYPES, ['obj', 'mtl', 'fbx', 'dae', 'collada', '3ds', 'max', 'blend', 'blend1', 'ma', 'mb', 'c4d'], { icon: Shapes, label: '3D Model', color: '#f59e0b' })
addTypes(EXTENSION_TYPES, ['gltf', 'glb', 'usdz', 'usda', 'usdc', 'usd'], { icon: Shapes, label: '3D Web', color: '#fb923c' })
addTypes(EXTENSION_TYPES, ['stl', 'ply', 'off', 'x3d', 'wrl', 'vrml'], { icon: Blocks, label: '3D Print', color: '#f97316' })
addTypes(EXTENSION_TYPES, ['dwg', 'dxf', 'dwf', 'dwt'], { icon: Blocks, label: 'AutoCAD', color: '#ef4444' })
addTypes(EXTENSION_TYPES, ['step', 'stp', 'iges', 'igs', 'sat', 'brep'], { icon: Blocks, label: 'CAD', color: '#dc2626' })
addTypes(EXTENSION_TYPES, ['ipt', 'iam', 'idw'], { icon: Blocks, label: 'Inventor', color: '#f87171' })
addTypes(EXTENSION_TYPES, ['prt', 'asm', 'drw', 'sldprt', 'sldasm', 'slddrw'], { icon: Blocks, label: 'SolidWorks', color: '#f43f5e' })
addTypes(EXTENSION_TYPES, ['ttf', 'otf', 'woff', 'woff2', 'eot', 'fon', 'fnt', 'ttc', 'dfont'], { icon: FileType, label: 'Font', color: '#4b5563' })
addTypes(EXTENSION_TYPES, ['unity', 'unitypackage', 'prefab', 'mat', 'asset'], { icon: Puzzle, label: 'Unity', color: '#000000' })
addTypes(EXTENSION_TYPES, ['uasset', 'umap', 'upk'], { icon: Puzzle, label: 'Unreal', color: '#313131' })
addTypes(EXTENSION_TYPES, ['pak', 'vpk', 'wad', 'bsp', 'pk3'], { icon: Archive, label: 'Game Asset', color: '#7c3aed' })
addTypes(EXTENSION_TYPES, ['sol'], { icon: FileCode, label: 'Solidity', color: '#363636' })
addTypes(EXTENSION_TYPES, ['wallet', 'keystore'], { icon: Lock, label: 'Wallet', color: '#f59e0b' })

const FOLDER_TYPE: FileTypeInfo = { icon: Folder, label: 'Folder', color: '#60a5fa' }
const FILE_TYPE: FileTypeInfo = { icon: File, label: 'File', color: '#9ca3af' }

export function getFileTypeInfo(fileName: string, isDirectory: boolean): FileTypeInfo {
  if (isDirectory) {
    return DIRECTORY_TYPES.get(fileName) ?? FOLDER_TYPE
  }

  const fullName = fileName.toLowerCase()
  const named = NAME_TYPES.get(fullName)
  if (named) return named

  const ext = (fileName.split('.').pop() || '').toLowerCase()
  return EXTENSION_TYPES.get(ext) ?? FILE_TYPE
}
