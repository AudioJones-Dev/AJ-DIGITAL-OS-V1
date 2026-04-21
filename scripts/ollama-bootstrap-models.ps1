param(
  [string[]]$Models = @("llama3.1", "mistral", "nomic-embed-text")
)

$ErrorActionPreference = "Stop"

foreach ($model in $Models) {
  Write-Host ("Pulling Ollama model: {0}" -f $model)
  docker exec aj-ollama ollama pull $model
  if ($LASTEXITCODE -ne 0) {
    throw "Failed pulling model: $model"
  }
}

Write-Host "Installed models:"
docker exec aj-ollama ollama list
if ($LASTEXITCODE -ne 0) {
  throw "Failed listing installed Ollama models."
}
