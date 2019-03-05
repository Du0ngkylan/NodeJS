//#define _CRTDBG_MAP_ALLOC  
//#include <stdlib.h>  
//#include <crtdbg.h>  

#include "command/accessor_command_factory.h"
#include "util/sms_log.h"
#include "sms_db_if.h"
#include <boost/format.hpp>


#define DIV 1048576

using namespace std; 
using namespace sms_accessor;
using namespace sms_db_manager;

inline void GetMemInfo() {
  MEMORYSTATUSEX msex = { sizeof(MEMORYSTATUSEX) };
  if (GlobalMemoryStatusEx(&msex)) {
    // used
    DWORDLONG ullUsed = (msex.ullTotalPhys - msex.ullAvailPhys) / DIV;
    // free
    DWORDLONG ullFree = (msex.ullAvailPhys) / DIV;
    // total
    DWORDLONG ullSize = (msex.ullTotalPhys) / DIV;

    SmsTraceLog("--MEMINFO-------------------------------------");
    SmsTraceLog("Used=" + to_string(ullUsed) + " MB");
    SmsTraceLog("Free=" + to_string(ullFree) + " MB");
    SmsTraceLog("Total=" + to_string(ullSize) + " MB");
    SmsTraceLog("----------------------------------------------");
  }
}

// command factory
static SmsAccessorCommandFactory factory;

static json11::Json ExecuteCommand(json11::Json &req, std::string &raw) {
  string command_name = "";
  if (req["command"].is_string()) {
    command_name = req["command"].string_value();
  }
  auto command = factory.GetCommand(command_name);
  json11::Json res;
  try {
    SmsTraceLog("execute " + command_name);
    if (SmsLogUtil::GetLogLevel() == 5) {
      SmsTraceLog("before memory info " + command_name);
      GetMemInfo();
    }
    res = command->ExecuteCommand(req, raw);
  } catch (SmsException &ex) {
    res = command->CreateErrorResponse(req, kErrorInternalStr, ex.What());
  } catch (Sms_db_manager::SmsDatabaseException &ex) {
    res = command->CreateErrorResponse(req, kErrorInternalStr, ex.What());
  } catch (std::exception) {
    res = command->CreateErrorResponse(req, kErrorInternalStr, "unknown");
  }
  SmsTraceLog("exit " + command_name);
  if (SmsLogUtil::GetLogLevel() == 5) {
    SmsTraceLog("after memory info " + command_name);
    GetMemInfo();
  }
  return res;
}

static void Initialize(const wchar_t* data_folder_path,
                       const wchar_t* accessor_workdir_path) {
  SmsLogUtil::InitializeLogSystem(data_folder_path);

  SmsInfoLog(L"Initialize sms accessor.");

  SmsDatabase::InitializeDBPool();

  factory.SetDataFolder(data_folder_path);
  factory.SetWorkFolder(accessor_workdir_path);
  factory.CreateCommands();
}

static void Terminate() {
  SmsDatabase::ClearDBPool();
  factory.DeleteCommands();
  SmsInfoLog(L"Terminate sms accessor.");
}

static bool MainLoop(void) {
  SmsInfoLog(L"Start main loop.");

  std::string line;
  while ( std::getline(std::cin, line) ) {
    std::string err;
    auto json = json11::Json::parse(line, err);

    // ignore invalid input.
    if (!err.empty()) {
      std::cerr << "invalid json data: " << err << std::endl;
      continue;
    }

    auto result = ExecuteCommand(json, line);
    if (result.is_null()) {
      break;
    }

    std::cout << result.dump() << std::endl;
  }

  return true;
}

int wmain(int argc, wchar_t** argv) {
  wchar_t* data_folder = nullptr;
  wchar_t* work_folder = nullptr;
  wchar_t* log_level = nullptr;

  if (argc == 2) {
    data_folder = argv[1];
  } else if (argc >= 3) {
    data_folder = argv[1];
    work_folder = argv[2];
  }

  // set log level
  if (argc == 4) {
    log_level = argv[3];
  }
  SmsLogUtil::SetLogLevel(log_level);

  Initialize(data_folder, work_folder);

  MainLoop();

  Terminate();

  // _CrtDumpMemoryLeaks();

  exit(EXIT_SUCCESS);
}
