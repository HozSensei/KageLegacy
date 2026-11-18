param(
  [Parameter(Mandatory = $true)]
  [string]$AssetsDirectory
)

Add-Type -AssemblyName System.Drawing

# Découpe les 44 cases utiles des grilles et génère les assets JPEG qualité 92.
$cards = @(
  'gravure-des-phalanges',
  'danse-du-genou-brise',
  'rafale-de-l-epervier',
  'pas-du-silex',
  'chasse-nerfs',
  'frappe-en-cascade',
  'serment-des-cent-coups',
  'elan-sans-retour',
  'poing-du-sol-rouge',
  'derniere-enjambee',
  'orbe-du-tonnerre-blanc',
  'brasier-suspendu',
  'lance-des-marees',
  'avalanche-interieure',
  'jugement-des-quatre-vents',
  'detonation-du-voile',
  'murmure-des-doubles',
  'prison-du-reflet',
  'brouillard-de-souvenance',
  'oeil-du-crepuscule',
  'labyrinthe-immobile',
  'echo-de-l-absence',
  'voile-des-faux-pas',
  'presage-inverse',
  'nuit-sans-horizon',
  'mirages-croises',
  'pacte-des-ombres-fines',
  'silence-du-temoin',
  'souffle-de-sauge',
  'suture-du-lotus',
  'elixir-de-l-aube',
  'compresse-des-sources',
  'baume-de-cendre',
  'rituel-du-pouls-calme',
  'infusion-des-trois-racines',
  'remede-du-dernier-souffle',
  'pont-de-regeneration',
  'vigilance-du-guerisseur',
  'lanternes-de-secours',
  'corde-a-eclairs',
  'grimoire-de-poche',
  'molosse-de-cuivre',
  'cigale-de-brume',
  'sceau-du-compagnon-perdu'
)

$grids = @(
  @{ Source = '1-16.png'; Start = 0; Count = 16 },
  @{ Source = '17-32.png'; Start = 16; Count = 16 },
  @{ Source = '33-44.png'; Start = 32; Count = 12 }
)
$destination = Join-Path $PSScriptRoot '..\frontend\src\assets\cards'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  92L
)

foreach ($grid in $grids) {
  $sourcePath = Join-Path $AssetsDirectory $grid.Source
  $image = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
  try {
    $edgesX = @(0, [Math]::Round($image.Width / 4), [Math]::Round($image.Width / 2), [Math]::Round($image.Width * 3 / 4), $image.Width)
    $edgesY = @(0, [Math]::Round($image.Height / 4), [Math]::Round($image.Height / 2), [Math]::Round($image.Height * 3 / 4), $image.Height)
    for ($cell = 0; $cell -lt $grid.Count; $cell++) {
      $index = $grid.Start + $cell
      $column = $cell % 4
      $row = [Math]::Floor($cell / 4)
      $width = [int]($edgesX[$column + 1] - $edgesX[$column])
      $height = [int]($edgesY[$row + 1] - $edgesY[$row])
      $bitmap = New-Object System.Drawing.Bitmap([int]$width, [int]$height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $sourceRect = New-Object System.Drawing.Rectangle($edgesX[$column], $edgesY[$row], $width, $height)
        $destinationRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
        $graphics.DrawImage($image, $destinationRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        $output = Join-Path $destination ($cards[$index] + '.jpg')
        $bitmap.Save($output, $jpegCodec, $encoderParams)
      }
      finally {
        $graphics.Dispose()
        $bitmap.Dispose()
      }
    }
  }
  finally {
    $image.Dispose()
  }
}

Write-Output "Created 44 card illustrations in $destination"
