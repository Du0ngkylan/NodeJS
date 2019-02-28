{
  "targets": [
    {
      "target_name": "GoyoNativeUI",
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
      "target_name": "GoyoPrinting",
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
      "target_name": "GoyoColorPicker",
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
