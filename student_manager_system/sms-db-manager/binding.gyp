{
  "targets": [
    {
      "target_name": "sms_db_manager",
      #"type": "static_library",
      "type": "executable",
      "sources": [ 
        "src/internal_db/sqlite3.c",
        "src/internal_db/Backup.cpp",
        "src/internal_db/Transaction.cpp",
        "src/internal_db/Column.cpp",
        "src/internal_db/Database.cpp",
        "src/internal_db/Exception.cpp",
        "src/internal_db/Statement.cpp",
        "src/SmsDatabaseException.cc",
        "src/SmsTransaction.cc",
        "src/SmsColumn.cc",
        "src/SmsStatement.cc",
        "src/SmsDatabase.cc",
        "src/manager/sms_base_database.cc",
        "src/manager/sms_master_database.cc",
        "src/manager/sms_school_database.cc",
        "src/model/sms_school_info.cc",
        "src/model/class/sms_class_item.cc",
        "src/model/class/sms_student_info.cc",
        "src/main.cc",
      ],
      "include_dirs": [
        "src_h",
        "include",
        "lib/boost-1_66/include"
      ],
      "defines": [
        "_UNICODE",
        "UNICODE"
      ],
      "libraries": [
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": [
            "/source-charset:utf-8",
            "/EHsc"
          ],
        }
      },
      'link_settings': {
        'library_dirs': [
          "lib/boost-1_66/lib",
        ]
      }
    }
  ]
}
