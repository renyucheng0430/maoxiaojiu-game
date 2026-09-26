# AI 生成 3D 风格道具素材（轮询版：首请求触发生成，反复拉取直到非占位图）
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$proj = 'e:\猫小九\Game'
$outDir = Join-Path $proj 'assets\images\props'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# 先还原被占位图污染的 props-data.js
$dataFile = Join-Path $proj 'assets\data\props-data.js'
if (Test-Path "$dataFile.bak") { Copy-Item "$dataFile.bak" $dataFile -Force }

$placeholderMd5 = '19A0B822EDB11957055E4588C2159058'   # 1024版“生成中”占位图
$processedPlaceholderMd5 = 'CBAF4A0307E1C31ED3F781047BD84AEB'  # 512版占位图（兜底校验）

$props = @(
  @{ name='sakura'; prompt='3D卡通渲染风格的樱花树游戏素材，深粉红色茂密樱花花冠，几片桃红色花瓣飘落在空中，棕色木质树干纹理清晰，日式漫画场景，孤立于纯白色背景，无投影无地面无阴影，边缘轮廓清晰，细节丰富高质量' },
  @{ name='pine'; prompt='3D卡通渲染风格的高大常绿松树游戏素材，笔直深棕色树干，层叠茂密的翠绿色树冠，卡通漫画场景，孤立于纯白色背景，无投影无地面无阴影，边缘轮廓清晰，细节丰富高质量' },
  @{ name='bush'; prompt='3D卡通渲染风格的圆润灌木丛游戏素材，茂密翠绿色叶子，点缀几朵粉红色小花，卡通漫画场景，孤立于纯白色背景，无投影无地面无阴影，边缘轮廓清晰，细节丰富高质量' },
  @{ name='rock'; prompt='3D卡通渲染风格的青灰色巨石游戏素材，圆润岩石造型带少许绿色青苔点缀，卡通漫画场景，孤立于纯白色背景，无投影无地面无阴影，边缘轮廓清晰，细节丰富高质量' },
  @{ name='stoneLantern'; prompt='3D卡通风格的中式石灯笼游戏素材，灰白色石雕灯台，顶部小屋顶造型，灯室内透出温暖黄色灯光，卡通漫画场景，孤立于纯白色背景，无投影无地面无阴影，边缘轮廓清晰，细节丰富高质量' },
  @{ name='catStatue'; prompt='3D卡通风格的猫形石雕柱游戏素材，灰白色石材柱子顶端有猫耳朵剪影造型，可爱猫脸浮雕，中式部落风格，卡通漫画场景，孤立于纯白色背景，无投影无地面无阴影，边缘轮廓清晰，细节丰富高质量' }
)

# 阶段1：逐个触发一次生成任务（不要频繁重复请求，否则任务被重置）
foreach ($p in $props) {
  $url = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=' + [uri]::EscapeDataString($p.prompt) + '&image_size=square_hd'
  try { Invoke-WebRequest -Uri $url -OutFile (Join-Path $env:TEMP ($p.name + '_raw.png')) -TimeoutSec 120 } catch {}
  Write-Host ">>> 已触发 $($p.name)"
}

# 阶段2：每75秒查一轮，最多12轮
$done = @{}
for ($round = 1; $round -le 12 -and $done.Count -lt $props.Count; $round++) {
  Start-Sleep -Seconds 75
  foreach ($p in $props) {
    if ($done.ContainsKey($p.name)) { continue }
    $url = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=' + [uri]::EscapeDataString($p.prompt) + '&image_size=square_hd'
    $raw = Join-Path $env:TEMP ($p.name + '_raw.png')
    try {
      Invoke-WebRequest -Uri $url -OutFile $raw -TimeoutSec 120
      $h = (Get-FileHash $raw -Algorithm MD5).Hash
      if ($h -ne $placeholderMd5 -and (Get-Item $raw).Length -gt 60000) { $done[$p.name] = $true; Write-Host "    [$round] $($p.name) 成图!" }
      else { Write-Host "    [$round] $($p.name) 生成中" }
    } catch { Write-Host "    [$round] $($p.name) 请求异常" }
  }
}

$entries = @()
foreach ($p in $props) {
  if (-not $done.ContainsKey($p.name)) { Write-Host "!! $($p.name) 超时"; continue }
  $raw = Join-Path $env:TEMP ($p.name + '_raw.png')
  $src = [System.Drawing.Image]::FromFile($raw)
  $S = 512
  $bmp = New-Object System.Drawing.Bitmap($S, $S)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $S, $S)
  $g.Dispose(); $src.Dispose()

  $outPath = Join-Path $outDir ($p.name + '.png')
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()

  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($outPath))
  $entries += "  $($p.name): 'data:image/png;base64,$b64',"
}

if ($entries.Count -gt 0) {
  $text = [IO.File]::ReadAllText($dataFile, [Text.Encoding]::UTF8)
  $idx = $text.LastIndexOf('};')
  if ($idx -lt 0) { throw 'props-data.js 中未找到结尾 };' }
  $insert = "`r`n  // ---- AI 生成的 3D 风格道具（透明底，白底已抠除） ----`r`n" + ($entries -join "`r`n") + "`r`n"
  $newText = $text.Substring(0, $idx).TrimEnd() + "`r`n" + $insert + '};' + "`r`n"
  [IO.File]::WriteAllText($dataFile, $newText, (New-Object Text.UTF8Encoding($false)))
  Write-Host ">>> props-data.js 已更新（新增 $($entries.Count) 条）"
} else {
  Write-Host '>>> 没有成功素材，props-data.js 未改动'
}
