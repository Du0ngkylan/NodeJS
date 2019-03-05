//#define _CRTDBG_MAP_ALLOC  
//#include <stdlib.h>  
//#include <crtdbg.h>  

#include "command/accessor_command_factory.h"
#include "util/goyo_log.h"
#include "command/album/album_accessor.h"
#include "goyo_db_if.h"
#include <boost/format.hpp>


#define DIV 1048576

using namespace std; 
using namespace goyo_bookrack_accessor;
using namespace goyo_db_manager;

inline void GetMemInfo()
{
  MEMORYSTATUSEX msex = { sizeof(MEMORYSTATUSEX) };  
  if (GlobalMemoryStatusEx( &msex )) {
    // used
    DWORDLONG ullUsed = (msex.ullTotalPhys - msex.ullAvailPhys) / DIV;
    // free
    DWORDLONG ullFree = (msex.ullAvailPhys) / DIV;
    // total
    DWORDLONG ullSize = (msex.ullTotalPhys) / DIV;

    GoyoTraceLog("--MEMINFO-------------------------------------");
    GoyoTraceLog("Used=" + to_string(ullUsed) + " MB");
    GoyoTraceLog("Free=" + to_string(ullFree) + " MB");
    GoyoTraceLog("Total=" + to_string(ullSize) + " MB");
    GoyoTraceLog("----------------------------------------------");
  }

}

// command factory
static GoyoAccessorCommandFactory factory;

static json11::Json ExecuteCommand(json11::Json &req, std::string &raw) {
  string command_name = "";
  if (req["command"].is_string()) {
    command_name = req["command"].string_value();
  }
  auto command = factory.GetCommand(command_name);
  json11::Json res;
  try {
    GoyoTraceLog("execute " + command_name);
    if (GoyoLogUtil::GetLogLevel() == 5) {
      GoyoTraceLog("before memory info " + command_name);
      GetMemInfo();
    }
    res = command->ExecuteCommand(req, raw);
  } catch (GoyoException &ex) {
    res = command->CreateErrorResponse(req, kErrorInternalStr, ex.What());
  } catch (goyo_db_manager::GoyoDatabaseException &ex) {
    res = command->CreateErrorResponse(req, kErrorInternalStr, ex.What());
  } catch (std::exception) {
    res = command->CreateErrorResponse(req, kErrorInternalStr, "unknown");
  }
  GoyoTraceLog("exit " + command_name);
  if (GoyoLogUtil::GetLogLevel() == 5) {
    GoyoTraceLog("after memory info " + command_name);
    GetMemInfo();
  }
  return res;
}

static void Initialize(const wchar_t* data_folder_path,
                       const wchar_t* accessor_workdir_path) {
  GoyoLogUtil::InitializeLogSystem(data_folder_path);

  GoyoInfoLog(L"Initialize bookrack accessor.");

  GoyoDatabase::InitializeDBPool();

  factory.SetDataFolder(data_folder_path);
  factory.SetWorkFolder(accessor_workdir_path);
  factory.CreateCommands();
}

static void Terminate() {

  GoyoDatabase::ClearDBPool();

  factory.DeleteCommands();

  GoyoInfoLog(L"Terminate bookrack accessor.");
}

static bool MainLoop(void) {
  GoyoInfoLog(L"Start main loop.");

  std::string line;
  while( std::getline(std::cin, line) ) {
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
  GoyoLogUtil::SetLogLevel(log_level);

  Initialize(data_folder, work_folder);

  MainLoop();

  Terminate();

	//_CrtDumpMemoryLeaks();

  exit(EXIT_SUCCESS);
}
