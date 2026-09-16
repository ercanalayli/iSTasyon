Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$form = New-Object System.Windows.Forms.Form
$form.Text = 'ApeirON Harmless GUI Test'
$form.Width = 420
$form.Height = 180
$form.StartPosition = 'CenterScreen'
$field = New-Object System.Windows.Forms.TextBox
$field.Left = 20
$field.Top = 20
$field.Width = 360
$button = New-Object System.Windows.Forms.Button
$button.Text = 'Test Click'
$button.Left = 20
$button.Top = 60
$button.Width = 120
$label = New-Object System.Windows.Forms.Label
$label.Text = 'Waiting'
$label.Left = 160
$label.Top = 65
$label.Width = 200
$button.Add_Click({ $label.Text = 'Clicked' })
$form.Controls.AddRange(@($field,$button,$label))
[System.Windows.Forms.Application]::Run($form)
