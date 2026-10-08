
$CliToolsPath = "$HOME/GitHub/CliToolRegistry/src/CliToolRegistry/Data/Tools"

$CliTools = [System.Collections.Generic.Dictionary[string, object]]::new()

Get-ChildItem -Path $CliToolsPath | ForEach-Object { 
    $Name = $_.BaseName 
    $Tools = Import-StructuredDataFile -Path $_.FullName -DataType Yaml 
    $null = $CliTools.TryAdd($Name, $Tools) 
}

