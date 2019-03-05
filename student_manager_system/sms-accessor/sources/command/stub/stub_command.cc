/**
 * @file stub_command.cc
 * @brief stub command implementation
 * @author yonaha
 * @date 2018/02/15
 */

#include <thread>
#include <chrono>
#include "command/stub/stub_command.h"

namespace goyo_bookrack_accessor {

  /**
  * @fn
  * GoyoStubCommand
  * @brief constructor
  */
  GoyoStubCommand::GoyoStubCommand() {}

  /**
  * @fn
  * ~GoyoStubCommand
  * @brief destructor
  */
  GoyoStubCommand::~GoyoStubCommand() {}

  /**
  * @fn
  * ExecuteCommand
  * @brief execute command
  * @param (request) request json 
  * @param (raw) raw string
  */
  json11::Json GoyoStubCommand::ExecuteCommand(json11::Json &request, std::string &raw) {
    // it accept formatted json data in one line which is formatted like below.
    //   { "command": "........", "args": "......." }
    // args is any json data.
    json11::Json response;
    json11::Json error;

    if ( request["command"] == "echo" ) {
      // simple callback command.

      response = json11::Json::object {
        { "ECHO", raw },
      };

    } else if ( request["command"] == "exit" ) {

      // The program will exit if it returns null'json11::Json()'.
      return json11::Json();

    } else if ( request["command"] == "get-bookracks" ) {

      response = json11::Json::array({
          json11::Json::object {{"bookrackId", "data"},  {"name", "御用達サンプル工事１"}},
          json11::Json::object {{"bookrackId", "data1"}, {"name", "御用達サンプル工事２"}},
          json11::Json::object {{"bookrackId", "data2"}, {"name", "御用達サンプル工事３"}},
          json11::Json::object {{"bookrackId", "data3"}, {"name", "テスト工事"}},
          });

    } else if ( request["command"] == "get-albums" ) {
      if ( request["args"]["bookrackId"] == "data" ) {
        response = json11::Json::array({
            json11::Json::object {{"albumId", "0"}, {"name", "御用達サンプル工事１"}},
            json11::Json::object {{"albumId", "1"}, {"name", "道路付属施設工サンプル"}},
            json11::Json::object {{"albumId", "2"}, {"name", "標識工サンプル"}},
            json11::Json::object {{"albumId", "3"}, {"name", "付帯道路工サンプル"}},
            json11::Json::object {{"albumId", "4"}, {"name", "防護柵工サンプル"}},
            });
      } else {
        error = json11::Json::object { {"type", kErrorInvalidCommandStr }, {"message", " BookrackId is not specified"}, };
      }

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
      while (i < 40) {
        std::cout << "{ \"progress\": { \"done\": " << i << ", \"total\": 50, \"working\": \"third task\" }}" << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        i++;
      }
      while (i <= 50) {
        std::cout << "{ \"progress\": { \"done\": " << i << ", \"total\": 50, \"working\": \"forth task\" }}" << std::endl;
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
