# Fija el icono de los archivos .dior en Windows para la PWA instalada con Chrome/Edge.
#
# Por que existe: Chrome (verificado en 157) NO usa file_handlers[].icons del manifest.
# Registra .dior con DefaultIcon = ",0" (vacio) y el Explorador pinta un icono generico.
# Este script escribe el DefaultIcon a mano en HKCU (solo el usuario actual, sin admin).
#
# Uso (PowerShell, desde esta carpeta):
#   .\set-windows-file-icon.ps1          -> solo informa, no toca nada
#   .\set-windows-file-icon.ps1 -Apply   -> genera el .ico y escribe el registro
#
# Chrome vuelve a escribir DefaultIcon al reinstalar o actualizar la PWA: repetir -Apply.
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$icons = Join-Path $PSScriptRoot '..\..\public\icons'
$outDir = Join-Path $env:LOCALAPPDATA 'Diorame'
$ico = Join-Path $outDir 'dior-file.ico'

# ICO multi-tamano con PNG incrustados (valido desde Windows Vista).
$sizes = 16, 32, 48, 256
$pngs = $sizes | ForEach-Object { , [IO.File]::ReadAllBytes((Join-Path $icons "dior-file-$_.png")) }
$ms = New-Object IO.MemoryStream
$w = New-Object IO.BinaryWriter($ms)
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
	$s = $sizes[$i]; $dim = if ($s -ge 256) { 0 } else { $s }
	$w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
	$w.Write([uint16]1); $w.Write([uint16]32)
	$w.Write([uint32]$pngs[$i].Length); $w.Write([uint32]$offset)
	$offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $w.Write($p) }
$w.Flush()
$bytes = $ms.ToArray()

$targets = Get-ChildItem 'HKCU:\Software\Classes' | Where-Object {
	$_.PSChildName -like 'Chrome.*' -or $_.PSChildName -like 'MSEdge*.*' } | Where-Object {
	(Get-ItemProperty $_.PSPath).FileExtensions -eq '.dior' }

if (-not $targets) { Write-Host 'No hay ProgId de la PWA para .dior: instala la PWA primero.'; exit 1 }
foreach ($t in $targets) {
	$cur = (Get-ItemProperty (Join-Path $t.PSPath 'DefaultIcon')).'(default)'
	Write-Host "ProgId $($t.PSChildName): DefaultIcon actual = [$cur]  ->  nuevo = [$ico,0]"
}
Write-Host "ICO ($($bytes.Length) bytes) ira a: $ico"
if (-not $Apply) { Write-Host 'Modo informe: anade -Apply para aplicar.'; exit 0 }

New-Item -ItemType Directory -Force $outDir | Out-Null
[IO.File]::WriteAllBytes($ico, $bytes)
foreach ($t in $targets) {
	Set-ItemProperty -Path (Join-Path $t.PSPath 'DefaultIcon') -Name '(default)' -Value "$ico,0"
}
& "$env:SystemRoot\System32\ie4uinit.exe" -show
Write-Host 'Hecho. Si el Explorador no lo refleja, reiniciala (Administrador de tareas).'
