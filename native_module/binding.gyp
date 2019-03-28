{
  "targets": [
    {
      "target_name": "NativeUI",
      "sources": [
        "./font_dialog/font_dialog.cc",
      ],
      'defines': [
          "_UNICODE",
          "UNICODE"
        ],
      "include_dirs": [
        "include"
      ]
    },
    {
      "target_name": "Printing",
      "sources": [
        "./printing/printing.cc",
      ],
      'defines': [
          "_UNICODE",
          "UNICODE"
        ],
      "include_dirs": [
      ]
    },
        {
      "target_name": "ColorPicker",
      "sources": [
        "./color_picker_dialog/color_picker_dialog.cc",
      ],
      'defines': [
          "_UNICODE",
          "UNICODE"
        ],
      "include_dirs": [
      ]
    }
  ]
}
