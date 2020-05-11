{
  "targets": [
    {
      "type": "executable",
      "target_name": "accessor",
      "include_dirs": [
        "lib/json11",
        "include"
      ],
      "sources": [
        "lib/json11/json11.cpp",
        "sources/accessor_main.cc",
        "sources/command/accessor_command_factory.cc",
        "sources/command/accessor_command.cc",
        "sources/util/sms_app_util.cc",
        "sources/except/sms_exception.cc",
        "sources/util/sms_log.cc",
        "sources/command/stub/stub_command.cc",
        "sources/command/school/get_schools.cc"
      ],
      "libraries": [
        # sms lib
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": [
            "/execution-charset:utf-8",
            "/source-charset:utf-8",
            "/EHsc",
            "/GR"
          ]
          # 'DisableSpecificWarnings': [ '4355', '4530' ,'4267', '4244' ],
        },
        "VCLinkerTool": {
          "AdditionalOptions": [ '/ignore:4099' ]
        }
      },    
      'defines': [
        "_UNICODE",
        "UNICODE"
      ],
      'link_settings': {
        'library_dirs': [
          #'<!(node -e "console.log(require(`boost-1_66`).libraryPath)")'          
        ]
      }
    }
  ]
}
