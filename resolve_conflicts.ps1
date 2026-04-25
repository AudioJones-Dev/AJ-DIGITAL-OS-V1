Set-Location 'C:\dev\AJ-DIGITAL-OS'
$files = @('src/cli.ts','src/commands/index.ts','src/hermes/hermes-status-api.ts','dashboard/lib/types.ts')
foreach ($f in $files) {
    $content = Get-Content $f -Raw
    $content = $content -replace '(?m)^<<<<<<< [^\r\n]*\r?\n', ''
    $content = $content -replace '(?m)^=======\r?\n', ''
    $content = $content -replace '(?m)^>>>>>>> [^\r\n]*\r?\n', ''
    Set-Content $f $content -NoNewline
    Write-Host "Resolved: $f"
}
Write-Host "Done"
