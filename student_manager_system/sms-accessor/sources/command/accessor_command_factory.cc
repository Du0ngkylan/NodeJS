/**
 * @file accessor_command_factory.cc
 * @brief command factory implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <direct.h>
#include <stdlib.h>
#include <boost/filesystem.hpp>
#include "command/accessor_command_factory.h"
#include "command/school/copy_school.h"
#include "command/school/delete_school.h"
#include "command/school/get_school_detail.h"
#include "command/school/get_schools.h"
#include "command/school/update_school.h"
#include "command/school/update_school_order.h"
#include "command/school/sync_school.h"
#include "command/school/import_school.h"
#include "command/stub/stub_command.h"
#include "image/convert_jpg.h"
#include "image/create_thumbnail.h"
#include "image/get_image_info.h"
#include "image/resize_image.h"


namespace sms_accessor {

const std::wstring kSmsDirectory = L"\\SMS\\data";

/**
 * @fn
 * SmsAccessorCommandFactory
 * @brief constructor
 */
SmsAccessorCommandFactory::SmsAccessorCommandFactory() {}

/**
 * @fn
 * ~SmsAccessorCommandFactory
 * @brief destructor
 */
SmsAccessorCommandFactory::~SmsAccessorCommandFactory() {}

/**
 * @fn
 * DeleteCommands
 * @brief delete commands
 */
void SmsAccessorCommandFactory::DeleteCommands() {
  for (auto itr = this->commands.begin(); itr != this->commands.end(); ++itr) {
    delete itr->second;
  }
  this->commands.clear();
}

/**
 * @fn
 * GetCommand
 * @brief get command
 * @param(command) command string
 */
SmsAccessorCommand *SmsAccessorCommandFactory::GetCommand(
    std::string command) {
  // implemented command?
  auto itr = this->commands.find(command);
  if (itr != this->commands.end()) {
    return itr->second;
  } else {
    return this->commands["stub"];
  }
}

/**
 * @fn
 * SetDataFolder
 * @param(data_folder_path)data folder path
 * @brief set data folder path
 */
void SmsAccessorCommandFactory::SetDataFolder(
    const wchar_t *data_folder_path) {
  // set root path
  if (data_folder_path == nullptr) {
    std::wstring app_data(_wgetenv(L"APPDATA"));
    std::wstring app_Sms_dir =
        app_data + sms_accessor::kSmsDirectory;
    _wputenv_s(sms_accessor::kEnvAppDirName.c_str(),
               app_Sms_dir.c_str());
  } else {
    _wputenv_s(sms_accessor::kEnvAppDirName.c_str(),
               data_folder_path);
  }
  SmsInfoLog(
      L"Set application folder to " +
      std::wstring(_wgetenv(sms_accessor::kEnvAppDirName.c_str())));
}

/**
 * @fn
 * SetWorkFolder
 * @param(accessor_work_path)data folder path
 * @brief set data folder path
 */
void SmsAccessorCommandFactory::SetWorkFolder(
    const wchar_t *accessor_work_path) {
  // set root path
  if (accessor_work_path == nullptr) {
    std::wstring current(boost::filesystem::current_path().wstring());
    _wputenv_s(sms_accessor::kEnvWorkDirName.c_str(),
               current.c_str());
  } else {
    _wputenv_s(sms_accessor::kEnvWorkDirName.c_str(),
               accessor_work_path);
  }
  SmsInfoLog(
      L"Set work direcotry to " +
      std::wstring(_wgetenv(sms_accessor::kEnvWorkDirName.c_str())));
}

/**
 * @fn
 * CreateCommands
 * @brief create commands
 */
void SmsAccessorCommandFactory::CreateCommands() {
  // create command
  this->commands["exit"] = new SmsStubCommand();

  // commands school
  this->commands["get-schools"] = new SmsGetschools();
  this->commands["get-school-detail"] = new SmsGetschoolDetail();
  this->commands["copy-school"] = new SmsCopyschool();
  this->commands["update-school-order"] = new SmsUpdateschoolOrder();
  this->commands["update-school"] = new SmsUpdateschool();
  this->commands["delete-school"] = new SmsDeleteschool();
  this->commands["sync-school"] = new SmsSyncschool();
  this->commands["import-school"] = new SmsImportschool();

  // commands image
  this->commands["get-image-info"] = new SmsGetImageInfo();
  this->commands["create-thumbnail"] = new SmsCreateThumbnail();
  this->commands["get-image-info"] = new SmsGetImageInfo();
  this->commands["convert-jpg"] = new SmsConvertJpg();
  this->commands["resize-image"] = new SmsResizeImage();
}

}  // namespace sms_accessor
