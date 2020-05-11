/**
 * @file stub_command.cc
 * @brief stub command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <thread>
#include <chrono>
#include "command/stub/stub_command.h"

namespace accessor {

  /**
  * @fn
  * StubCommand
  * @brief constructor
  */
  StubCommand::StubCommand() {}

  /**
  * @fn
  * ~StubCommand
  * @brief destructor
  */
  StubCommand::~StubCommand() {}

  /**
  * @fn
  * ExecuteCommand
  * @brief execute command
  * @param (request) request json 
  * @param (raw) raw string
  */
  json11::Json StubCommand::ExecuteCommand(json11::Json &request, std::string &raw) {
    // it accept formatted json data in one line which is formatted like below.
    //   { "command": "........", "args": "......." }
    // args is any json data.
    json11::Json response;
    json11::Json error;

    if ( request["command"] == "echo" ) {
      // simple callback command.
      response = json11::Json::object {{ "ECHO", raw }};

    } else if ( request["command"] == "exit" ) {
      // The program will exit if it returns null'json11::Json()'.
      return json11::Json();

    } else if ( request["command"] == "test-progress" ) {

      int i=0;
      std::this_thread::sleep_for(std::chrono::milliseconds(100));

      while (i < 10) {
        std::cout << "{ \"progress\": { \"done\": " << i << ", \"total\": 50, \"working\": \"first task\" }}" << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        i++;
      }
      while (i < 20) {
        std::cout << "{ \"progress\": { \"done\": " << i << ", \"total\": 50, \"working\": \"second task\" }}" << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        i++;
      }
      response = json11::Json::object { { "status", 1 }, };

    } else {
      error = json11::Json::object { {"type", kErrorInvalidCommandStr }, {"message", "Unknown command requested."}, };
    }

    return (error.is_null())
      ? json11::Json::object { {"request", request }, {"response", response} }
      : json11::Json::object { {"request", request }, {"error", error} };
  }

}
