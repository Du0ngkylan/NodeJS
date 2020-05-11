//#define _CRTDBG_MAP_ALLOC  
//#include <stdlib.h>  
//#include <crtdbg.h>  

#include "command/accessor_command_factory.h"

#define DIV 1048576

//using namespace std;
using namespace accessor;

inline void GetMemInfo() {
	MEMORYSTATUSEX msex = { sizeof(MEMORYSTATUSEX) };
	if (GlobalMemoryStatusEx(&msex)) {
		// used
		DWORDLONG ullUsed = (msex.ullTotalPhys - msex.ullAvailPhys) / DIV;
		// free
		DWORDLONG ullFree = (msex.ullAvailPhys) / DIV;
		// total
		DWORDLONG ullSize = (msex.ullTotalPhys) / DIV;

		std::cout << "--MEMINFO-------------------------------------" << std::endl;
		std::cout << "Used=" + std::to_string(ullUsed) + " MB" << std::endl;
		std::cout << "Free=" + std::to_string(ullFree) + " MB" << std::endl;
		std::cout << "Total=" + std::to_string(ullSize) + " MB" << std::endl;
		std::cout << "----------------------------------------------" << std::endl;
	}
}

// command factory
static AccessorCommandFactory factory;

static json11::Json ExecuteCommand(json11::Json &req, std::string &raw) {
	std::string command_name = "";
	if (req["command"].is_string()) {
		command_name = req["command"].string_value();
	}

	auto command = factory.GetCommand(command_name);
	json11::Json res;

	try {
		//std::cout << "execute " + command_name << std::endl;
		res = command->ExecuteCommand(req, raw);
	} catch (std::exception &ex) {
		std::cout << "Error: " << std::endl;
	}
	//std::cout << "exit " + command_name << std::endl;

	return res;
}

static void Initialize(const wchar_t* data_folder_path, const wchar_t* accessor_workdir_path) {
   //std::cout << "Initialize accessor." << std::endl;
   //factory.SetDataFolder(data_folder_path);
   //factory.SetWorkFolder(accessor_workdir_path);
   factory.CreateCommands();
}

static bool MainLoop() {
	//std::cout << "Start main loop" << std::endl;

   std::string line;
   while (std::getline(std::cin, line) ) {
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


 static void Terminate() {
   factory.DeleteCommands();
   //std::cout << "Terminate accessor" << std::endl;
}

int main(int argc, char** argv) {
	//std::cout << "Hello World" << std::endl;

	wchar_t* data_folder = nullptr;
	wchar_t* work_folder = nullptr;

	Initialize(data_folder, work_folder);

	MainLoop();

	Terminate();

	exit(EXIT_SUCCESS);
}