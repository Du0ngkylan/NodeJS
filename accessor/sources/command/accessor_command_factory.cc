/**
 * @file accessor_command_factory.cc
 * @brief command factory implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <direct.h>
#include <stdlib.h>
#include "command/accessor_command_factory.h"
#include "command/stub/stub_command.h"
#include "command/school/get_schools.h"

namespace accessor {

const std::wstring kSmsDirectory = L"\\SMS\\data";

/**
 * @fn
 * AccessorCommandFactory
 * @brief constructor
 */
AccessorCommandFactory::AccessorCommandFactory() {}

/**
 * @fn
 * ~AccessorCommandFactory
 * @brief destructor
 */
AccessorCommandFactory::~AccessorCommandFactory() {}

/**
 * @fn
 * DeleteCommands
 * @brief delete commands
 */
void AccessorCommandFactory::DeleteCommands() {
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
AccessorCommand *AccessorCommandFactory::GetCommand(std::string command) {
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
void AccessorCommandFactory::SetDataFolder(const wchar_t *data_folder_path) {
  // set root path
   if (data_folder_path == nullptr) {
     std::wstring app_data(_wgetenv(L"APPDATA"));
     std::wstring app_dir = app_data + accessor::kSmsDirectory;
     _wputenv_s(accessor::kEnvAppDirName.c_str(), app_dir.c_str());
   } else {
     _wputenv_s(accessor::kEnvAppDirName.c_str(), data_folder_path);
   }
   std::wcout << L"Set application folder to " + std::wstring(_wgetenv(accessor::kEnvAppDirName.c_str())) << std::endl;
}

/**
 * @fn
 * SetWorkFolder
 * @param(accessor_work_path)data folder path
 * @brief set data folder path
 */
void AccessorCommandFactory::SetWorkFolder(const wchar_t *accessor_work_path) {
  // set root path
   if (accessor_work_path == nullptr) {
	   std::wstring current = L"";
      _wputenv_s(accessor::kEnvWorkDirName.c_str(), current.c_str());
   } else {
     _wputenv_s(accessor::kEnvWorkDirName.c_str(), accessor_work_path);
   }
   std::wcout << L"Set work direcotry to " + std::wstring(_wgetenv(accessor::kEnvWorkDirName.c_str())) << std::endl;
}

/**
 * @fn
 * CreateCommands
 * @brief create commands
 */
void AccessorCommandFactory::CreateCommands() {
  // create command
  this->commands["exit"] = new StubCommand();

  // commands school
  this->commands["get-schools"] = new GetSchools();
}

}  // namespace accessor
