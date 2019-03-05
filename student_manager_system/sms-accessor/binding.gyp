{
  "targets": [
    {
      "type": "executable",
      "target_name": "accessor",
      "include_dirs": [
        "lib/json11",
        '<!(node -e "console.log(require(`boost-1_66`).includePath)")',
        '<!(node -e "console.log(require(`opencv2`).includePath)")',
        "include",
        '<!(node -e "console.log(require(`sms-db-manager`).sourceHeaderPath)")',
        '<!(node -e "console.log(require(`sms-db-manager`).includePath)")'
      ],
      "sources": [
        "lib/json11/json11.cpp",
        "sources/accessor_main.cc",
        "sources/command/accessor_command_factory.cc",
        "sources/command/accessor_command.cc",
        "sources/command/school/add_schools.cc",
        "sources/command/school/delete_school.cc",
        "sources/command/school/get_school_detail.cc",
        "sources/command/school/update_school.cc",
        # "sources/command/school/sync_school.cc",
        # "sources/command/school/import_school.cc",
        "sources/command/stub/stub_command.cc",
        "sources/except/sms_exception.cc",
        "sources/image/convert_jpg.cc",
        "sources/image/create_thumbnail.cc",
        "sources/image/get_image_info.cc",
        "sources/image/sms_image.cc",
        "sources/image/resize_image.cc",
        "sources/util/sms_app_util.cc",
        "sources/util/sms_log.cc",
        "sources/lock/sms_lock_manager.cc",
      ],
      "libraries": [
        # sms lib
        "sms-db-manager.lib",
        # opencv lib
        "IlmImf.lib",
        "libjasper.lib",
        "libjpeg.lib",
        "libpng.lib",
        "libtiff.lib",
        "opencv_core2413.lib",
        "opencv_features2d2413.lib",
        "opencv_flann2413.lib",
        "opencv_gpu2413.lib",
        "opencv_highgui2413.lib",
        "opencv_imgproc2413.lib",
        "opencv_legacy2413.lib",
        "opencv_ml2413.lib",
        "opencv_nonfree2413.lib",
        "opencv_objdetect2413.lib",
        "opencv_ocl2413.lib",
        "opencv_photo2413.lib",
        "opencv_stitching2413.lib",
        "opencv_superres2413.lib",
        "opencv_ts2413.lib",
        "opencv_video2413.lib",
        "opencv_videostab2413.lib",
        "zlib.lib"
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
          '<!(node -e "console.log(require(`boost-1_66`).libraryPath)")',
          '<!(node -e "console.log(require(`opencv2`).libraryPath)")',
          '<!(node -e "console.log(require(`sms-db-manager`).libraryPath)")'
        ]
      }
    }
  ]
}
