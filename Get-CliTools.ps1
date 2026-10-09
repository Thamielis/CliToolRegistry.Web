
$CliToolsPath = "$HOME/GitHub/CliToolRegistry/src/CliToolRegistry/Data/Tools"

$CliTools = [System.Collections.Generic.Dictionary[string, object]]::new()

Get-ChildItem -Path $CliToolsPath | ForEach-Object {
    $Name = $_.BaseName
    $Tools = Import-StructuredDataFile -Path $_.FullName -DataType Yaml
    $null = $CliTools.TryAdd($Name, $Tools)
}


#TODO: Per Function und Command mit Args für allgemeine Ausführung per Tool erstellen.

#region    br
br robot-docs --json guide >~/GitHub/CliToolRegistry.Web/public/robot-docs/br.robot-docs.json
#endregion br

#region    bv
bv --robot-docs all >~/GitHub/CliToolRegistry.Web/public/robot-docs/bv.robot-docs.json
#endregion bv

#region    cass
cass capabilities --json >~/GitHub/CliToolRegistry.Web/public/robot-docs/cass.capabilities.json


$Topics = @(
    'commands'
    'env'
    'paths'
    'schemas'
    'guide'
    'exit-codes'
    'examples'
    'contracts'
    'wrap'
    'sources'
    'analytics'
    'doctor'
    'recipes'
)

cass robot-docs commands --robot-format json >~/GitHub/CliToolRegistry.Web/public/robot-docs/cass.commands.robot-docs.json
#endregion cass
